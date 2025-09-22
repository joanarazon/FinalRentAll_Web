import { useEffect, useState } from "react";
import TopMenu from "@/components/topMenu";
import { useUser } from "@/hooks/useUser";
import { supabase } from "../../supabaseClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Loading from "@/components/Loading";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";

export default function MyRatings() {
    const user = useUser();
    const [loading, setLoading] = useState(true);
    const [completed, setCompleted] = useState([]);
    const [existing, setExisting] = useState({}); // rental_id -> true if user already reviewed
    const [search, setSearch] = useState("");

    useEffect(() => {
        if (!user?.id) return;
        (async () => {
            try {
                setLoading(true);
                const [
                    { data: rentals, error: e1 },
                    { data: reviews, error: e2 },
                ] = await Promise.all([
                    supabase
                        .from("rental_transactions")
                        .select(
                            `item_id,rental_id,
                             items (
                               title,
                               user_id,
                               main_image_url,
                               owner:users ( first_name, last_name )
                             )`
                        )
                        .eq("renter_id", user.id)
                        .eq("status", "completed"),
                    supabase
                        .from("reviews")
                        .select("rental_id, reviewer_id")
                        .eq("reviewer_id", user.id),
                ]);
                if (e1) throw e1;
                if (e2) throw e2;
                setCompleted(rentals || []);
                const map = {};
                (reviews || []).forEach((r) => {
                    map[r.rental_id] = true;
                });
                setExisting(map);
            } finally {
                setLoading(false);
            }
        })();
    }, [user?.id]);

    if (!user) return null;

    const filtered = completed.filter((r) =>
        (r.items?.title || "").toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-[#FFFBF2]">
            <TopMenu
                activePage="my-ratings"
                searchTerm={search}
                setSearchTerm={setSearch}
            />
            <div className="max-w-4xl mx-auto p-4 space-y-6">
                <h2 className="text-2xl font-semibold">My Ratings</h2>
                {loading ? (
                    <Loading />
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {filtered.length === 0 ? (
                            <p className="text-sm text-gray-600">
                                No completed rentals yet.
                            </p>
                        ) : (
                            filtered.map((r) => (
                                <Card key={`${r.rental_id}-${r.item_id}`}>
                                    <CardHeader>
                                        <CardTitle className="text-base flex items-center gap-3">
                                            <ImagePreviewThumb
                                                src={r.items?.main_image_url}
                                                alt={r.items?.title}
                                            />
                                            <span>
                                                {r.items?.title || "Item"}
                                            </span>
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-sm text-gray-700 mb-3">
                                            Owner:{" "}
                                            {r.items?.owner?.first_name || ""}{" "}
                                            {r.items?.owner?.last_name || ""}
                                        </div>
                                        {existing[r.rental_id] ? (
                                            <p className="text-sm text-green-700">
                                                You already reviewed this item.
                                            </p>
                                        ) : (
                                            <RatingForm
                                                itemId={r.item_id}
                                                rentalId={r.rental_id}
                                                revieweeId={r.items?.user_id}
                                                userId={user.id}
                                            />
                                        )}
                                    </CardContent>
                                </Card>
                            ))
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

function ImagePreviewThumb({ src, alt }) {
    const imgSrc = src || "/vite.svg";
    return (
        <Dialog>
            <DialogTrigger asChild>
                <img
                    src={imgSrc}
                    alt={alt || "Item"}
                    className="w-12 h-12 object-cover rounded-md border cursor-pointer"
                    onError={(e) => (e.currentTarget.style.display = "none")}
                />
            </DialogTrigger>
            <DialogContent className="max-w-2xl p-0">
                <img
                    src={imgSrc}
                    alt={alt || "Item"}
                    className="w-full h-auto rounded-md"
                />
            </DialogContent>
        </Dialog>
    );
}

function RatingForm({ itemId, rentalId, revieweeId, userId }) {
    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!rating) return;
        try {
            setSubmitting(true);
            const { error } = await supabase.from("reviews").insert({
                item_id: itemId,
                rental_id: rentalId,
                reviewer_id: userId,
                reviewee_id: revieweeId,
                rating,
                comment,
            });
            if (error) throw error;
            setSubmitted(true);
        } finally {
            setSubmitting(false);
        }
    };

    if (submitted)
        return (
            <p className="text-sm text-green-700">
                Thanks! Your review was submitted.
            </p>
        );

    return (
        <form onSubmit={handleSubmit} className="space-y-2">
            <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((n) => (
                    <button
                        type="button"
                        key={n}
                        onClick={() => setRating(n)}
                        className={
                            `w-8 h-8 rounded-full border flex items-center justify-center ` +
                            (n <= rating
                                ? "bg-yellow-400 border-yellow-500"
                                : "bg-white border-gray-300")
                        }
                    >
                        {n}
                    </button>
                ))}
            </div>
            <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Optional comment"
                className="w-full border rounded p-2 text-sm"
                rows={3}
            />
            <Button type="submit" disabled={submitting || !rating}>
                {submitting ? "Submitting..." : "Submit Review"}
            </Button>
        </form>
    );
}
