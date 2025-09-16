import React, { useState } from "react";
import TopMenu from "../components/topMenu";
import MailSidebar from "../components/MailSidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

function Inbox({ favorites, searchTerm, setSearchTerm }) {
    const [inboxSearch, setInboxSearch] = useState("");
    const [sidebarOpen, setSidebarOpen] = useState(false); // mobile toggle

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
                    className={`fixed inset-y-0 left-0 z-40 w-64 bg-[#FFFBF2] transform border-r transition-transform duration-300 md:static md:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"
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
                        <p className="font-bold mb-4">Today</p>

                        {/* 3 avatars in a column */}
                        <div className="flex flex-col gap-4">
                            <div className="flex flex-row gap-4 ">
                                <Avatar className="w-16 h-16">
                                    <AvatarImage src="https://i.pravatar.cc/150?img=1" alt="User 1" />
                                    <AvatarFallback>U1</AvatarFallback>
                                </Avatar>
                                <div className="flex flex-col w-full">
                                    <p className="font-semibold">Kleyven Rada</p>
                                    <div className="flex flex-row justify-between">
                                        <p className="text-[#61758A]">Hi, I'm interested in renting your apartment. Could you provide more details about the lease terms and availability?</p>
                                        <p className="text-sm text-gray-500 whitespace-nowrap">10:59 PM</p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-row gap-4 ">
                                <Avatar className="w-16 h-16">
                                    <AvatarImage src="https://i.pravatar.cc/150?img=2" alt="User 1" />
                                    <AvatarFallback>U1</AvatarFallback>
                                </Avatar>
                                <div className="flex flex-col w-full">
                                    <p className="font-semibold">Ivan Emmanuel</p>
                                    <div className="flex flex-row justify-between">
                                        <p className="text-[#61758A]">I'm planning a trip to the city next month and your place looks perfect. Are the dates of July 15th to 22nd available?</p>
                                        <p className="text-sm text-gray-500 whitespace-nowrap">4:45 PM</p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-row gap-4">
                                <Avatar className="w-16 h-16">
                                    <AvatarImage src="https://i.pravatar.cc/150?img=3" alt="User 1" />
                                    <AvatarFallback>U1</AvatarFallback>
                                </Avatar>

                                <div className="flex flex-col w-full">
                                    <p className="font-semibold">Trent Aviola</p>

                                    {/* Message on left, time on right */}
                                    <div className="flex flex-row justify-between">
                                        <p className="text-[#61758A]">
                                            I'm interested in your property. Could you share more photos of the interior and exterior?
                                        </p>
                                        <p className="text-sm text-gray-500 whitespace-nowrap">4:45 PM</p>
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