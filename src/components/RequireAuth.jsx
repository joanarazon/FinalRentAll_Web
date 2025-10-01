import React, { useEffect, useRef } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useUserContext } from "../context/UserContext.jsx";
// import Loading from "./Loading.jsx";
import { useToastApi } from "@/components/ui/toast";

export default function RequireAuth({ children }) {
    const { user, loading } = useUserContext();
    const location = useLocation();
    const toast = useToastApi();
    const notifiedRef = useRef(false);
    useEffect(() => {
        if (!loading && !user && !notifiedRef.current) {
            notifiedRef.current = true;
            toast.info("Please log in to continue");
        }
    }, [loading, user, toast]);

    // if (loading) return <Loading />;

    if (!user) {
        return <Navigate to="/" replace state={{ from: location }} />;
    }
    return children;
}
