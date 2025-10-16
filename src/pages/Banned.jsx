import React from "react";
import { useNavigate } from "react-router-dom";
import { useUserContext } from "../context/UserContext.jsx";
import { Button } from "@/components/ui/button";

export default function Banned() {
    const { logout } = useUserContext();
    const navigate = useNavigate();

    const handleLogout = async () => {
        await logout("You have been logged out.");
        navigate("/", { replace: true });
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-red-50">
            <div className="bg-white p-8 rounded shadow-md max-w-md w-full text-center">
                <h1 className="text-2xl font-bold text-red-700 mb-2">
                    Account Banned
                </h1>
                <p className="text-center">
                    You don't have permission to view this page. <br />
                    <br />
                    If you believe this was a mistake or wish to appeal, please contact our support team at{" "}
                    <span className="font-semibold">rentall@gmail.com</span> with your registered email.
                </p>
                <br/>
                <Button
                    onClick={handleLogout}
                    className="bg-red-600 text-white hover:bg-red-700 w-full"
                >
                    Logout
                </Button>
            </div>
        </div>
    );
}
