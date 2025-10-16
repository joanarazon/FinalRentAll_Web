import React from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useUser } from "@/hooks/useUser";

export default function NotAuthorized() {
    const navigate = useNavigate();
    const user = useUser();
    const goBackTarget =
        user?.role === "admin" ? "/adminhome" : user ? "/home" : "/";

    // If user is banned, redirect to /banned
    if (
        user &&
        (user.status === "banned" ||
            user.account_status === "banned" ||
            user.is_banned)
    ) {
        return <Navigate to="/banned" replace />;
    }

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-[#FFFBF2] p-6">
            <h1 className="text-2xl font-semibold mb-2">Not authorized</h1>
            <br></br>
            {/* <p className="text-gray-600 mb-4 text-center max-w-md">
                You don’t have permission to view this page.
            </p> */}

            {/* Added support message */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6 max-w-md">
                <p className="text-sm text-yellow-800 text-center">
                    You don’t have permission to view this page. <br></br>
                    <br></br>
                    If you believe this was a mistake or wish to appeal, please contact our support team at{" "}
                    <span className="font-semibold">rentall@gmail.com</span> with your registered email.
                </p>
            </div>

            <Button onClick={() => navigate(goBackTarget)}>Go Back</Button>
        </div>
    );
}