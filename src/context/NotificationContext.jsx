import React, {
    createContext,
    useContext,
    useEffect,
    useState,
    useCallback,
} from "react";
import { supabase } from "../../supabaseClient";
import {
    getUserNotifications,
    getUnreadNotificationCount,
    markNotificationsAsRead,
} from "../lib/notifications";

const NotificationContext = createContext();

export const useNotifications = () => {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error(
            "useNotifications must be used within a NotificationProvider"
        );
    }
    return context;
};

export const NotificationProvider = ({ children }) => {
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState(null);

    // Get current user
    useEffect(() => {
        const getUser = async () => {
            const {
                data: { user },
            } = await supabase.auth.getUser();
            setUser(user);
        };
        getUser();

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((event, session) => {
            setUser(session?.user || null);
        });

        return () => subscription.unsubscribe();
    }, []);

    // Load notifications for the current user
    const loadNotifications = useCallback(async () => {
        if (!user) {
            setNotifications([]);
            setUnreadCount(0);
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            const [notificationsResult, unreadResult] = await Promise.all([
                getUserNotifications(user.id, { limit: 100 }),
                getUnreadNotificationCount(user.id),
            ]);

            if (notificationsResult.success) {
                setNotifications(notificationsResult.data);
            }

            if (unreadResult.success) {
                setUnreadCount(unreadResult.count);
            }
        } catch (error) {
            console.error("Failed to load notifications:", error);
        } finally {
            setLoading(false);
        }
    }, [user]);

    // Load notifications when user changes
    useEffect(() => {
        loadNotifications();
    }, [loadNotifications]);

    // Set up real-time subscription for notifications
    useEffect(() => {
        if (!user) return;

        const subscription = supabase
            .channel("notifications")
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "notifications",
                    filter: `user_id=eq.${user.id}`,
                },
                (payload) => {
                    console.log("Notification update:", payload);

                    if (payload.eventType === "INSERT") {
                        // New notification received
                        const newNotification = payload.new;
                        setNotifications((prev) => [newNotification, ...prev]);
                        setUnreadCount((prev) => prev + 1);

                        // Show browser notification if permission granted
                        if (Notification.permission === "granted") {
                            new Notification(newNotification.title, {
                                body: newNotification.message,
                                icon: "/logo.png",
                                tag: `notification-${newNotification.notification_id}`,
                            });
                        }
                    } else if (payload.eventType === "UPDATE") {
                        // Notification updated (likely marked as read)
                        const updatedNotification = payload.new;
                        setNotifications((prev) =>
                            prev.map((notif) =>
                                notif.notification_id ===
                                updatedNotification.notification_id
                                    ? updatedNotification
                                    : notif
                            )
                        );

                        // Update unread count if read_at changed
                        if (
                            updatedNotification.read_at &&
                            !payload.old.read_at
                        ) {
                            setUnreadCount((prev) => Math.max(0, prev - 1));
                        }
                    } else if (payload.eventType === "DELETE") {
                        // Notification deleted
                        const deletedId = payload.old.notification_id;
                        setNotifications((prev) =>
                            prev.filter(
                                (notif) => notif.notification_id !== deletedId
                            )
                        );

                        // Update unread count if deleted notification was unread
                        if (!payload.old.read_at) {
                            setUnreadCount((prev) => Math.max(0, prev - 1));
                        }
                    }
                }
            )
            .subscribe();

        return () => {
            subscription.unsubscribe();
        };
    }, [user]);

    // Request browser notification permission
    useEffect(() => {
        if ("Notification" in window && Notification.permission === "default") {
            Notification.requestPermission();
        }
    }, []);

    // Mark notifications as read
    const markAsRead = useCallback(
        async (notificationIds) => {
            const result = await markNotificationsAsRead(notificationIds);
            if (result.success) {
                const ids = Array.isArray(notificationIds)
                    ? notificationIds
                    : [notificationIds];
                setNotifications((prev) =>
                    prev.map((notif) =>
                        ids.includes(notif.notification_id)
                            ? { ...notif, read_at: new Date().toISOString() }
                            : notif
                    )
                );

                // Update unread count
                const unreadToMark = notifications.filter(
                    (notif) =>
                        ids.includes(notif.notification_id) && !notif.read_at
                ).length;
                setUnreadCount((prev) => Math.max(0, prev - unreadToMark));
            }
            return result;
        },
        [notifications]
    );

    // Mark all notifications as read
    const markAllAsRead = useCallback(async () => {
        if (!user) return { success: false };

        const { markAllNotificationsAsRead } = await import(
            "../lib/notifications"
        );
        const result = await markAllNotificationsAsRead(user.id);

        if (result.success) {
            setNotifications((prev) =>
                prev.map((notif) => ({
                    ...notif,
                    read_at: notif.read_at || new Date().toISOString(),
                }))
            );
            setUnreadCount(0);
        }
        return result;
    }, [user]);

    // Refresh notifications manually
    const refreshNotifications = useCallback(() => {
        loadNotifications();
    }, [loadNotifications]);

    // Get notifications by type
    const getNotificationsByType = useCallback(
        (type) => {
            return notifications.filter((notif) => notif.type === type);
        },
        [notifications]
    );

    // Get unread notifications
    const getUnreadNotifications = useCallback(() => {
        return notifications.filter((notif) => !notif.read_at);
    }, [notifications]);

    const value = {
        notifications,
        unreadCount,
        loading,
        markAsRead,
        markAllAsRead,
        refreshNotifications,
        getNotificationsByType,
        getUnreadNotifications,
    };

    return (
        <NotificationContext.Provider value={value}>
            {children}
        </NotificationContext.Provider>
    );
};
