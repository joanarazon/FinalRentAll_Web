import React, { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import TopMenu from "../components/topMenu";
import MailSidebar from "../components/MailSidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "../../supabaseClient";
import { Skeleton } from "@/components/ui/skeleton";

function Inbox({ favorites, searchTerm, setSearchTerm }) {
    const [inboxSearch, setInboxSearch] = useState("");
    const [sidebarOpen, setSidebarOpen] = useState(false); // mobile toggle
    const location = useLocation();
    const [toUser, setToUser] = useState(null); // receiver profile
    const [item, setItem] = useState(null); // item context if provided
    const [loadingHeader, setLoadingHeader] = useState(false);

    const params = useMemo(
        () => new URLSearchParams(location.search),
        [location.search]
    );
    const toId = params.get("to");
    const itemId = params.get("item");

    useEffect(() => {
        let mounted = true;
        (async () => {
            if (!toId) {
                setToUser(null);
                return;
            }
            setLoadingHeader(true);
            const { data, error } = await supabase
                .from("users")
                .select("id,first_name,last_name,phone,created_at")
                .eq("id", toId)
                .single();
            if (!mounted) return;
            setToUser(error ? null : data);
            setLoadingHeader(false);
        })();
        return () => {
            mounted = false;
        };
    }, [toId]);

    useEffect(() => {
        let mounted = true;
        (async () => {
            if (!itemId) {
                setItem(null);
                return;
            }
            setLoadingHeader(true);
            const { data, error } = await supabase
                .from("items")
                .select("item_id,title,price_per_day,deposit_fee")
                .eq("item_id", itemId)
                .single();
            if (!mounted) return;
            setItem(error ? null : data);
            setLoadingHeader(false);
        })();
        return () => {
            mounted = false;
        };
    }, [itemId]);

    return (
        <div className="bg-[#FFFBF2] min-h-screen flex flex-col">
            <TopMenu
                activePage="inbox"
                favorites={favorites}
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
            />

            {/* Container for sidebar + main content */}
            <div className="flex flex-1 relative">
                {/* Sidebar */}
                <div
                    className={`fixed inset-y-0 left-0 z-40 w-64 bg-[#FFFBF2] transform border-r transition-transform duration-300 md:static md:translate-x-0 ${
                        sidebarOpen ? "translate-x-0" : "-translate-x-full"
                    }`}
                >
                    <MailSidebar activePage="inbox" />
                </div>

                {/* Overlay for mobile */}
                {sidebarOpen && (
                    <div
                        className="fixed inset-0 bg-black bg-opacity-10 z-30 md:hidden"
                        onClick={() => setSidebarOpen(false)}
                    />
                )}

                {/* Main content */}
                <div className="flex-1 flex flex-col">
                    {/* Header row with toggle + search */}
                    <div className="flex items-center gap-3 p-4 border-b">
                        {/* Small square toggle button for mobile */}
                        <button
                            className="md:hidden w-10 h-10 bg-white border rounded shadow flex items-center justify-center"
                            onClick={() => setSidebarOpen(true)}
                        >
                            ☰
                        </button>

                        {/* Search bar */}
                        <input
                            type="text"
                            placeholder="Search inbox"
                            value={inboxSearch}
                            onChange={(e) => setInboxSearch(e.target.value)}
                            className="md:w-1/2 px-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring focus:border-blue-500"
                        />
                    </div>

                    {/* Inbox content */}
                    <main className="flex-1 p-6">
                        {loadingHeader ? (
                            <div className="mb-6 p-4 bg-white border rounded">
                                <Skeleton className="h-5 w-48 mb-2" />
                                <Skeleton className="h-4 w-64" />
                            </div>
                        ) : toUser ? (
                            <div className="mb-6 p-4 bg-white border rounded">
                                <p className="font-semibold">
                                    Chat with {toUser.first_name || ""}{" "}
                                    {toUser.last_name || ""}
                                </p>
                                {item && (
                                    <p className="text-sm text-gray-600">
                                        About item: {item.title}
                                    </p>
                                )}
                            </div>
                        ) : null}
                        <p className="font-bold mb-4">Today</p>

                        {/* 3 avatars in a column */}
                        <div className="flex flex-col gap-4">
                            <div className="flex flex-row gap-4 ">
                                <Avatar className="w-16 h-16">
                                    <AvatarImage
                                        src="https://i.pravatar.cc/150?img=1"
                                        alt="User 1"
                                    />
                                    <AvatarFallback>U1</AvatarFallback>
                                </Avatar>
                                <div className="flex flex-col w-full">
                                    <p className="font-semibold">
                                        Kleyven Rada
                                    </p>
                                    <div className="flex flex-row justify-between">
                                        <p className="text-[#61758A]">
                                            Hi, I'm interested in renting your
                                            apartment. Could you provide more
                                            details about the lease terms and
                                            availability?
                                        </p>
                                        <p className="text-sm text-gray-500 whitespace-nowrap">
                                            10:59 PM
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-row gap-4 ">
                                <Avatar className="w-16 h-16">
                                    <AvatarImage
                                        src="https://i.pravatar.cc/150?img=2"
                                        alt="User 1"
                                    />
                                    <AvatarFallback>U1</AvatarFallback>
                                </Avatar>
                                <div className="flex flex-col w-full">
                                    <p className="font-semibold">
                                        Ivan Emmanuel
                                    </p>
                                    <div className="flex flex-row justify-between">
                                        <p className="text-[#61758A]">
                                            I'm planning a trip to the city next
                                            month and your place looks perfect.
                                            Are the dates of July 15th to 22nd
                                            available?
                                        </p>
                                        <p className="text-sm text-gray-500 whitespace-nowrap">
                                            4:45 PM
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-row gap-4">
                                <Avatar className="w-16 h-16">
                                    <AvatarImage
                                        src="https://i.pravatar.cc/150?img=3"
                                        alt="User 1"
                                    />
                                    <AvatarFallback>U1</AvatarFallback>
                                </Avatar>

                                <div className="flex flex-col w-full">
                                    <p className="font-semibold">
                                        Trent Aviola
                                    </p>

                                    {/* Message on left, time on right */}
                                    <div className="flex flex-row justify-between">
                                        <p className="text-[#61758A]">
                                            I'm interested in your property.
                                            Could you share more photos of the
                                            interior and exterior?
                                        </p>
                                        <p className="text-sm text-gray-500 whitespace-nowrap">
                                            4:45 PM
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </main>
                </div>
            </div>
        </div>
    );
}

export default Inbox;
