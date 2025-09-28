import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { useUser } from "@/hooks/useUser";
import { useUserContext } from "@/context/UserContext.jsx";
import { useNavigate } from "react-router-dom";
import { useToastApi } from "@/components/ui/toast";
import { supabase } from "../../supabaseClient";

export default function PendingVerification() {
    const user = useUser();
    const { logout } = useUserContext();
    const navigate = useNavigate();
    const toast = useToastApi();
    const [checking, setChecking] = useState(false);
    const [loggingOut, setLoggingOut] = useState(false);

    const checkStatus = async () => {
        if (!user?.id) return;
        try {
            setChecking(true);
            const { data, error } = await supabase
                .from("users")
                .select("role, first_name")
                .eq("id", user.id)
                .maybeSingle();
            if (error) throw error;
            const role = data?.role;
            if (role === "admin")
                return navigate("/adminhome", { replace: true });
            if (role === "user") return navigate("/home", { replace: true });
            toast.info("Still pending verification. Please check back later.");
        } catch (e) {
            toast.error("Could not check status: " + e.message);
        } finally {
            setChecking(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#FFFBF2] p-6">
            <div className="max-w-md w-full bg-white p-6 rounded-xl border border-gray-200 shadow-sm text-center">
                <h1 className="text-2xl font-semibold mb-2">
                    Account Pending Verification
                </h1>
                <p className="text-gray-600 mb-4">
                    Thanks for signing up
                    {user?.first_name ? ", " + user.first_name : ""}. Your
                    account is pending admin review.
                </p>
                <p className="text-gray-600 mb-6">
                    You’ll be able to access the app once verified. This usually
                    takes a short while.
                </p>
                <div className="flex gap-3 justify-center">
                    <Button
                        variant="outline"
                        disabled={loggingOut}
                        onClick={async () => {
                            try {
                                setLoggingOut(true);
                                await logout();
                                navigate("/", { replace: true });
                            } catch (e) {
                                toast.error(
                                    "Logout failed: " + (e?.message || e)
                                );
                            } finally {
                                setLoggingOut(false);
                            }
                        }}
                    >
                        {loggingOut ? "Logging out..." : "Back to Login"}
                    </Button>
                    <Button onClick={checkStatus} disabled={checking}>
                        {checking ? "Checking..." : "Check Status"}
                    </Button>
                </div>
            </div>
        </div>
    );
}
