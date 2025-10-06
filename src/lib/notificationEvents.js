import {
    BookingNotifications,
    ItemNotifications,
    ReminderNotifications,
    ProcessNotifications,
    NOTIFICATION_TEMPLATES,
    createNotification,
} from "../lib/notifications";

/**
 * Booking workflow event handlers
 * These functions should be called when booking statuses change
 */

// When a booking is created (status: pending)
export const handleBookingCreated = async (booking, itemTitle, renterName) => {
    try {
        // Notify owner about new booking
        await BookingNotifications.notifyOwnerOfNewBooking(
            booking.owner_id,
            booking.rental_id,
            booking.item_id,
            itemTitle,
            renterName
        );

        // Notify renter that the booking is pending owner approval
        const renterTemplate =
            NOTIFICATION_TEMPLATES.BOOKING_SUBMITTED_PENDING_APPROVAL(
                itemTitle
            );
        await createNotification({
            userId: booking.renter_id,
            ...renterTemplate,
            rentalId: booking.rental_id,
            itemId: booking.item_id,
        });
    } catch (error) {
        console.error("Failed to send booking created notification:", error);
    }
};

// When booking is approved by owner (status: confirmed)
export const handleBookingApproved = async (booking, itemTitle, ownerName) => {
    try {
        await BookingNotifications.notifyRenterOfBookingDecision(
            booking.renter_id,
            booking.rental_id,
            booking.item_id,
            itemTitle,
            ownerName,
            true // approved
        );
    } catch (error) {
        console.error("Failed to send booking approval notification:", error);
    }
};

// When booking is rejected by owner (status: rejected)
export const handleBookingRejected = async (booking, itemTitle, ownerName) => {
    try {
        await BookingNotifications.notifyRenterOfBookingDecision(
            booking.renter_id,
            booking.rental_id,
            booking.item_id,
            itemTitle,
            ownerName,
            false // rejected
        );
    } catch (error) {
        console.error("Failed to send booking rejection notification:", error);
    }
};

// When deposit proof is uploaded (status: deposit_submitted)
export const handleDepositUploaded = async (booking, itemTitle, renterName) => {
    try {
        // Validate required booking data
        if (!booking.owner_id) {
            console.error(
                "Cannot send deposit notification - missing owner_id in booking:",
                booking
            );
            return;
        }
        if (!renterName) {
            console.error(
                "Cannot send deposit notification - missing renterName:",
                { booking, renterName }
            );
            return;
        }
        if (!itemTitle) {
            console.error(
                "Cannot send deposit notification - missing itemTitle:",
                { booking, itemTitle }
            );
            return;
        }

        await BookingNotifications.notifyOwnerOfDepositUpload(
            booking.owner_id,
            booking.rental_id,
            booking.item_id,
            itemTitle,
            renterName
        );
    } catch (error) {
        console.error("Failed to send deposit upload notification:", error);
        console.error("Booking data:", booking);
    }
};

// When deposit is verified by owner (status: on_the_way)
export const handleDepositVerified = async (booking, itemTitle, ownerName) => {
    try {
        // Validate required booking data
        if (!booking.renter_id) {
            console.error(
                "Cannot send deposit verification notification - missing renter_id:",
                booking
            );
            return;
        }
        if (!itemTitle || !ownerName) {
            console.error(
                "Cannot send deposit verification notification - missing data:",
                {
                    booking,
                    itemTitle,
                    ownerName,
                }
            );
            return;
        }

        await BookingNotifications.notifyRenterOfDepositVerification(
            booking.renter_id,
            booking.rental_id,
            booking.item_id,
            itemTitle,
            ownerName
        );
    } catch (error) {
        console.error(
            "Failed to send deposit verification notification:",
            error
        );
        console.error("Booking data:", booking);
    }
};

// When item is marked as on the way (status: on_the_way)
export const handleItemOnTheWay = async (booking, itemTitle, ownerName) => {
    try {
        // Validate required booking data
        if (!booking.renter_id) {
            console.error(
                "Cannot send item on the way notification - missing renter_id:",
                booking
            );
            return;
        }
        if (!itemTitle || !ownerName) {
            console.error(
                "Cannot send item on the way notification - missing data:",
                {
                    booking,
                    itemTitle,
                    ownerName,
                }
            );
            return;
        }

        await BookingNotifications.notifyRenterItemOnTheWay(
            booking.renter_id,
            booking.rental_id,
            booking.item_id,
            itemTitle,
            ownerName
        );
    } catch (error) {
        console.error("Failed to send item on the way notification:", error);
        console.error("Booking data:", booking);
    }
};

// When rental starts (status: ongoing)
export const handleRentalStarted = async (booking, itemTitle, renterName) => {
    try {
        await BookingNotifications.notifyOwnerRentalStarted(
            booking.owner_id,
            booking.rental_id,
            booking.item_id,
            itemTitle,
            renterName
        );
    } catch (error) {
        console.error("Failed to send rental started notification:", error);
    }
};

// When return is initiated (status: awaiting_owner_confirmation)
export const handleReturnInitiated = async (booking, itemTitle, renterName) => {
    try {
        await BookingNotifications.notifyOwnerOfReturn(
            booking.owner_id,
            booking.rental_id,
            booking.item_id,
            itemTitle,
            renterName
        );
    } catch (error) {
        console.error("Failed to send return initiated notification:", error);
    }
};

// When return is confirmed (status: completed)
export const handleReturnConfirmed = async (booking, itemTitle, ownerName) => {
    try {
        await BookingNotifications.notifyRenterOfReturnConfirmation(
            booking.renter_id,
            booking.rental_id,
            booking.item_id,
            itemTitle,
            ownerName
        );
    } catch (error) {
        console.error(
            "Failed to send return confirmation notification:",
            error
        );
    }
};

/**
 * Item management event handlers
 */

// When item is approved by admin
export const handleItemApproved = async (item, userId, adminName = "Admin") => {
    try {
        // Use the enhanced approval template
        const template = NOTIFICATION_TEMPLATES.ITEM_APPROVED_BY_ADMIN(
            item.title,
            adminName
        );
        await createNotification({
            userId,
            ...template,
            itemId: item.item_id,
        });
    } catch (error) {
        console.error("Failed to send item approval notification:", error);
    }
};

// When item is rejected by admin
export const handleItemRejected = async (
    item,
    userId,
    adminName = "Admin",
    rejectionReason = ""
) => {
    try {
        // Use the enhanced rejection template
        const template = NOTIFICATION_TEMPLATES.ITEM_REJECTED_BY_ADMIN(
            item.title,
            adminName,
            rejectionReason
        );
        await createNotification({
            userId,
            ...template,
            itemId: item.item_id,
        });
    } catch (error) {
        console.error("Failed to send item rejection notification:", error);
    }
};

// When item is flagged for review (e.g., reported by users)
export const handleItemFlaggedForReview = async (
    item,
    userId,
    reportReason
) => {
    try {
        const template = NOTIFICATION_TEMPLATES.ITEM_FLAGGED_FOR_REVIEW(
            item.title,
            reportReason
        );
        await createNotification({
            userId,
            ...template,
            itemId: item.item_id,
        });
    } catch (error) {
        console.error("Failed to send item flagged notification:", error);
    }
};

// When admin gets notification about new item submission
export const handleNewItemSubmissionForAdmin = async (
    adminUserId,
    item,
    ownerName
) => {
    try {
        const template = NOTIFICATION_TEMPLATES.ADMIN_NEW_ITEM_SUBMISSION(
            item.title,
            ownerName,
            item.category || "item"
        );
        await createNotification({
            userId: adminUserId,
            ...template,
            itemId: item.item_id,
        });
    } catch (error) {
        console.error(
            "Failed to send new item submission notification to admin:",
            error
        );
    }
};

// When admin needs to be reminded about pending reviews
export const handleAdminReviewQueueNotification = async (
    adminUserId,
    adminName,
    pendingCount
) => {
    try {
        const template = NOTIFICATION_TEMPLATES.ADMIN_REVIEW_QUEUE_NOTIFICATION(
            adminName,
            pendingCount
        );
        await createNotification({
            userId: adminUserId,
            ...template,
        });
    } catch (error) {
        console.error("Failed to send admin review queue notification:", error);
    }
};

/**
 * Comprehensive process event handlers for complete workflow coverage
 */

// When an item is submitted for admin review
export const handleItemSubmittedForReview = async (item, userId) => {
    try {
        await ProcessNotifications.notifyItemSubmittedForReview(
            userId,
            item.item_id,
            item.title
        );
    } catch (error) {
        console.error("Failed to send item submitted notification:", error);
    }
};

// When an admin needs to review something
export const handleAdminReviewRequired = async (
    adminUserId,
    type,
    itemTitle,
    reason
) => {
    try {
        await ProcessNotifications.notifyAdminReviewRequired(
            adminUserId,
            type,
            itemTitle,
            reason
        );
    } catch (error) {
        console.error("Failed to send admin review notification:", error);
    }
};

// When item is ready for pickup/delivery
export const handleItemReadyForPickup = async (
    booking,
    itemTitle,
    ownerName
) => {
    try {
        await ProcessNotifications.notifyItemReadyForPickup(
            booking.renter_id,
            booking.rental_id,
            booking.item_id,
            itemTitle,
            ownerName
        );
    } catch (error) {
        console.error("Failed to send pickup ready notification:", error);
    }
};

// When item delivery is confirmed
export const handleItemDelivered = async (booking, itemTitle, renterName) => {
    try {
        await ProcessNotifications.notifyItemDeliveredSuccessfully(
            booking.owner_id,
            booking.rental_id,
            booking.item_id,
            itemTitle,
            renterName
        );
    } catch (error) {
        console.error(
            "Failed to send delivery confirmation notification:",
            error
        );
    }
};

// When return/checkout process is initiated by renter
export const handleReturnCheckoutInitiated = async (
    booking,
    itemTitle,
    renterName
) => {
    try {
        await ProcessNotifications.notifyReturnCheckoutInitiated(
            booking.owner_id,
            booking.rental_id,
            booking.item_id,
            itemTitle,
            renterName
        );
    } catch (error) {
        console.error("Failed to send return checkout notification:", error);
    }
};

// When owner accepts the return condition
export const handleReturnAccepted = async (booking, itemTitle, ownerName) => {
    try {
        await ProcessNotifications.notifyReturnAccepted(
            booking.renter_id,
            booking.rental_id,
            booking.item_id,
            itemTitle,
            ownerName
        );
    } catch (error) {
        console.error("Failed to send return accepted notification:", error);
    }
};

// When owner disputes the return condition
export const handleReturnDisputed = async (
    booking,
    itemTitle,
    ownerName,
    reason
) => {
    try {
        await ProcessNotifications.notifyReturnDisputed(
            booking.renter_id,
            booking.rental_id,
            booking.item_id,
            itemTitle,
            ownerName,
            reason
        );
    } catch (error) {
        console.error("Failed to send return disputed notification:", error);
    }
};

// When both parties are notified of completion
export const handleBothPartiesNotified = async (
    booking,
    itemTitle,
    isAccommodation = false
) => {
    try {
        await ProcessNotifications.notifyBothPartiesOfCompletion(
            booking.renter_id,
            booking.owner_id,
            booking.rental_id,
            booking.item_id,
            itemTitle,
            isAccommodation
        );
    } catch (error) {
        console.error("Failed to send completion notifications:", error);
    }
};

/**
 * Enhanced reminder handlers (to be called by scheduled jobs or manual triggers)
 */

// Remind renter to upload deposit proof
export const handleDepositReminder = async (booking, itemTitle, hoursLeft) => {
    try {
        await ReminderNotifications.sendDepositReminder(
            booking.renter_id,
            booking.rental_id,
            booking.item_id,
            itemTitle,
            hoursLeft
        );
    } catch (error) {
        console.error("Failed to send deposit reminder:", error);
    }
};

// Remind about overdue return
export const handleReturnReminder = async (booking, itemTitle, daysOverdue) => {
    try {
        await ReminderNotifications.sendReturnReminder(
            booking.renter_id,
            booking.rental_id,
            booking.item_id,
            itemTitle,
            daysOverdue
        );
    } catch (error) {
        console.error("Failed to send return reminder:", error);
    }
};

// Remind about pending booking deposit
export const handleBookingDepositReminder = async (
    booking,
    itemTitle,
    ownerName
) => {
    try {
        await ReminderNotifications.sendBookingDepositReminder(
            booking.renter_id,
            booking.rental_id,
            booking.item_id,
            itemTitle,
            ownerName
        );
    } catch (error) {
        console.error("Failed to send booking deposit reminder:", error);
    }
};

// Remind about item still under review
export const handleItemReviewReminder = async (item, userId, daysPending) => {
    try {
        await ReminderNotifications.sendItemReviewReminder(
            userId,
            item.item_id,
            item.title,
            daysPending
        );
    } catch (error) {
        console.error("Failed to send item review reminder:", error);
    }
};

// Remind about booking expiry
export const handleBookingExpiryReminder = async (
    booking,
    itemTitle,
    hoursLeft
) => {
    try {
        await ReminderNotifications.sendBookingExpiryReminder(
            booking.renter_id,
            booking.rental_id,
            booking.item_id,
            itemTitle,
            hoursLeft
        );
    } catch (error) {
        console.error("Failed to send booking expiry reminder:", error);
    }
};

// Remind about rental ending soon
export const handleRentalEndingReminder = async (
    booking,
    itemTitle,
    hoursLeft
) => {
    try {
        await ReminderNotifications.sendRentalEndingReminder(
            booking.renter_id,
            booking.rental_id,
            booking.item_id,
            itemTitle,
            hoursLeft
        );
    } catch (error) {
        console.error("Failed to send rental ending reminder:", error);
    }
};

/**
 * Enhanced utility function to handle booking status changes
 * Call this whenever a rental transaction status is updated
 */
export const handleBookingStatusChange = async (
    oldStatus,
    newStatus,
    booking,
    itemData,
    userData
) => {
    const itemTitle = itemData?.title || "Unknown Item";
    const renterName = userData?.renter?.full_name || "Unknown User";
    const ownerName = userData?.owner?.full_name || "Unknown Owner";
    const isAccommodation = itemData?.category === "accommodation";

    switch (newStatus) {
        case "pending":
            if (oldStatus !== "pending") {
                await handleBookingCreated(booking, itemTitle, renterName);
            }
            break;

        case "confirmed":
            if (oldStatus === "pending") {
                await handleBookingApproved(booking, itemTitle, ownerName);
            }
            break;

        case "rejected":
            if (oldStatus === "pending") {
                await handleBookingRejected(booking, itemTitle, ownerName);
            }
            break;

        case "deposit_submitted":
            if (oldStatus === "confirmed") {
                await handleDepositUploaded(booking, itemTitle, renterName);
            }
            break;

        case "deposit_verified":
            if (oldStatus === "deposit_submitted") {
                await handleDepositVerified(booking, itemTitle, ownerName);
            }
            break;

        case "ready_for_pickup":
            if (oldStatus === "deposit_verified") {
                await handleItemReadyForPickup(booking, itemTitle, ownerName);
            }
            break;

        case "on_the_way":
            if (
                oldStatus === "deposit_submitted" ||
                oldStatus === "deposit_verified" ||
                oldStatus === "ready_for_pickup"
            ) {
                // When owner verifies deposit and marks as on the way
                await handleItemOnTheWay(booking, itemTitle, ownerName);

                // Also send deposit verification notification
                if (oldStatus === "deposit_submitted") {
                    await handleDepositVerified(booking, itemTitle, ownerName);
                }
            }
            break;

        case "delivered":
            if (oldStatus === "on_the_way") {
                await handleItemDelivered(booking, itemTitle, renterName);
            }
            break;

        case "ongoing":
            if (oldStatus === "on_the_way" || oldStatus === "delivered") {
                await handleRentalStarted(booking, itemTitle, renterName);
            }
            break;

        case "return_initiated":
            if (oldStatus === "ongoing") {
                await handleReturnCheckoutInitiated(
                    booking,
                    itemTitle,
                    renterName
                );
            }
            break;

        case "awaiting_owner_confirmation":
            if (oldStatus === "ongoing" || oldStatus === "return_initiated") {
                await handleReturnInitiated(booking, itemTitle, renterName);
            }
            break;

        case "return_accepted":
            if (oldStatus === "awaiting_owner_confirmation") {
                await handleReturnAccepted(booking, itemTitle, ownerName);
            }
            break;

        case "return_disputed":
            if (oldStatus === "awaiting_owner_confirmation") {
                // You'll need to pass the dispute reason from the calling function
                await handleReturnDisputed(
                    booking,
                    itemTitle,
                    ownerName,
                    "Condition dispute"
                );
            }
            break;

        case "completed":
            if (
                oldStatus === "awaiting_owner_confirmation" ||
                oldStatus === "return_accepted"
            ) {
                // Renter-facing completion
                await handleReturnConfirmed(booking, itemTitle, ownerName);
                // Owner-facing completion (route to booking-requests)
                await ProcessNotifications.notifyBothPartiesOfCompletion(
                    null, // renterUserId not needed here; will ignore since we tailor below
                    booking.owner_id,
                    booking.rental_id,
                    booking.item_id,
                    itemTitle,
                    isAccommodation
                );
            }
            break;

        default:
            console.log(`No notification handler for status: ${newStatus}`);
    }
};

/**
 * Enhanced utility function for item status changes (admin approval process)
 */
export const handleItemStatusChange = async (
    oldStatus,
    newStatus,
    item,
    userId,
    adminData = null,
    rejectionReason = ""
) => {
    const itemTitle = item?.title || "Unknown Item";
    const adminName = adminData?.name || "Admin";
    const adminUserId = adminData?.id;

    switch (newStatus) {
        case "pending_approval":
            if (oldStatus === "draft" || oldStatus !== "pending_approval") {
                // Notify user that item was submitted
                await handleItemSubmittedForReview(item, userId);

                // Notify admin about new submission
                if (adminUserId) {
                    const ownerName = adminData?.ownerName || "User";
                    await handleNewItemSubmissionForAdmin(
                        adminUserId,
                        item,
                        ownerName
                    );
                }
            }
            break;

        case "approved":
            if (oldStatus === "pending_approval") {
                await handleItemApproved(item, userId, adminName);
            }
            break;

        case "rejected":
            if (oldStatus === "pending_approval") {
                await handleItemRejected(
                    item,
                    userId,
                    adminName,
                    rejectionReason
                );
            }
            break;

        case "flagged":
            if (oldStatus === "approved") {
                // Item was flagged after being live
                const reportReason =
                    rejectionReason || "Content violation reported";
                await handleItemFlaggedForReview(item, userId, reportReason);

                // Notify admin about flagged item
                if (adminUserId) {
                    await handleAdminReviewRequired(
                        adminUserId,
                        "flagged item",
                        itemTitle,
                        reportReason,
                        "urgent"
                    );
                }
            }
            break;

        default:
            console.log(
                `No item notification handler for status: ${newStatus}`
            );
    }
};

/**
 * Scheduler functions for reminder notifications
 * These should be called by background jobs or cron tasks
 */
export const ScheduledReminders = {
    // Check for bookings awaiting deposit and send reminders
    async checkDepositReminders() {
        // This would query the database for bookings in 'confirmed' status
        // that are approaching their deposit deadline
        console.log("Checking for deposit reminders...");
        // Implementation would fetch relevant bookings and call handleDepositReminder
    },

    // Check for overdue returns
    async checkReturnReminders() {
        // This would query for bookings past their return date
        console.log("Checking for return reminders...");
        // Implementation would fetch overdue bookings and call handleReturnReminder
    },

    // Check for items pending admin review
    async checkItemReviewReminders() {
        // This would query for items pending approval for extended periods
        console.log("Checking for item review reminders...");
        // Implementation would fetch pending items and call handleItemReviewReminder
    },

    // Check for bookings expiring soon
    async checkBookingExpiryReminders() {
        // This would query for confirmed bookings approaching their start date without deposits
        console.log("Checking for booking expiry reminders...");
        // Implementation would fetch expiring bookings and call handleBookingExpiryReminder
    },

    // Check for rentals ending soon
    async checkRentalEndingReminders() {
        // This would query for ongoing rentals approaching their end date
        console.log("Checking for rental ending reminders...");
        // Implementation would fetch ending rentals and call handleRentalEndingReminder
    },
};
