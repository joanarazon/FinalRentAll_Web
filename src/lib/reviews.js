import { supabase } from "../../supabaseClient";

/**
 * Check if a renter (reviewer) can rate the lessor for a given rental.
 * Conditions:
 * - rental exists
 * - rental.status === 'completed'
 * - rental.renter_id === reviewerId
 * Returns { canRate, reason, lessorId, rental }
 */
export async function canRateLessor(rentalId, reviewerId) {
    if (!rentalId || !reviewerId) {
        return { canRate: false, reason: "Missing rentalId or reviewerId" };
    }

    const { data: rental, error } = await supabase
        .from("rental_transactions")
        .select(
            `rental_id, renter_id, status, item_id,
       items!inner(user_id)`
        )
        .eq("rental_id", rentalId)
        .single();

    if (error) {
        return { canRate: false, reason: error.message };
    }
    if (!rental) {
        return { canRate: false, reason: "Rental not found" };
    }
    if (rental.status !== "completed") {
        return { canRate: false, reason: "Rental is not completed yet" };
    }
    if (rental.renter_id !== reviewerId) {
        return {
            canRate: false,
            reason: "Only the renter can rate the lessor",
        };
    }

    const lessorId = rental.items?.user_id;
    if (!lessorId) {
        return {
            canRate: false,
            reason: "Unable to determine lessor for item",
        };
    }
    return { canRate: true, lessorId, rental };
}

/**
 * Get an existing lessor review for (rentalId, reviewerId)
 */
export async function getExistingLessorReview(rentalId, reviewerId) {
    const { data, error } = await supabase
        .from("lessor_reviews")
        .select(
            "review_id, rental_id, lessor_id, reviewer_id, rating, comment, created_at"
        )
        .eq("rental_id", rentalId)
        .eq("reviewer_id", reviewerId)
        .limit(1)
        .maybeSingle();
    if (error) throw error;
    return data || null;
}

/**
 * Create a lessor review after a successful (completed) booking.
 * Validates the rental and reviewer, prevents duplicate per rental.
 *
 * @param {Object} params
 * @param {string} params.rentalId - Rental transaction ID (uuid)
 * @param {string} params.reviewerId - The renter's user id (uuid)
 * @param {number} params.rating - 1..5
 * @param {string} [params.comment] - Optional comment
 * @returns {Promise<{review: any, alreadyReviewed: boolean}>}
 */
export async function rateLessor({ rentalId, reviewerId, rating, comment }) {
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
        throw new Error("Rating must be an integer between 1 and 5");
    }

    // Business rule checks
    const { canRate, reason, lessorId } = await canRateLessor(
        rentalId,
        reviewerId
    );
    if (!canRate) throw new Error(reason || "Not allowed to rate this lessor");

    // Prevent duplicate reviews by the same reviewer for the same rental
    const existing = await getExistingLessorReview(rentalId, reviewerId);
    if (existing) {
        return { review: existing, alreadyReviewed: true };
    }

    // Insert the review
    const { data, error } = await supabase
        .from("lessor_reviews")
        .insert({
            rental_id: rentalId,
            lessor_id: lessorId,
            reviewer_id: reviewerId,
            rating,
            comment: comment || null,
        })
        .select("*")
        .single();

    if (error) throw error;
    return { review: data, alreadyReviewed: false };
}

/**
 * Optional utility: list lessor reviews authored by a user.
 */
export async function listMyLessorReviews(reviewerId) {
    const { data, error } = await supabase
        .from("lessor_reviews")
        .select(
            `review_id, rating, comment, created_at,
       rental_id, lessor_id`
        )
        .eq("reviewer_id", reviewerId)
        .order("created_at", { ascending: false });
    if (error) throw error;
    return data || [];
}

/**
 * Upsert (create or update) a lessor review for a rental by the renter.
 * If a review exists for (rentalId, reviewerId), it will be updated; otherwise inserted.
 * Returns { review, updated } where updated=true indicates an update.
 */
export async function saveLessorReview({
    rentalId,
    reviewerId,
    rating,
    comment,
}) {
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
        throw new Error("Rating must be an integer between 1 and 5");
    }

    const { canRate, reason, lessorId } = await canRateLessor(
        rentalId,
        reviewerId
    );
    if (!canRate) throw new Error(reason || "Not allowed to rate this lessor");

    const existing = await getExistingLessorReview(rentalId, reviewerId);
    if (existing) {
        const { data, error } = await supabase
            .from("lessor_reviews")
            .update({ rating, comment: comment || null })
            .eq("review_id", existing.review_id)
            .select("*")
            .single();
        if (error) throw error;
        return { review: data, updated: true };
    }

    const { data, error } = await supabase
        .from("lessor_reviews")
        .insert({
            rental_id: rentalId,
            lessor_id: lessorId,
            reviewer_id: reviewerId,
            rating,
            comment: comment || null,
        })
        .select("*")
        .single();
    if (error) throw error;
    return { review: data, updated: false };
}

/**
 * Get aggregate rating stats for a lessor user id.
 * Returns { average: number, count: number }
 */
export async function getLessorRatingStats(lessorId) {
    if (!lessorId) return { average: 0, count: 0 };
    // This function reports lessor (owner) ratings strictly from lessor_reviews per schema.
    // Avoid aggregates to prevent 400 errors; compute client-side average with pagination.

    const { count, error: countErr } = await supabase
        .from("lessor_reviews")
        .select("review_id", { count: "exact", head: true })
        .eq("lessor_id", lessorId);
    if (countErr) throw countErr;

    const total = Number(count || 0);
    if (total === 0) return { average: 0, count: 0 };

    const pageSize = 1000;
    let fetched = 0;
    let sum = 0;
    while (fetched < total) {
        const from = fetched;
        const to = Math.min(fetched + pageSize - 1, total - 1);
        const { data: rows, error } = await supabase
            .from("lessor_reviews")
            .select("rating")
            .eq("lessor_id", lessorId)
            .range(from, to);
        if (error) throw error;
        if (!rows || rows.length === 0) break;
        for (const r of rows) sum += Number(r.rating || 0);
        fetched += rows.length;
        if (rows.length < pageSize) break;
    }
    const average = sum / total;
    return { average: Number.isFinite(average) ? average : 0, count: total };
}
