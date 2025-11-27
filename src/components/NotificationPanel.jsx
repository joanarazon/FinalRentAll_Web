import React, { useState } from "react";
import { Bell, BellRing, CheckCheck, Filter } from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { useNotifications } from "../context/NotificationContext";
import { useUserContext } from "../context/UserContext";  // ✅ Add this
import { NOTIFICATION_TYPES } from "../lib/notifications";
import NotificationItem from "./NotificationItem";

const NotificationPanel = ({
    onNavigate,
    compact = false,
    searchTerm = "",
}) => {
    const {
        notifications,
        unreadCount,
        loading,
        markAsRead,
        markAllAsRead,
        getNotificationsByType,
        getUnreadNotifications,
    } = useNotifications();

    const { user } = useUserContext();  // ✅ Get current user
    const userRole = user?.role;  // ✅ Extract role

    const [activeTab, setActiveTab] = useState("all");
    const [typeFilter, setTypeFilter] = useState(null);

    // Filter notifications based on active tab, type filter, and search term
    const getFilteredNotifications = () => {
        let filtered = notifications;

        // Apply tab filter
        switch (activeTab) {
            case "unread":
                filtered = getUnreadNotifications();
                break;
            case "booking":
                filtered = getNotificationsByType(NOTIFICATION_TYPES.BOOKING)
                    .concat(getNotificationsByType(NOTIFICATION_TYPES.DEPOSIT))
                    .concat(getNotificationsByType(NOTIFICATION_TYPES.RENTAL))
                    .concat(getNotificationsByType(NOTIFICATION_TYPES.RETURN));
                break;
            case "items":
                filtered = getNotificationsByType(NOTIFICATION_TYPES.ITEM);
                break;
            case "reminders":
                filtered = getNotificationsByType(NOTIFICATION_TYPES.REMINDER);
                break;
            case "system":
                filtered = getNotificationsByType(
                    NOTIFICATION_TYPES.ADMIN
                ).concat(getNotificationsByType(NOTIFICATION_TYPES.GENERAL));
                break;
            default:
                filtered = notifications;
        }

        // Apply type filter if set
        if (typeFilter) {
            filtered = filtered.filter((notif) => notif.type === typeFilter);
        }

        // Apply search filter if search term exists
        if (searchTerm && searchTerm.trim()) {
            const searchLower = searchTerm.toLowerCase().trim();
            filtered = filtered.filter(
                (notif) =>
                    notif.title?.toLowerCase().includes(searchLower) ||
                    notif.message?.toLowerCase().includes(searchLower)
            );
        }

        return filtered.sort(
            (a, b) => new Date(b.created_at) - new Date(a.created_at)
        );
    };

    const handleMarkAllAsRead = async () => {
        await markAllAsRead();
    };

    const filteredNotifications = getFilteredNotifications();
    const hasNotifications = notifications.length > 0;

    if (compact) {
        return (
            <div className="w-full max-w-md">
                <div className="flex items-center justify-between p-3 border-b">
                    <div className="flex items-center gap-2">
                        <BellRing className="h-5 w-5" />
                        <span className="font-medium">Notifications</span>
                        {unreadCount > 0 && (
                            <Badge variant="destructive" className="text-xs">
                                {unreadCount}
                            </Badge>
                        )}
                    </div>

                    {unreadCount > 0 && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleMarkAllAsRead}
                            className="text-xs"
                        >
                            <CheckCheck className="h-4 w-4 mr-1" />
                            Mark all read
                        </Button>
                    )}
                </div>

                <div className="max-h-96 overflow-y-auto">
                    {!hasNotifications ? (
                        <div className="p-6 text-center text-gray-500">
                            <Bell className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                            <p>No notifications yet</p>
                            <p className="text-sm">
                                We'll notify you when something happens
                            </p>
                        </div>
                    ) : filteredNotifications.length === 0 ? (
                        <div className="p-6 text-center text-gray-500">
                            <Bell className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                            <p>No notifications in this category</p>
                        </div>
                    ) : (
                        <div className="divide-y">
                            {filteredNotifications
                                .slice(0, 10)
                                .map((notification) => (
                                    <NotificationItem
                                        key={notification.notification_id}
                                        notification={notification}
                                        onMarkAsRead={markAsRead}
                                        onNavigate={onNavigate}
                                        userRole={userRole}  // ✅ Pass userRole
                                        compact={true}
                                    />
                                ))}
                        </div>
                    )}
                </div>

                {filteredNotifications.length > 10 && (
                    <div className="p-3 border-t text-center">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                                onNavigate && onNavigate("/notifications")
                            }
                            className="text-sm"
                        >
                            View all notifications
                        </Button>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="w-full">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <BellRing className="h-6 w-6" />
                    <h1 className="text-2xl font-bold">Notifications</h1>
                    {unreadCount > 0 && (
                        <Badge variant="destructive">
                            {unreadCount} unread
                        </Badge>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm">
                                <Filter className="h-4 w-4 mr-2" />
                                Filter
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                            <DropdownMenuItem
                                onClick={() => setTypeFilter(null)}
                            >
                                All Types
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onClick={() =>
                                    setTypeFilter(NOTIFICATION_TYPES.BOOKING)
                                }
                            >
                                Bookings
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onClick={() =>
                                    setTypeFilter(NOTIFICATION_TYPES.DEPOSIT)
                                }
                            >
                                Deposits
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onClick={() =>
                                    setTypeFilter(NOTIFICATION_TYPES.RENTAL)
                                }
                            >
                                Rentals
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onClick={() =>
                                    setTypeFilter(NOTIFICATION_TYPES.RETURN)
                                }
                            >
                                Returns
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onClick={() =>
                                    setTypeFilter(NOTIFICATION_TYPES.ITEM)
                                }
                            >
                                Items
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onClick={() =>
                                    setTypeFilter(NOTIFICATION_TYPES.REMINDER)
                                }
                            >
                                Reminders
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    {unreadCount > 0 && (
                        <Button onClick={handleMarkAllAsRead} size="sm">
                            <CheckCheck className="h-4 w-4 mr-2" />
                            Mark all read
                        </Button>
                    )}
                </div>
            </div>

            <Tabs
                value={activeTab}
                onValueChange={setActiveTab}
                className="w-full"
            >
                <TabsList className="grid w-full grid-cols-5">
                    <TabsTrigger
                        value="all"
                        className="flex items-center gap-2"
                    >
                        <Bell className="h-4 w-4" />
                        All
                    </TabsTrigger>
                    <TabsTrigger
                        value="unread"
                        className="flex items-center gap-2"
                    >
                        <BellRing className="h-4 w-4" />
                        Unread
                        {unreadCount > 0 && (
                            <Badge
                                variant="destructive"
                                className="text-xs ml-1"
                            >
                                {unreadCount}
                            </Badge>
                        )}
                    </TabsTrigger>
                    <TabsTrigger value="booking">Bookings</TabsTrigger>
                    <TabsTrigger value="items">Items</TabsTrigger>
                    <TabsTrigger value="reminders">Reminders</TabsTrigger>
                </TabsList>

                <div className="mt-6">
                    <TabsContent value="all" className="mt-0">
                        <NotificationList
                            notifications={filteredNotifications}
                            onMarkAsRead={markAsRead}
                            onNavigate={onNavigate}
                            userRole={userRole}  // ✅ Pass userRole
                            emptyMessage="No notifications yet"
                            emptyDescription="We'll notify you when something happens"
                        />
                    </TabsContent>

                    <TabsContent value="unread" className="mt-0">
                        <NotificationList
                            notifications={filteredNotifications}
                            onMarkAsRead={markAsRead}
                            onNavigate={onNavigate}
                            userRole={userRole}  // ✅ Pass userRole
                            emptyMessage="No unread notifications"
                            emptyDescription="You're all caught up!"
                        />
                    </TabsContent>

                    <TabsContent value="booking" className="mt-0">
                        <NotificationList
                            notifications={filteredNotifications}
                            onMarkAsRead={markAsRead}
                            onNavigate={onNavigate}
                            userRole={userRole}  // ✅ Pass userRole
                            emptyMessage="No booking notifications"
                            emptyDescription="Booking updates and status changes will appear here"
                        />
                    </TabsContent>

                    <TabsContent value="items" className="mt-0">
                        <NotificationList
                            notifications={filteredNotifications}
                            onMarkAsRead={markAsRead}
                            onNavigate={onNavigate}
                            userRole={userRole}  // ✅ Pass userRole
                            emptyMessage="No item notifications"
                            emptyDescription="Updates about your items will appear here"
                        />
                    </TabsContent>

                    <TabsContent value="reminders" className="mt-0">
                        <NotificationList
                            notifications={filteredNotifications}
                            onMarkAsRead={markAsRead}
                            onNavigate={onNavigate}
                            userRole={userRole}  // ✅ Pass userRole
                            emptyMessage="No reminders"
                            emptyDescription="Important reminders and deadlines will appear here"
                        />
                    </TabsContent>
                </div>
            </Tabs>
        </div>
    );
};

const NotificationList = ({
    notifications,
    onMarkAsRead,
    onNavigate,
    userRole,  // ✅ Add this param
    emptyMessage,
    emptyDescription,
}) => {
    if (notifications.length === 0) {
        return (
            <div className="text-center py-12">
                <Bell className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                    {emptyMessage}
                </h3>
                <p className="text-gray-500">{emptyDescription}</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {notifications.map((notification) => (
                <NotificationItem
                    key={notification.notification_id}
                    notification={notification}
                    onMarkAsRead={onMarkAsRead}
                    onNavigate={onNavigate}
                    userRole={userRole}  // ✅ Pass userRole
                />
            ))}
        </div>
    );
};

export default NotificationPanel;