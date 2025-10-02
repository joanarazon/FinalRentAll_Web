import React, {
    createContext,
    useContext,
    useEffect,
    useMemo,
    useState,
} from "react";
import { supabase } from "../../supabaseClient";

const UserContext = createContext({
    user: null,
    loading: true,
    logout: async () => { },
    refresh: async () => { },
});

export function UserProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const loadProfile = async (authUser) => {
        if (!authUser) return null;
        let profile = null;
        try {
            const { data, error } = await supabase
                .from("users")
                .select("*")
                .eq("id", authUser.id)
                .maybeSingle();
            if (!error) profile = data || null;
        } catch (_) {
            // ignore; will fallback to minimal user
        }
        const merged = {
            id: authUser.id,
            email: authUser.email,
            ...(profile || {}),
        };
        localStorage.setItem("loggedInUser", JSON.stringify(merged));
        return merged;
    };

    const refresh = async () => {
        try {
            const { data: sessionData } = await supabase.auth.getSession();
            const authUser = sessionData?.session?.user || null;
            if (authUser) {
                const merged = await loadProfile(authUser);
                if (merged) setUser(merged);
            } else {
                localStorage.removeItem("loggedInUser");
                setUser(null);
            }
        } catch (_) { }
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
                        const merged = await loadProfile(authUser);
                        if (mounted && merged) setUser(merged);
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
                        loadProfile(authUser).then((merged) => {
                            if (merged) setUser(merged);
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

    const logout = async () => {
        try {
            const { error } = await supabase.auth.signOut({ scope: "local" });
            if (error) throw error;
        } catch (err) {
            console.warn("Supabase logout error (ignored):", err.message);
        } finally {
            // Clear local state anyway
            setUser(null);
            localStorage.removeItem("supabase.auth.token"); // optional, clear manually
        }
    };


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
