import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useUser } from "../hooks/useUser";
import { Heart, Menu } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function TopMenu({ activePage, favorites = [], searchTerm, setSearchTerm }) {
    const user = useUser();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const navigate = useNavigate();

    const handleInbox = () => {
        navigate('/inbox')
    }

    const handleHome = () => {
        navigate('/home')
    }

    const handleNotification = () => {
        navigate('/notifications')
    }

    const linkClass = (page) =>
        `text-gray-600 hover:text-black ${activePage === page
            ? "text-black font-bold underline underline-offset-4 decoration-2"
            : ""
        }`;

    return (
        <div className="bg-[#FFFBF2] shadow-md px-4 py-3 md:px-6 flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-0">
            {/* Left: Logo + Links */}
            <div className="flex items-center justify-between md:justify-start gap-3 md:gap-6 w-full md:w-auto">
                <h1 className="text-xl font-bold cursor-pointer">RentAll</h1>

                {/* Desktop Links */}
                <div className="hidden md:flex items-center gap-6">
                    <Button variant="link" className={`${linkClass("home")} cursor-pointer`} onClick={handleHome}>Home</Button>
                    <Button
                        variant="link"
                        className={`${linkClass("inbox")} cursor-pointer`}
                        onClick={handleInbox}
                    >
                        Inbox
                    </Button>
                    <Button variant="link" className={`${linkClass("notifications")} cursor-pointer`} onClick={handleNotification}>Notifications</Button>
                </div>

                {/* Mobile menu button */}
                <Button
                    variant="ghost"
                    className="md:hidden"
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                >
                    <Menu className="w-6 h-6" />
                </Button>
            </div>

            {/* Mobile links */}
            {mobileMenuOpen && (
                <div className="flex flex-row gap-2 md:hidden mt-2">
                    <Button variant="link" className={`${linkClass("home")} cursor-pointer`} onClick={handleHome}>Home</Button>
                    <Button
                        variant="link"
                        className={`${linkClass("inbox")} cursor-pointer`}
                        onClick={handleInbox}
                    >
                        Inbox
                    </Button>
                    <Button variant="link" className={`${linkClass("notifications")} cursor-pointer`} onClick={handleNotification}>Notifications</Button>
                </div>
            )}

            {/* Right: Search + Heart + Avatar */}
            <div className="flex items-center gap-3 md:gap-4 w-full md:w-auto mt-2 md:mt-0">
                <input
                    type="text"
                    placeholder="Search..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="flex-1 md:flex-none px-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring focus:border-blue-500"
                />
                <div className="relative">
                    <Button variant="ghost">
                        <Heart className="text-gray-500 w-5 h-5 md:w-6 md:h-6" />
                    </Button>
                    {favorites.length > 0 && (
                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full px-1">
                            {favorites.length}
                        </span>
                    )}
                </div>
                <DropdownMenu>
                    <DropdownMenuTrigger>
                        {user ? (
                            <Avatar className="cursor-pointer">
                                <AvatarImage src={user.face_image_url} alt="Profile" />
                                <AvatarFallback className="cursor-pointer">
                                    {user.first_name?.[0]}{user.last_name?.[0]}
                                </AvatarFallback>
                            </Avatar>
                        ) : (
                            <Avatar>
                                <AvatarFallback>JD</AvatarFallback>
                            </Avatar>
                        )}
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem className="cursor-pointer">Profile</DropdownMenuItem>
                        <DropdownMenuItem className="cursor-pointer">Settings</DropdownMenuItem>
                        <DropdownMenuItem className="cursor-pointer">Logout</DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
    );
}