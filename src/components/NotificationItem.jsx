import React from "react";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import {
    Bell,
    Package,
    User,
    AlertCircle,
    Clock,
    CheckCircle,
    X,
} from "lucide-react";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import {
    NOTIFICATION_TYPES,
} from "../lib/notifications";

const NotificationItem = ({
    notification,
    onMarkAsRead,
    onNavigate,
    onDismiss,
    userRole,  // ✅ Pass the current user's role
    compact = false,
}) => {
    const navigate = useNavigate();
    const {
        notification_id,
        title,
        message,
        type,
        read_at,
        created_at,
        rental_id,
        item_id,
        from_user_role,
        to_user_role,
    } = notification;

    const isUnread = !read_at;
    const timeAgo = formatDistanceToNow(new Date(created_at), {
        addSuffix: true,
    });

    // Get appropriate icon based on notification type
    const getNotificationIcon = (type) => {
        switch (type) {
            case NOTIFICATION_TYPES.BOOKING:
                return <Package className="h-4 w-4" />;
            case NOTIFICATION_TYPES.DEPOSIT:
                return <CheckCircle className="h-4 w-4" />;
            case NOTIFICATION_TYPES.RENTAL:
                return <Clock className="h-4 w-4" />;
            case NOTIFICATION_TYPES.RETURN:
                return <Package className="h-4 w-4" />;
            case NOTIFICATION_TYPES.ITEM:
                return <Package className="h-4 w-4" />;
            case NOTIFICATION_TYPES.ADMIN:
                return <AlertCircle className="h-4 w-4" />;
            case NOTIFICATION_TYPES.REMINDER:
                return <Bell className="h-4 w-4" />;
            default:
                return <Bell className="h-4 w-4" />;
        }
    };

    // Get color scheme based on type
    const getTypeColorScheme = (type) => {
        switch (type) {
            case NOTIFICATION_TYPES.BOOKING:
                return "bg-blue-100 text-blue-800 border-blue-200";
            case NOTIFICATION_TYPES.DEPOSIT:
                return "bg-green-100 text-green-800 border-green-200";
            case NOTIFICATION_TYPES.RENTAL:
                return "bg-purple-100 text-purple-800 border-purple-200";
            case NOTIFICATION_TYPES.RETURN:
                return "bg-orange-100 text-orange-800 border-orange-200";
            case NOTIFICATION_TYPES.ITEM:
                return "bg-yellow-100 text-yellow-800 border-yellow-200";
            case NOTIFICATION_TYPES.ADMIN:
                return "bg-red-100 text-red-800 border-red-200";
            case NOTIFICATION_TYPES.REMINDER:
                return "bg-gray-100 text-gray-800 border-gray-200";
            default:
                return "bg-gray-100 text-gray-800 border-gray-200";
        }
    };

    // ✅ Determine navigation path based on notification title/type
    // ✅ IMPROVED: Determine navigation path based on user role and notification content
    const getNavigationPath = () => {
        if (!rental_id) {
            // No rental context, route based on notification type
            if (type === NOTIFICATION_TYPES.ITEM || type === NOTIFICATION_TYPES.ADMIN) {
                return type === NOTIFICATION_TYPES.ADMIN ? "/adminhome" : "/profile";
            }
            return "/notifications";
        }

        // Rental-related notification - determine route based on user's role in this transaction

        // RENTER NOTIFICATIONS (updates about their bookings) → /my-bookings
        const renterNotificationTitles = [
            "Booking Submitted",
            "Booking Approved",
            "Booking Declined",
            "Booking Cancelled",
            "Deposit Verified",
            "Item On The Way",
            "Return Confirmed",
            "Rental Booking Started",
            "Return Accepted",
            "Item Delivered Successfully",
            "Rental Confirmed",
            "Upload Deposit Proof Required",
            "Booking Expires Soon",
            "Rental Ending Soon",
            "Stay Completed",
        ];

        // LESSOR/OWNER NOTIFICATIONS (actions requiring owner attention) → /booking-requests
        const lessorNotificationTitles = [
            "New Booking Request",
            "Deposit Proof Received",
            "Return Process Started",
            "Return Initiated",
            "Waiting for Owner Confirmation",
            "Rental Started",
            "Item Ready for Pickup",
            "Guest Checked Out",
            "Item Return Started",
            "Rental Completed"
        ];

        // Check if notification matches renter or lessor patterns
        const isRenterNotification = renterNotificationTitles.some(t =>
            title?.includes(t)
        );

        const isLessorNotification = lessorNotificationTitles.some(t =>
            title?.includes(t)
        );

        // Route based on notification type first
        if (isRenterNotification) {
            return `/my-bookings?rental=${rental_id}`;
        }

        if (isLessorNotification) {
            return `/booking-requests?rental=${rental_id}`;
        }

        // Fallback: Use userRole as tiebreaker
        // If user is explicitly a renter in the system, default to my-bookings
        // Otherwise default to booking-requests (safer for owners/admins)
        if (userRole === 'renter') {
            return `/my-bookings?rental=${rental_id}`;
        }

        // Default to booking-requests for ambiguous cases (owner/admin bias)
        return `/booking-requests?rental=${rental_id}`;
    };

    const handleClick = () => {
        // Mark as read if unread
        if (isUnread) {
            onMarkAsRead(notification_id);
        }

        // Navigate to relevant page
        const path = getNavigationPath();
        console.log("🔗 userRole:", userRole);
        console.log("🔗 Full notification object:", notification);
        console.log("🔗 Navigating to:", path, {
            rental_id,
            item_id,
            type,
            userRole,
            allKeys: Object.keys(notification)
        });

        if (path !== "/notifications") {
            if (onNavigate) {
                onNavigate(path);
            } else {
                navigate(path);
            }
        }
    };

    const handleMarkAsRead = (e) => {
        e.stopPropagation();
        onMarkAsRead(notification_id);
    };

    const handleDismiss = (e) => {
        e.stopPropagation();
        if (onDismiss) {
            onDismiss(notification_id);
        }
    };

    if (compact) {
        return (
            <div
                className={`flex items-center gap-3 p-3 border-l-4 cursor-pointer hover:bg-gray-50 transition-colors ${isUnread
                        ? "bg-blue-50 border-l-blue-500"
                        : "bg-white border-l-gray-200"
                    }`}
                onClick={handleClick}
            >
                <div className={`p-2 rounded-full ${getTypeColorScheme(type)}`}>
                    {getNotificationIcon(type)}
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <h4
                            className={`text-sm font-medium truncate ${isUnread ? "font-semibold" : ""
                                }`}
                        >
                            {title}
                        </h4>
                        {isUnread && (
                            <div className="w-2 h-2 bg-blue-500 rounded-full" />
                        )}
                    </div>
                    <p className="text-xs text-gray-600 truncate">{message}</p>
                    <p className="text-xs text-gray-400">{timeAgo}</p>
                </div>

                {isUnread && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleMarkAsRead}
                        className="text-blue-600 hover:text-blue-800"
                    >
                        Mark read
                    </Button>
                )}
            </div>
        );
    }

    return (
        <Card
            className={`p-4 cursor-pointer hover:shadow-md transition-all ${isUnread ? "bg-blue-50 border-blue-200" : "bg-white"
                }`}
            onClick={handleClick}
        >
            <div className="flex items-start gap-4">
                <div className={`p-3 rounded-full ${getTypeColorScheme(type)}`}>
                    {getNotificationIcon(type)}
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                                <h3
                                    className={`font-medium text-gray-900 ${isUnread ? "font-semibold" : ""
                                        }`}
                                >
                                    {title}
                                </h3>
                                {isUnread && (
                                    <div className="w-2 h-2 bg-blue-500 rounded-full" />
                                )}
                            </div>

                            <p className="text-gray-600 text-sm mb-2">
                                {message}
                            </p>

                            <div className="flex items-center gap-3 flex-wrap">
                                <Badge
                                    variant="outline"
                                    className={getTypeColorScheme(type)}
                                >
                                    {type}
                                </Badge>

                                {rental_id && (
                                    <span className="text-xs text-gray-500">
                                        Rental #{rental_id.substring(0, 8)}
                                    </span>
                                )}

                                {item_id && (
                                    <span className="text-xs text-gray-500">
                                        Item #{item_id.substring(0, 8)}
                                    </span>
                                )}

                                <span className="text-xs text-gray-400">
                                    {timeAgo}
                                </span>
                            </div>
                        </div>

                        <div className="flex items-center gap-1">
                            {isUnread && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleMarkAsRead}
                                    className="text-blue-600 hover:text-blue-800"
                                >
                                    <CheckCircle className="h-4 w-4" />
                                </Button>
                            )}

                            {onDismiss && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleDismiss}
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </Card>
    );
};

export default NotificationItem;