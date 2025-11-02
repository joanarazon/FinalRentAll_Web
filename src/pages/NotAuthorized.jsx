import React from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useUser } from "@/hooks/useUser";
import { supabase } from "../../supabaseClient"; // Adjust path to your supabase client

export default function NotAuthorized() {
    const navigate = useNavigate();
    const user = useUser();

    // If user is banned, redirect to /banned
    if (
        user &&
        (user.status === "banned" ||
            user.account_status === "banned" ||
            user.is_banned)
    ) {
        return <Navigate to="/banned" replace />;
    }

    const handleLogout = async () => {
        try {
            await supabase.auth.signOut();
            navigate("/"); // Redirect to landing page after logout
        } catch (error) {
            console.error("Error logging out:", error);
            // Even if there's an error, still redirect to landing page
            navigate("/");
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-[#FFFBF2] p-6">
            <h1 className="text-2xl font-semibold mb-2">Not authorized</h1>
            <br />
            
            {/* Support message */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6 max-w-md">
                <p className="text-sm text-yellow-800 text-center">
                    You don't have permission to view this page. <br />
                    <br />
                    If you believe this was a mistake or wish to appeal, please contact our support team at{" "}
                    <span className="font-semibold">rentall@gmail.com</span> with your registered email.
                </p>
            </div>

            {/* Logout Button */}
            <Button 
                onClick={handleLogout}
                className="hover:bg-red-700 text-white"
            >
                Logout
            </Button>
        </div>
    );
}