import React, { useState } from "react";
import TopMenu from "../components/topMenu";
import MailSidebar from "../components/MailSidebar";

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
                            className="flex-1 md:w-1/2 px-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring focus:border-blue-500"
                        />
                    </div>

                    {/* Inbox content */}
                    <main className="flex-1 p-6">
                        {/* Your inbox messages go here */}
                    </main>
                </div>
            </div>
        </div>
    );
}

export default Inbox;