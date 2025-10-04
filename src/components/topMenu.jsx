import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useUser } from "../hooks/useUser";
import { Heart, Menu, Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUserContext } from "../context/UserContext.jsx";
import { supabase } from "../../supabaseClient";

export default function TopMenu({
    activePage,
    favorites = [],
    searchTerm,
    setSearchTerm,
}) {
    const user = useUser();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [suggestions, setSuggestions] = useState({ users: [], items: [] });
    const [showSuggest, setShowSuggest] = useState(false);
    const inputRef = useRef(null);
    const [favoritesCount, setFavoritesCount] = useState(0);
    const navigate = useNavigate();
    const { logout } = useUserContext();

    const handleInbox = () => {
        navigate("/inbox");
    };

    const handleHome = () => {
        navigate("/home");
    };

    const handleNotification = () => {
        navigate("/notifications");
    };

    const linkClass = (page) =>
        `text-gray-600 hover:text-black ${
            activePage === page
                ? "text-black font-bold underline underline-offset-4 decoration-2"
                : ""
        }`;

    // Debounced search suggestions (users + items)
    useEffect(() => {
        let ac = new AbortController();
        const term = (searchTerm || "").trim();
        if (!term || term.length < 2) {
            setSuggestions({ users: [], items: [] });
            return;
        }
        const t = setTimeout(async () => {
            try {
                // Users by first/last name
                const usersPromise = supabase
                    .from("users")
                    .select("id, first_name, last_name, profile_pic_url")
                    .or(`first_name.ilike.%${term}%,last_name.ilike.%${term}%`)
                    .limit(5);

                // Items by title/description/location and available/approved
                const itemsPromise = supabase
                    .from("items")
                    .select(
                        "item_id,title,description,location,item_status,available"
                    )
                    .or(
                        `title.ilike.%${term}%,description.ilike.%${term}%,location.ilike.%${term}%`
                    )
                    .eq("available", true)
                    .limit(5);

                const [{ data: uRows }, { data: iRows }] = await Promise.all([
                    usersPromise,
                    itemsPromise,
                ]);
                setSuggestions({ users: uRows || [], items: iRows || [] });
            } catch (_) {
                setSuggestions({ users: [], items: [] });
            }
        }, 200);
        return () => {
            ac.abort();
            clearTimeout(t);
        };
    }, [searchTerm]);

    // Favorites badge count
    useEffect(() => {
        let active = true;
        const load = async () => {
            if (!user?.id) {
                if (active) setFavoritesCount(0);
                return;
            }
            try {
                const { count } = await supabase
                    .from("favorites")
                    .select("id", { count: "exact", head: true })
                    .eq("user_id", user.id);
                if (active) setFavoritesCount(Number(count || 0));
            } catch (_) {
                if (active) setFavoritesCount(0);
            }
        };
        load();
        const channel = supabase
            .channel("favorites_changes")
            .on(
                "postgres_changes",
                { event: "INSERT", schema: "public", table: "favorites" },
                (payload) => {
                    if (payload.new?.user_id === user?.id) {
                        setFavoritesCount((c) => c + 1);
                    }
                }
            )
            .on(
                "postgres_changes",
                { event: "DELETE", schema: "public", table: "favorites" },
                (payload) => {
                    if (payload.old?.user_id === user?.id) {
                        setFavoritesCount((c) => Math.max(0, c - 1));
                    }
                }
            )
            .subscribe();
        return () => {
            active = false;
            try {
                supabase.removeChannel(channel);
            } catch (_) {}
        };
    }, [user?.id]);

    return (
        <div className="bg-[#FFFBF2] shadow-md px-4 py-3 md:px-6 flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-0">
            {/* Left: Logo + Links */}
            <div className="flex items-center justify-between md:justify-start gap-3 md:gap-6 w-full md:w-auto">
                <h1 className="text-xl font-bold cursor-pointer">RentAll</h1>

                {/* Desktop Links */}
                <div className="hidden md:flex items-center gap-6">
                    <Button
                        variant="link"
                        className={`${linkClass("home")} cursor-pointer`}
                        onClick={handleHome}
                    >
                        Home
                    </Button>
                    <Button
                        variant="link"
                        className={`${linkClass("my-bookings")} cursor-pointer`}
                        onClick={() => navigate("/my-bookings")}
                    >
                        My Bookings
                    </Button>
                    <Button
                        variant="link"
                        className={`${linkClass("my-ratings")} cursor-pointer`}
                        onClick={() => navigate("/my-ratings")}
                    >
                        Ratings
                    </Button>
                    <Button
                        variant="link"
                        className={`${linkClass("requests")} cursor-pointer`}
                        onClick={() => navigate("/booking-requests")}
                    >
                        Requests
                    </Button>
                    <Button
                        variant="link"
                        className={`${linkClass("inbox")} cursor-pointer`}
                        onClick={handleInbox}
                    >
                        Inbox
                    </Button>
                    <Button
                        variant="link"
                        className={`${linkClass(
                            "notifications"
                        )} cursor-pointer`}
                        onClick={handleNotification}
                    >
                        Notifications
                    </Button>
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
                    <Button
                        variant="link"
                        className={`${linkClass("home")} cursor-pointer`}
                        onClick={handleHome}
                    >
                        Home
                    </Button>
                    <Button
                        variant="link"
                        className={`${linkClass("my-bookings")} cursor-pointer`}
                        onClick={() => navigate("/my-bookings")}
                    >
                        My Bookings
                    </Button>
                    <Button
                        variant="link"
                        className={`${linkClass("my-ratings")} cursor-pointer`}
                        onClick={() => navigate("/my-ratings")}
                    >
                        Ratings
                    </Button>
                    <Button
                        variant="link"
                        className={`${linkClass("requests")} cursor-pointer`}
                        onClick={() => navigate("/booking-requests")}
                    >
                        Requests
                    </Button>
                    <Button
                        variant="link"
                        className={`${linkClass("inbox")} cursor-pointer`}
                        onClick={handleInbox}
                    >
                        Inbox
                    </Button>
                    <Button
                        variant="link"
                        className={`${linkClass(
                            "notifications"
                        )} cursor-pointer`}
                        onClick={handleNotification}
                    >
                        Notifications
                    </Button>
                </div>
            )}

            {/* Right: Search + Heart + Avatar */}
            <div className="flex items-center gap-3 md:gap-4 w-full md:w-auto mt-2 md:mt-0">
                <div className="relative w-full md:w-auto">
                    <div className="flex items-center gap-2 px-3 py-2 border rounded-lg shadow-sm bg-white focus-within:ring focus-within:border-blue-500">
                        <Search className="w-4 h-4 text-gray-400" />
                        <input
                            ref={inputRef}
                            type="text"
                            placeholder="Search items or users..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onFocus={() => setShowSuggest(true)}
                            onBlur={() =>
                                setTimeout(() => setShowSuggest(false), 150)
                            }
                            className="w-full outline-none"
                        />
                    </div>
                    {showSuggest &&
                        (suggestions.users.length > 0 ||
                            suggestions.items.length > 0) && (
                            <div className="absolute z-40 mt-2 w-full md:w-[28rem] bg-white border border-gray-200 rounded-lg shadow-lg p-2 max-h-80 overflow-auto">
                                {suggestions.users.length > 0 && (
                                    <div className="mb-2">
                                        <div className="px-2 py-1 text-xs uppercase text-gray-400 font-semibold">
                                            Users
                                        </div>
                                        <ul>
                                            {suggestions.users.map((u) => (
                                                <li key={u.id}>
                                                    <button
                                                        className="w-full text-left px-3 py-2 hover:bg-gray-50 rounded-md flex items-center gap-2 cursor-pointer"
                                                        onMouseDown={(e) =>
                                                            e.preventDefault()
                                                        }
                                                        onClick={() =>
                                                            navigate(
                                                                `/profile/${u.id}`
                                                            )
                                                        }
                                                    >
                                                        <div className="h-6 w-6 rounded-full bg-gray-200 overflow-hidden">
                                                            {u.profile_pic_url ? (
                                                                <img
                                                                    src={
                                                                        u.profile_pic_url
                                                                    }
                                                                    alt=""
                                                                    className="h-full w-full object-cover"
                                                                />
                                                            ) : null}
                                                        </div>
                                                        <span className="text-sm text-gray-800">
                                                            {(
                                                                u.first_name ||
                                                                ""
                                                            ).trim()}{" "}
                                                            {(
                                                                u.last_name ||
                                                                ""
                                                            ).trim()}
                                                        </span>
                                                    </button>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                                {suggestions.items.length > 0 && (
                                    <div>
                                        <div className="px-2 py-1 text-xs uppercase text-gray-400 font-semibold">
                                            Items
                                        </div>
                                        <ul>
                                            {suggestions.items.map((it) => (
                                                <li key={it.item_id}>
                                                    <button
                                                        className="w-full text-left px-3 py-2 hover:bg-gray-50 rounded-md cursor-pointer"
                                                        onMouseDown={(e) =>
                                                            e.preventDefault()
                                                        }
                                                        onClick={() =>
                                                            navigate(
                                                                `/home?q=${encodeURIComponent(
                                                                    it.title ||
                                                                        ""
                                                                )}`
                                                            )
                                                        }
                                                    >
                                                        <span className="text-sm text-gray-800">
                                                            {it.title}
                                                        </span>
                                                        {it.location && (
                                                            <span className="text-xs text-gray-500 ml-2">
                                                                • {it.location}
                                                            </span>
                                                        )}
                                                    </button>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        )}
                </div>
                <div className="relative">
                    <Button
                        variant="ghost"
                        onClick={() => navigate("/favorites")}
                    >
                        <Heart className="text-gray-500 w-5 h-5 md:w-6 md:h-6" />
                    </Button>
                    {(favorites?.length ?? favoritesCount) > 0 && (
                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full px-1">
                            {favorites?.length ?? favoritesCount}
                        </span>
                    )}
                </div>
                <DropdownMenu>
                    <DropdownMenuTrigger>
                        {user ? (
                            <Avatar className="cursor-pointer">
                                <AvatarImage
                                    src={
                                        user.profile_pic_url ||
                                        user.face_image_url
                                    }
                                    alt="Profile"
                                />
                                <AvatarFallback className="cursor-pointer">
                                    {user.first_name?.[0]}
                                    {user.last_name?.[0]}
                                </AvatarFallback>
                            </Avatar>
                        ) : (
                            <Avatar>
                                <AvatarFallback>JD</AvatarFallback>
                            </Avatar>
                        )}
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem
                            className="cursor-pointer"
                            onClick={() => navigate("/profile")}
                        >
                            Profile
                        </DropdownMenuItem>
                        <DropdownMenuItem className="cursor-pointer">
                            Settings
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            className="cursor-pointer"
                            onClick={async () => {
                                await logout();
                                navigate("/");
                            }}
                        >
                            Logout
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
    );
}
