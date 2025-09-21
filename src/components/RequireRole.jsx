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

    const role = user?.role;
    const needsRole = allow.length > 0;
    // If we have a user but role not loaded yet and we need a role, keep loading
    const waitingOnRole = !!user && needsRole && typeof role === "undefined";
    const unauthorized =
        !user || (needsRole && !waitingOnRole && !allow.includes(role));

    useEffect(() => {
        if (!loading && unauthorized && !notifiedRef.current) {
            notifiedRef.current = true;
            toast.info("You need additional permissions to access this page");
        }
    }, [loading, unauthorized, toast]);

    if (loading || waitingOnRole) return <Loading />;
    if (unauthorized) {
        return <Navigate to={to} replace state={{ from: location }} />;
    }
    return children;
}
