import React from "react";
import { useNavigate } from "react-router-dom";
import { Bell } from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { useNotifications } from "../context/NotificationContext";
import NotificationPanel from "./NotificationPanel";

const NotificationDropdown = () => {
    const navigate = useNavigate();
    const { unreadCount } = useNotifications();

    const handleNavigate = (path) => {
        navigate(path);
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="relative">
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                        <Badge
                            variant="destructive"
                            className="absolute -top-1 -right-1 text-xs min-w-[1.25rem] h-5 px-1"
                        >
                            {unreadCount > 99 ? "99+" : unreadCount}
                        </Badge>
                    )}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-96 p-0">
                <NotificationPanel onNavigate={handleNavigate} compact={true} />
            </DropdownMenuContent>
        </DropdownMenu>
    );
};

export default NotificationDropdown;
