import React, {
    createContext,
    useContext,
    useEffect,
    useMemo,
    useState,
} from "react";
import { supabase } from "../../supabaseClient";
import { useToastApi } from "@/components/ui/toast";

const UserContext = createContext({
    user: null,
    loading: true,
    logout: async () => {},
    refresh: async () => {},
});

export function UserProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const toast = useToastApi();

    // Centralized, robust logout that also flushes local caches
    const forceLogout = async (message) => {
        try {
            // Best-effort sign out; don't block on errors
            await supabase.auth.signOut();
        } catch (_) {
            // ignore
        } finally {
            try {
                localStorage.removeItem("loggedInUser");
                localStorage.removeItem("supabase.auth.token");
            } catch (_) {
                // ignore
            }
            setUser(null);
            if (message) {
                try {
                    // Avoid SweetAlert2 unknown parameter warning
                    toast.info(message);
                } catch (_) {
                    // ignore toast errors
                }
            }
        }
    };

    const loadProfile = async (authUser) => {
        if (!authUser) return null;
        let profile = null;
        try {
            const { data, error } = await supabase
                .from("users")
                .select("*")
                .eq("id", authUser.id)
                .maybeSingle();
            if (error) {
                throw error;
            }
            // If the row is missing, treat as fatal (flush & require re-onboarding)
            if (!data) {
                const err = new Error("PROFILE_NOT_FOUND");
                err.code = "PROFILE_NOT_FOUND";
                throw err;
            }
            profile = data;
        } catch (err) {
            // Propagate so callers can decide to flush/logout
            throw err;
        }
        const merged = {
            id: authUser.id,
            email: authUser.email,
            ...(profile || {}),
        };
        try {
            localStorage.setItem("loggedInUser", JSON.stringify(merged));
        } catch (_) {
            // ignore quota/storage issues
        }
        return merged;
    };

    const refresh = async () => {
        try {
            const { data: sessionData } = await supabase.auth.getSession();
            const authUser = sessionData?.session?.user || null;
            if (authUser) {
                try {
                    const merged = await loadProfile(authUser);
                    if (merged) setUser(merged);
                } catch (err) {
                    // During onboarding, the users row may not exist yet.
                    if (err?.code === "PROFILE_NOT_FOUND") {
                        console.warn(
                            "Profile not found during refresh; keeping minimal session user and retrying later."
                        );
                        setUser({ id: authUser.id, email: authUser.email });
                        // Retry refresh shortly to pick up the newly inserted profile
                        setTimeout(() => {
                            refresh().catch(() => {});
                        }, 1500);
                    } else {
                        console.warn(
                            "Profile refresh failed, logging out:",
                            err?.message || err
                        );
                        await forceLogout(
                            "Your session expired. Please sign in again."
                        );
                    }
                }
            } else {
                localStorage.removeItem("loggedInUser");
                setUser(null);
            }
        } catch (_) {}
    };

    useEffect(() => {
        let mounted = true;
        const refreshFromSession = async () => {
            try {
                const { data: sessionData } = await supabase.auth.getSession();
                const authUser = sessionData?.session?.user || null;
                if (authUser) {
                    // Keep current user if same id; otherwise refresh
                    if (!user || user.id !== authUser.id || !user.role) {
                        try {
                            const merged = await loadProfile(authUser);
                            if (mounted && merged) setUser(merged);
                        } catch (err) {
                            console.warn(
                                "Initial session load failed, logging out:",
                                err?.message || err
                            );
                            const msg =
                                err?.code === "PROFILE_NOT_FOUND"
                                    ? "Your account was not found. Please sign in again."
                                    : "Your session expired. Please sign in again.";
                            await forceLogout(msg);
                        }
                    }
                } else {
                    localStorage.removeItem("loggedInUser");
                    if (mounted) setUser(null);
                }
            } catch (_) {
                // ignore
            }
        };
        (async () => {
            try {
                setLoading(true);
                // Prefer session to avoid transient null user on hard refresh
                await refreshFromSession();
            } finally {
                if (mounted) setLoading(false);
            }
        })();

        const { data: sub } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
                    const authUser = session?.user;
                    if (authUser) {
                        const minimal = {
                            id: authUser.id,
                            email: authUser.email,
                        };
                        setUser(minimal);
                        // Kick off profile enhancement without blocking guards
                        loadProfile(authUser)
                            .then((merged) => {
                                if (merged) setUser(merged);
                            })
                            .catch(async (err) => {
                                if (err?.code === "PROFILE_NOT_FOUND") {
                                    console.warn(
                                        "Auth change: profile not found (likely onboarding). Keeping minimal user and retrying."
                                    );
                                    // Keep minimal session user and retry later instead of logging out
                                    setUser(minimal);
                                    setTimeout(() => {
                                        refresh().catch(() => {});
                                    }, 1500);
                                } else {
                                    console.warn(
                                        "Auth change profile load failed, logging out:",
                                        err?.message || err
                                    );
                                    await forceLogout(
                                        "Your session expired. Please sign in again."
                                    );
                                }
                            });
                    }
                } else if (event === "SIGNED_OUT") {
                    localStorage.removeItem("loggedInUser");
                    setUser(null);
                }
            }
        );

        const onVisibility = () => {
            if (document.visibilityState === "visible") {
                refreshFromSession();
            }
        };
        document.addEventListener("visibilitychange", onVisibility);

        return () => {
            mounted = false;
            sub.subscription?.unsubscribe?.();
            document.removeEventListener("visibilitychange", onVisibility);
        };
    }, []);

    const logout = forceLogout;

    const value = useMemo(
        () => ({ user, loading, logout, refresh }),
        [user, loading]
    );
    return (
        <UserContext.Provider value={value}>{children}</UserContext.Provider>
    );
}

export function useUserContext() {
    return useContext(UserContext);
}
