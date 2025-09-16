import React from "react";
import TopMenu from "../components/topMenu";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

function Notification({ favorites, searchTerm, setSearchTerm }) {
    return (
        <>
            <div className='bg-[#FFFBF2] min-h-screen'>
                <TopMenu
                    activePage="notifications"
                    favorites={favorites}
                    searchTerm={searchTerm}
                    setSearchTerm={setSearchTerm}
                />
                <div className="px-4 md:px-30 mt-10">
                    <p className="font-bold text-3xl mb-5">Notifications</p>
                    <p className="text-[#6B7582] mb-10">
                        Stay up to date on your trips and messages
                    </p>

                    {/* Booking Confirmation */}
                    <Card className="mb-2 shadow-sm">
                        <CardHeader>
                            <CardTitle className="font-semibold">Booking Confirmation</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-[#6B7582]">
                                Your booking for the Cozy Cabin in the Woods has been confirmed.
                            </p>
                        </CardContent>
                    </Card>

                    {/* New Message */}
                    <Card className="mb-2 shadow-sm">
                        <CardHeader>
                            <CardTitle className="font-semibold">New Message</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-[#6B7582]">
                                A new message from Alex regarding your stay at the Lakeside Villa.
                            </p>
                        </CardContent>
                    </Card>

                    {/* System Alert */}
                    <Card className="mb-2 shadow-sm">
                        <CardHeader>
                            <CardTitle className="font-semibold">System Alert</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-[#6B7582]">
                                Important updates regarding your upcoming stay at the Beach House.
                            </p>
                        </CardContent>
                    </Card>

                    {/* Another Booking Confirmation */}
                    <Card className="mb-2 shadow-sm">
                        <CardHeader>
                            <CardTitle className="font-semibold">Booking Confirmation</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-[#6B7582]">
                                Your booking for the Cozy Cabin in the Woods has been confirmed.
                            </p>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </>
    );
}

export default Notification;