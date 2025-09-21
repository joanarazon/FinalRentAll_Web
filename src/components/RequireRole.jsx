import React, { useEffect, useRef } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useUserContext } from "../context/UserContext.jsx";
import Loading from "./Loading.jsx";
import { useToastApi } from "@/components/ui/toast";

export default function RequireRole({
    allow = [],
    children,
    to = "/not-authorized",
}) {
    const { user, loading } = useUserContext();
    const location = useLocation();
    const toast = useToastApi();
    const notifiedRef = useRef(false);

    if (loading) return <Loading />;

    useEffect(() => {
        const role = user?.role;
        const unauthorized =
            !user || (allow.length > 0 && !allow.includes(role));
        if (unauthorized && !notifiedRef.current) {
            notifiedRef.current = true;
            toast.info("You need additional permissions to access this page");
        }
    }, [user, allow, toast]);

    const role = user?.role;
    if (!user || (allow.length > 0 && !allow.includes(role))) {
        return <Navigate to={to} replace state={{ from: location }} />;
    }
    return children;
}
