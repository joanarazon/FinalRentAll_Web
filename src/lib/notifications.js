import { supabase } from "../../supabaseClient";

// Notification types for categorization
export const NOTIFICATION_TYPES = {
    BOOKING: "booking",
    DEPOSIT: "deposit",
    RENTAL: "rental",
    RETURN: "return",
    ITEM: "item",
    ADMIN: "admin",
    REMINDER: "reminder",
    GENERAL: "general",
};

// Notification templates for consistent messaging
export const NOTIFICATION_TEMPLATES = {
    // Renter-facing booking submission
    BOOKING_SUBMITTED_PENDING_APPROVAL: (itemTitle) => ({
        title: "Booking Submitted",
        message: `Your request to rent "${itemTitle}" has been sent. Wait for the owner's approval before uploading your deposit proof.`,
        type: NOTIFICATION_TYPES.BOOKING,
    }),
    // Booking process
    BOOKING_RECEIVED: (itemTitle, renterName) => ({
        title: "New Booking Request",
        message: `${renterName} wants to rent "${itemTitle}". Review and respond to their request.`,
        type: NOTIFICATION_TYPES.BOOKING,
    }),

    BOOKING_APPROVED: (itemTitle, ownerName) => ({
        title: "Booking Approved",
        message: `${ownerName} approved your booking for "${itemTitle}". Upload your proof of deposit to proceed.`,
        type: NOTIFICATION_TYPES.BOOKING,
    }),

    BOOKING_REJECTED: (itemTitle, ownerName) => ({
        title: "Booking Declined",
        message: `${ownerName} declined your booking request for "${itemTitle}".`,
        type: NOTIFICATION_TYPES.BOOKING,
    }),

    // Deposit process
    DEPOSIT_UPLOADED: (itemTitle, renterName) => ({
        title: "Deposit Proof Received",
        message: `${renterName} uploaded proof of deposit for "${itemTitle}". Please verify to proceed.`,
        type: NOTIFICATION_TYPES.DEPOSIT,
    }),

    DEPOSIT_VERIFIED: (itemTitle, ownerName) => ({
        title: "Deposit Verified",
        message: `${ownerName} verified your deposit for "${itemTitle}". Your rental is confirmed!`,
        type: NOTIFICATION_TYPES.DEPOSIT,
    }),

    // Rental flow
    ITEM_ON_THE_WAY: (itemTitle, ownerName) => ({
        title: "Item On The Way",
        message: `${ownerName} is bringing "${itemTitle}" to you. Get ready for pickup/delivery.`,
        type: NOTIFICATION_TYPES.RENTAL,
    }),

    RENTAL_STARTED: (itemTitle, renterName) => ({
        title: "Rental Booking Started",
        message: `${renterName} confirmed pickup of "${itemTitle}". Rental is now active.`,
        type: NOTIFICATION_TYPES.RENTAL,
    }),

    RENTAL_STARTED: (itemTitle, ownerName) => ({
        title: "Rental Started",
        message: `${ownerName} confirmed pickup of "${itemTitle}". Rental is now active.`,
        type: NOTIFICATION_TYPES.RENTAL,
    }),

    RETURN_INITIATED: (itemTitle, renterName) => ({
        title: "Return Process Started",
        message: `${renterName} initiated return for "${itemTitle}". Please confirm the return.`,
        type: NOTIFICATION_TYPES.RETURN,
    }),

    RETURN_CONFIRMED: (itemTitle, ownerName) => ({
        title: "Return Confirmed",
        message: `${ownerName} confirmed return of "${itemTitle}". Rental completed successfully!`,
        type: NOTIFICATION_TYPES.RETURN,
    }),

    // Item management
    ITEM_APPROVED: (itemTitle) => ({
        title: "🎉 Item Approved!",
        message: `Great news! Your item "${itemTitle}" has been approved by our admin team and is now live for rentals. You can start receiving booking requests!`,
        type: NOTIFICATION_TYPES.ITEM,
    }),

    ITEM_REJECTED: (itemTitle, reason = null) => ({
        title: "Item Needs Attention",
        message: `Your item "${itemTitle}" requires some modifications before approval${
            reason ? `: ${reason}` : ""
        }. Please update and resubmit for review.`,
        type: NOTIFICATION_TYPES.ITEM,
    }),

    // Enhanced admin review notifications
    ITEM_APPROVED_BY_ADMIN: (itemTitle, adminName = "Admin") => ({
        title: "✅ Item Approved",
        message: `${adminName} approved your item "${itemTitle}". It's now available for booking and will appear in search results.`,
        type: NOTIFICATION_TYPES.ITEM,
    }),

    ITEM_REJECTED_BY_ADMIN: (itemTitle, adminName = "Admin", reason = "") => ({
        title: "❌ Item Rejected",
        message: `${adminName} reviewed "${itemTitle}" and it needs modifications${
            reason ? `: ${reason}` : ""
        }. Please update your listing and resubmit.`,
        type: NOTIFICATION_TYPES.ITEM,
    }),

    ITEM_FLAGGED_FOR_REVIEW: (itemTitle, reportReason) => ({
        title: "Item Under Review",
        message: `Your item "${itemTitle}" has been flagged for review due to: ${reportReason}. Our team will investigate this matter.`,
        type: NOTIFICATION_TYPES.ITEM,
    }),

    // Item banned after admin confirmation of a report
    ITEM_BANNED_BY_ADMIN: (itemTitle, details = "") => ({
        title: "🚫 Item Banned",
        message: `Your item "${itemTitle}" has been banned by an admin after careful consideration of a report${
            details ? `: ${details}` : ""
        }.
        `,
        type: NOTIFICATION_TYPES.ITEM,
    }),

    // Comprehensive reminders and process notifications
    DEPOSIT_REMINDER: (itemTitle, hoursLeft) => ({
        title: "Upload Deposit Proof",
        message: `Don't forget to upload proof of deposit for "${itemTitle}". ${hoursLeft} hours remaining.`,
        type: NOTIFICATION_TYPES.REMINDER,
    }),

    RETURN_REMINDER: (itemTitle, daysOverdue) => ({
        title: "Return Overdue",
        message: `"${itemTitle}" return is ${daysOverdue} day(s) overdue. Please contact the owner.`,
        type: NOTIFICATION_TYPES.REMINDER,
    }),

    // Item creation and admin review process
    ITEM_SUBMITTED_FOR_REVIEW: (itemTitle) => ({
        title: "Item Submitted for Review",
        message: `Your item "${itemTitle}" has been submitted for admin review. You'll be notified once it's approved.`,
        type: NOTIFICATION_TYPES.ITEM,
    }),

    ITEM_UNDER_ADMIN_REVIEW: (itemTitle, daysPending) => ({
        title: "📋 Item Review Update",
        message: `Your item "${itemTitle}" has been under review for ${daysPending} day(s). We appreciate your patience - our admin team reviews items carefully to ensure quality. You'll be notified as soon as the review is complete.`,
        type: NOTIFICATION_TYPES.REMINDER,
    }),

    ADMIN_REVIEW_QUEUE_NOTIFICATION: (adminName, pendingCount) => ({
        title: "📝 Items Awaiting Review",
        message: `${adminName}, you have ${pendingCount} item(s) awaiting approval in the admin panel. Please review them when convenient.`,
        type: NOTIFICATION_TYPES.ADMIN,
    }),

    // Comprehensive booking process notifications
    BOOKING_AWAITING_DEPOSIT: (itemTitle, ownerName) => ({
        title: "Upload Deposit Proof Required",
        message: `${ownerName} approved your booking for "${itemTitle}". Please upload your deposit proof within 24 hours to secure your reservation.`,
        type: NOTIFICATION_TYPES.REMINDER,
    }),

    BOOKING_AWAITING_OWNER_CONFIRMATION: (itemTitle, renterName) => ({
        title: "Waiting for Owner Confirmation",
        message: `${renterName} has returned "${itemTitle}". Please confirm the return to complete the rental.`,
        type: NOTIFICATION_TYPES.RETURN,
    }),

    // Delivery and pickup notifications
    ITEM_READY_FOR_PICKUP: (itemTitle, ownerName) => ({
        title: "Item Ready for Pickup",
        message: `${ownerName} has prepared "${itemTitle}" for pickup. Coordinate with them for collection.`,
        type: NOTIFICATION_TYPES.RENTAL,
    }),

    ITEM_DELIVERED_CONFIRMATION: (itemTitle, renterName) => ({
        title: "Item Delivered Successfully",
        message: `"${itemTitle}" has been successfully delivered to ${renterName}. Rental is now active.`,
        type: NOTIFICATION_TYPES.RENTAL,
    }),

    // Return process notifications
    RETURN_CHECKOUT_INITIATED: (
        itemTitle,
        renterName,
        isAccommodation = false
    ) => ({
        title: isAccommodation ? "Guest Checked Out" : "Item Return Started",
        message: isAccommodation
            ? `${renterName} has checked out of "${itemTitle}". Please confirm to complete the stay.`
            : `${renterName} has initiated return of "${itemTitle}". Please confirm the return condition.`,
        type: NOTIFICATION_TYPES.RETURN,
    }),

    // Return resolution notifications (missing earlier)
    RETURN_ACCEPTED: (itemTitle, ownerName) => ({
        title: "Return Accepted",
        message: `${ownerName} accepted the return of "${itemTitle}". Rental completed successfully!`,
        type: NOTIFICATION_TYPES.RETURN,
    }),

    RETURN_DISPUTED: (itemTitle, ownerName, reason = "") => ({
        title: "Return Disputed",
        message: `${ownerName} disputed the return of "${itemTitle}"${
            reason ? `: ${reason}` : ""
        }. Please check details in your bookings.`,
        type: NOTIFICATION_TYPES.RETURN,
    }),

    RETURN_BOTH_PARTIES_NOTIFIED: (itemTitle, isAccommodation = false) => ({
        title: isAccommodation ? "Stay Completed" : "Rental Completed",
        message: isAccommodation
            ? `Your stay at "${itemTitle}" has been completed successfully. Thank you for choosing our service!`
            : `Your rental of "${itemTitle}" has been completed successfully. Thank you for using our service!`,
        type: NOTIFICATION_TYPES.RETURN,
    }),

    // Admin and moderation notifications
    ADMIN_REVIEW_REQUIRED: (type, itemTitle, reason, priority = "normal") => ({
        title:
            priority === "urgent"
                ? "🚨 Urgent Admin Review"
                : "📋 Admin Review Required",
        message: `${priority === "urgent" ? "URGENT: " : ""}${
            type.charAt(0).toUpperCase() + type.slice(1)
        } "${itemTitle}" requires admin attention: ${reason}`,
        type: NOTIFICATION_TYPES.ADMIN,
    }),

    ADMIN_NEW_ITEM_SUBMISSION: (itemTitle, ownerName, category) => ({
        title: "🆕 New Item Submitted",
        message: `${ownerName} submitted a new ${category} item "${itemTitle}" for approval. Review it in the admin panel.`,
        type: NOTIFICATION_TYPES.ADMIN,
    }),

    // Time-sensitive notifications
    BOOKING_EXPIRING_SOON: (itemTitle, hoursLeft) => ({
        title: "Booking Expires Soon",
        message: `Your booking for "${itemTitle}" expires in ${hoursLeft} hours. Complete the required steps to secure your rental.`,
        type: NOTIFICATION_TYPES.REMINDER,
    }),

    RENTAL_ENDING_SOON: (itemTitle, hoursLeft) => ({
        title: "Rental Ending Soon",
        message: `Your rental of "${itemTitle}" ends in ${hoursLeft} hours. Please prepare for return.`,
        type: NOTIFICATION_TYPES.REMINDER,
    }),
};

/**
 * Create a notification for a specific user
 */
export async function createNotification({
    userId,
    title,
    message,
    type = NOTIFICATION_TYPES.GENERAL,
    rentalId = null,
    itemId = null,
}) {
    try {
        // Validate required fields
        if (!userId) {
            throw new Error(
                `userId is required for notification. Got: ${userId}`
            );
        }
        if (!title) {
            throw new Error(
                `title is required for notification. Got: ${title}`
            );
        }
        if (!message) {
            throw new Error(
                `message is required for notification. Got: ${message}`
            );
        }

        const { data, error } = await supabase
            .from("notifications")
            .insert({
                user_id: userId,
                title,
                message,
                type,
                rental_id: rentalId,
                item_id: itemId,
            })
            .select()
            .single();

        if (error) throw error;
        return { success: true, data };
    } catch (error) {
        console.error("Failed to create notification:", error);
        console.error("Notification data:", {
            userId,
            title,
            message,
            type,
            rentalId,
            itemId,
        });
        return { success: false, error: error.message };
    }
}

/**
 * Get notifications for a specific user
 */
export async function getUserNotifications(
    userId,
    { limit = 50, unreadOnly = false } = {}
) {
    try {
        let query = supabase
            .from("notifications")
            .select(
                `
                *,
                rental:rental_transactions(rental_id, status, start_date, end_date),
                item:items(item_id, title)
            `
            )
            .eq("user_id", userId)
            .order("created_at", { ascending: false });

        if (unreadOnly) {
            query = query.is("read_at", null);
        }

        if (limit) {
            query = query.limit(limit);
        }

        const { data, error } = await query;
        if (error) throw error;

        return { success: true, data: data || [] };
    } catch (error) {
        console.error("Failed to get notifications:", error);
        return { success: false, error: error.message, data: [] };
    }
}

/**
 * Mark notification(s) as read
 */
export async function markNotificationsAsRead(notificationIds) {
    try {
        const ids = Array.isArray(notificationIds)
            ? notificationIds
            : [notificationIds];

        const { error } = await supabase
            .from("notifications")
            .update({ read_at: new Date().toISOString() })
            .in("notification_id", ids)
            .is("read_at", null); // Only update unread notifications

        if (error) throw error;
        return { success: true };
    } catch (error) {
        console.error("Failed to mark notifications as read:", error);
        return { success: false, error: error.message };
    }
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllNotificationsAsRead(userId) {
    try {
        const { error } = await supabase
            .from("notifications")
            .update({ read_at: new Date().toISOString() })
            .eq("user_id", userId)
            .is("read_at", null);

        if (error) throw error;
        return { success: true };
    } catch (error) {
        console.error("Failed to mark all notifications as read:", error);
        return { success: false, error: error.message };
    }
}

/**
 * Get unread notification count for a user
 */
export async function getUnreadNotificationCount(userId) {
    try {
        const { count, error } = await supabase
            .from("notifications")
            .select("*", { count: "exact", head: true })
            .eq("user_id", userId)
            .is("read_at", null);

        if (error) throw error;
        return { success: true, count: count || 0 };
    } catch (error) {
        console.error("Failed to get unread count:", error);
        return { success: false, count: 0 };
    }
}

/**
 * Delete old notifications (older than specified days)
 */
export async function deleteOldNotifications(userId, daysOld = 30) {
    try {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysOld);

        const { error } = await supabase
            .from("notifications")
            .delete()
            .eq("user_id", userId)
            .lt("created_at", cutoffDate.toISOString());

        if (error) throw error;
        return { success: true };
    } catch (error) {
        console.error("Failed to delete old notifications:", error);
        return { success: false, error: error.message };
    }
}

/**
 * Helper function to generate navigation path from notification
 *
 * ROUTING LOGIC BASED ON USER ROLE IN THE NOTIFICATION:
 *
 * OWNER NOTIFICATIONS (Actions requiring owner attention) → /booking-requests:
 * - "John wants to rent your Camera" (new booking request)
 * - "John uploaded proof of deposit for Camera. Please verify to proceed" (deposit to verify)
 * - "John initiated return for Camera. Please confirm the return" (return to confirm)
 *
 * RENTER NOTIFICATIONS (Updates about their bookings) → /my-bookings:
 * - "Owner approved your booking for Camera. Upload your proof of deposit to proceed" (booking approved)
 * - "Owner declined your booking request for Camera" (booking rejected)
 * - "Owner verified your deposit for Camera. Your rental is confirmed!" (deposit verified)
 * - "Owner confirmed return of Camera. Rental completed successfully!" (return confirmed)
 *
 * OTHER NOTIFICATIONS:
 * - Admin notifications → /adminhome
 * - Item-specific notifications → /item/{id}
 */
export function getNotificationNavigationPath(notification) {
    const { type, message } = notification;

    switch (type) {
        case NOTIFICATION_TYPES.BOOKING:
            // Owner notifications (incoming booking requests) → /booking-requests
            if (
                message &&
                (message.includes("wants to rent") ||
                    message.includes("Review and respond to their request"))
            ) {
                return "/booking-requests";
            }
            // Renter notifications (booking approved/rejected responses) → /my-bookings
            if (
                message &&
                (message.includes("approved your booking") ||
                    message.includes("declined your booking request") ||
                    message.includes("Upload your proof of deposit to proceed"))
            ) {
                return "/my-bookings";
            }
            // Default for booking notifications → /my-bookings (safer for renters)
            return "/my-bookings";

        case NOTIFICATION_TYPES.DEPOSIT:
        case NOTIFICATION_TYPES.RENTAL:
        case NOTIFICATION_TYPES.RETURN:
            // Owner notifications (renter actions needing owner attention) → /booking-requests
            if (
                message &&
                (message.includes("uploaded proof of deposit for") ||
                    message.includes("Please verify to proceed") ||
                    message.includes("initiated return for") ||
                    message.includes("Please confirm the return"))
            ) {
                return "/booking-requests";
            }

            // Owner notifications (rental activity requiring attention) → /booking-requests
            if (
                message &&
                (message.includes("confirmed pickup of") ||
                    message.includes("Rental is now active") ||
                    message.includes("has been completed successfully"))
            ) {
                return "/booking-requests";
            }

            // Renter notifications (owner responses/confirmations) → /my-bookings
            if (
                message &&
                (message.includes("verified your deposit for") ||
                    message.includes("Your rental is confirmed") ||
                    message.includes("confirmed return of") ||
                    message.includes("is bringing") ||
                    message.includes("Rental completed successfully"))
            ) {
                return "/my-bookings";
            }

            // Default for deposit/rental/return → /my-bookings (safer for renters)
            return "/my-bookings";

        case NOTIFICATION_TYPES.REMINDER:
            // Reminders usually for renters
            return "/my-bookings";

        case NOTIFICATION_TYPES.ITEM:
            // Item notifications (submission, approval, rejection) → user's profile page
            return "/profile";

        case NOTIFICATION_TYPES.ADMIN:
            return "/adminhome";

        default:
            return "/notifications";
    }
}

/**
 * Booking-specific notification helpers
 */
export const BookingNotifications = {
    // When renter creates a booking
    async notifyOwnerOfNewBooking(
        ownerId,
        rentalId,
        itemId,
        itemTitle,
        renterName
    ) {
        const template = NOTIFICATION_TEMPLATES.BOOKING_RECEIVED(
            itemTitle,
            renterName
        );
        return await createNotification({
            userId: ownerId,
            ...template,
            rentalId,
            itemId,
        });
    },

    // When owner approves/rejects booking
    async notifyRenterOfBookingDecision(
        renterId,
        rentalId,
        itemId,
        itemTitle,
        ownerName,
        approved
    ) {
        const template = approved
            ? NOTIFICATION_TEMPLATES.BOOKING_APPROVED(itemTitle, ownerName)
            : NOTIFICATION_TEMPLATES.BOOKING_REJECTED(itemTitle, ownerName);

        return await createNotification({
            userId: renterId,
            ...template,
            rentalId,
            itemId,
        });
    },

    // When renter uploads deposit
    async notifyOwnerOfDepositUpload(
        ownerId,
        rentalId,
        itemId,
        itemTitle,
        renterName
    ) {
        // Validate required parameters
        if (!ownerId) {
            console.error(
                "Cannot create deposit upload notification - ownerId is missing:",
                {
                    ownerId,
                    rentalId,
                    itemId,
                    itemTitle,
                    renterName,
                }
            );
            return { success: false, error: "Owner ID is required" };
        }
        if (!itemTitle || !renterName) {
            console.error(
                "Cannot create deposit upload notification - missing required data:",
                {
                    ownerId,
                    rentalId,
                    itemId,
                    itemTitle,
                    renterName,
                }
            );
            return {
                success: false,
                error: "Item title and renter name are required",
            };
        }

        const template = NOTIFICATION_TEMPLATES.DEPOSIT_UPLOADED(
            itemTitle,
            renterName
        );
        return await createNotification({
            userId: ownerId,
            ...template,
            rentalId,
            itemId,
        });
    },

    // When owner verifies deposit
    async notifyRenterOfDepositVerification(
        renterId,
        rentalId,
        itemId,
        itemTitle,
        ownerName
    ) {
        const template = NOTIFICATION_TEMPLATES.DEPOSIT_VERIFIED(
            itemTitle,
            ownerName
        );
        return await createNotification({
            userId: renterId,
            ...template,
            rentalId,
            itemId,
        });
    },

    // Rental flow notifications
    async notifyRenterItemOnTheWay(
        renterId,
        rentalId,
        itemId,
        itemTitle,
        ownerName
    ) {
        const template = NOTIFICATION_TEMPLATES.ITEM_ON_THE_WAY(
            itemTitle,
            ownerName
        );
        return await createNotification({
            userId: renterId,
            ...template,
            rentalId,
            itemId,
        });
    },

    async notifyOwnerRentalStarted(
        ownerId,
        rentalId,
        itemId,
        itemTitle,
        renterName
    ) {
        const template = NOTIFICATION_TEMPLATES.RENTAL_STARTED(
            itemTitle,
            renterName
        );
        return await createNotification({
            userId: ownerId,
            ...template,
            rentalId,
            itemId,
        });
    },

    async notifyOwnerOfReturn(
        ownerId,
        rentalId,
        itemId,
        itemTitle,
        renterName
    ) {
        const template = NOTIFICATION_TEMPLATES.RETURN_INITIATED(
            itemTitle,
            renterName
        );
        return await createNotification({
            userId: ownerId,
            ...template,
            rentalId,
            itemId,
        });
    },

    async notifyRenterOfReturnConfirmation(
        renterId,
        rentalId,
        itemId,
        itemTitle,
        ownerName
    ) {
        const template = NOTIFICATION_TEMPLATES.RETURN_CONFIRMED(
            itemTitle,
            ownerName
        );
        return await createNotification({
            userId: renterId,
            ...template,
            rentalId,
            itemId,
        });
    },
};

/**
 * Item-specific notification helpers
 */
export const ItemNotifications = {
    async notifyItemSubmittedForReview(userId, itemId, itemTitle) {
        const template =
            NOTIFICATION_TEMPLATES.ITEM_SUBMITTED_FOR_REVIEW(itemTitle);
        return await createNotification({
            userId,
            ...template,
            itemId,
        });
    },

    async notifyItemStatusChange(userId, itemId, itemTitle, approved) {
        const template = approved
            ? NOTIFICATION_TEMPLATES.ITEM_APPROVED(itemTitle)
            : NOTIFICATION_TEMPLATES.ITEM_REJECTED(itemTitle);

        return await createNotification({
            userId,
            ...template,
            itemId,
        });
    },
};

/**
 * Reminder notification helpers
 */
export const ReminderNotifications = {
    async sendDepositReminder(userId, rentalId, itemId, itemTitle, hoursLeft) {
        const template = NOTIFICATION_TEMPLATES.DEPOSIT_REMINDER(
            itemTitle,
            hoursLeft
        );
        return await createNotification({
            userId,
            ...template,
            rentalId,
            itemId,
        });
    },

    async sendReturnReminder(userId, rentalId, itemId, itemTitle, daysOverdue) {
        const template = NOTIFICATION_TEMPLATES.RETURN_REMINDER(
            itemTitle,
            daysOverdue
        );
        return await createNotification({
            userId,
            ...template,
            rentalId,
            itemId,
        });
    },

    async sendBookingDepositReminder(
        userId,
        rentalId,
        itemId,
        itemTitle,
        ownerName
    ) {
        const template = NOTIFICATION_TEMPLATES.BOOKING_AWAITING_DEPOSIT(
            itemTitle,
            ownerName
        );
        return await createNotification({
            userId,
            ...template,
            rentalId,
            itemId,
        });
    },

    async sendItemReviewReminder(userId, itemId, itemTitle, daysPending) {
        const template = NOTIFICATION_TEMPLATES.ITEM_UNDER_ADMIN_REVIEW(
            itemTitle,
            daysPending
        );
        return await createNotification({
            userId,
            ...template,
            itemId,
        });
    },

    async sendBookingExpiryReminder(
        userId,
        rentalId,
        itemId,
        itemTitle,
        hoursLeft
    ) {
        const template = NOTIFICATION_TEMPLATES.BOOKING_EXPIRING_SOON(
            itemTitle,
            hoursLeft
        );
        return await createNotification({
            userId,
            ...template,
            rentalId,
            itemId,
        });
    },

    async sendRentalEndingReminder(
        userId,
        rentalId,
        itemId,
        itemTitle,
        hoursLeft
    ) {
        const template = NOTIFICATION_TEMPLATES.RENTAL_ENDING_SOON(
            itemTitle,
            hoursLeft
        );
        return await createNotification({
            userId,
            ...template,
            rentalId,
            itemId,
        });
    },
};

/**
 * Process notification helpers for comprehensive workflow coverage
 */
export const ProcessNotifications = {
    // Item creation process
    async notifyItemSubmittedForReview(userId, itemId, itemTitle) {
        const template =
            NOTIFICATION_TEMPLATES.ITEM_SUBMITTED_FOR_REVIEW(itemTitle);
        return await createNotification({
            userId,
            ...template,
            itemId,
        });
    },

    // Return process notifications for both parties
    async notifyBothPartiesOfCompletion(
        renterUserId,
        ownerUserId,
        rentalId,
        itemId,
        itemTitle,
        isAccommodation = false
    ) {
        const template = NOTIFICATION_TEMPLATES.RETURN_BOTH_PARTIES_NOTIFIED(
            itemTitle,
            isAccommodation
        );

        // Send to renter and/or owner depending on provided IDs
        const targets = [];
        if (renterUserId) {
            targets.push(
                createNotification({
                    userId: renterUserId,
                    ...template,
                    rentalId,
                    itemId,
                })
            );
        }
        if (ownerUserId) {
            targets.push(
                createNotification({
                    userId: ownerUserId,
                    ...template,
                    rentalId,
                    itemId,
                })
            );
        }
        const results = await Promise.allSettled(targets);

        return {
            success: results.every((r) => r.status === "fulfilled"),
            results,
        };
    },

    // Delivery confirmation notifications
    async notifyItemReadyForPickup(
        userId,
        rentalId,
        itemId,
        itemTitle,
        ownerName
    ) {
        const template = NOTIFICATION_TEMPLATES.ITEM_READY_FOR_PICKUP(
            itemTitle,
            ownerName
        );
        return await createNotification({
            userId,
            ...template,
            rentalId,
            itemId,
        });
    },

    async notifyItemDeliveredSuccessfully(
        userId,
        rentalId,
        itemId,
        itemTitle,
        renterName
    ) {
        const template = NOTIFICATION_TEMPLATES.ITEM_DELIVERED_CONFIRMATION(
            itemTitle,
            renterName
        );
        return await createNotification({
            userId,
            ...template,
            rentalId,
            itemId,
        });
    },

    // Admin notifications
    async notifyAdminReviewRequired(adminUserId, type, itemTitle, reason) {
        const template = NOTIFICATION_TEMPLATES.ADMIN_REVIEW_REQUIRED(
            type,
            itemTitle,
            reason
        );
        return await createNotification({
            userId: adminUserId,
            ...template,
        });
    },

    // Checkout/Return process notifications
    async notifyReturnCheckoutInitiated(
        ownerUserId,
        rentalId,
        itemId,
        itemTitle,
        renterName
    ) {
        const template = NOTIFICATION_TEMPLATES.RETURN_CHECKOUT_INITIATED(
            itemTitle,
            renterName
        );
        return await createNotification({
            userId: ownerUserId,
            ...template,
            rentalId,
            itemId,
        });
    },

    async notifyReturnAccepted(
        renterUserId,
        rentalId,
        itemId,
        itemTitle,
        ownerName
    ) {
        const template = NOTIFICATION_TEMPLATES.RETURN_ACCEPTED(
            itemTitle,
            ownerName
        );
        return await createNotification({
            userId: renterUserId,
            ...template,
            rentalId,
            itemId,
        });
    },

    async notifyReturnDisputed(
        renterUserId,
        rentalId,
        itemId,
        itemTitle,
        ownerName,
        reason
    ) {
        const template = NOTIFICATION_TEMPLATES.RETURN_DISPUTED(
            itemTitle,
            ownerName,
            reason
        );
        return await createNotification({
            userId: renterUserId,
            ...template,
            rentalId,
            itemId,
        });
    },
};
