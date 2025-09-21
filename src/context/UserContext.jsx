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
    logout: async () => {},
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

    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                setLoading(true);
                // Prefer session to avoid transient null user on hard refresh
                const { data: sessionData } = await supabase.auth.getSession();
                const authUser = sessionData?.session?.user || null;
                if (authUser) {
                    const minimal = { id: authUser.id, email: authUser.email };
                    if (mounted) setUser(minimal);
                    // Enhance with profile and wait so role is known before clearing loading
                    const merged = await loadProfile(authUser);
                    if (mounted && merged) setUser(merged);
                } else {
                    // Fallback to localStorage compatibility
                    const stored = localStorage.getItem("loggedInUser");
                    if (stored && mounted) setUser(JSON.parse(stored));
                }
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

        return () => {
            mounted = false;
            sub.subscription?.unsubscribe?.();
        };
    }, []);

    const logout = async () => {
        await supabase.auth.signOut();
        localStorage.removeItem("loggedInUser");
        setUser(null);
    };

    const value = useMemo(() => ({ user, loading, logout }), [user, loading]);
    return (
        <UserContext.Provider value={value}>{children}</UserContext.Provider>
    );
}

export function useUserContext() {
    return useContext(UserContext);
}
