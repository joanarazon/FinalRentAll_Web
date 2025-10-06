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
            <p className="text-gray-600 mb-6 text-center max-w-md">
                You don’t have permission to view this page. If you think this
                is a mistake, please contact support or try a different account.
            </p>
            <Button onClick={() => navigate(goBackTarget)}>Go Back</Button>
        </div>
    );
}
