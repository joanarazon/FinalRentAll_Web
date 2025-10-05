import {
    createContext,
    useContext,
    useEffect,
    useState,
    useCallback,
} from "react";
import { supabase } from "../../supabaseClient";
import { useUser } from "../hooks/useUser";

const FavoritesContext = createContext();

export function FavoritesProvider({ children }) {
    const user = useUser();
    const [favorites, setFavorites] = useState([]);
    const [favoritesCount, setFavoritesCount] = useState(0);
    const [loading, setLoading] = useState(false);

    // Fetch favorites from database
    const fetchFavorites = useCallback(async () => {
        if (!user?.id) {
            setFavorites([]);
            setFavoritesCount(0);
            return;
        }

        setLoading(true);
        try {
            const { data, error } = await supabase
                .from("favorites")
                .select(
                    `
                    item_id,
                    items!inner(
                        item_id,
                        user_id,
                        title,
                        description,
                        price_per_day,
                        deposit_fee,
                        location,
                        available,
                        created_at,
                        quantity,
                        main_image_url,
                        category_id
                    )
                `
                )
                .eq("user_id", user.id);

            if (error) throw error;

            const favoriteItems = (data || [])
                .map((fav) => fav.items)
                .filter(Boolean);

            setFavorites(favoriteItems);
            setFavoritesCount(favoriteItems.length);

            console.log("Fetched favorites:", favoriteItems.length, "items");
        } catch (error) {
            console.error("Failed to fetch favorites:", error);
            setFavorites([]);
            setFavoritesCount(0);
        } finally {
            setLoading(false);
        }
    }, [user?.id]);

    // Toggle favorite status with optimistic updates
    const toggleFavorite = useCallback(
        async (item) => {
            if (!user?.id) {
                console.warn("User not authenticated, cannot toggle favorite");
                return;
            }

            console.log(
                "Toggling favorite for item:",
                item.item_id,
                item.title
            );
            console.log("Current favorites count:", favorites.length);

            const exists = favorites.some(
                (fav) => fav.item_id === item.item_id
            );

            console.log("Item exists in favorites:", exists);

            // Optimistically update the UI immediately
            if (exists) {
                // Optimistically remove from favorites
                const newFavorites = favorites.filter(
                    (fav) => fav.item_id !== item.item_id
                );
                setFavorites(newFavorites);
                setFavoritesCount(newFavorites.length);
                console.log(
                    "Optimistically removed from favorites:",
                    item.title
                );
            } else {
                // Optimistically add to favorites
                const newFavorites = [...favorites, item];
                setFavorites(newFavorites);
                setFavoritesCount(newFavorites.length);
                console.log("Optimistically added to favorites:", item.title);
            }

            try {
                if (exists) {
                    // Remove from database
                    console.log("Removing from database...");
                    const { error } = await supabase
                        .from("favorites")
                        .delete()
                        .eq("user_id", user.id)
                        .eq("item_id", item.item_id);

                    if (error) throw error;
                    console.log(
                        "Successfully removed from database:",
                        item.title
                    );
                } else {
                    // Add to database
                    console.log("Adding to database...");
                    const { error } = await supabase.from("favorites").insert({
                        user_id: user.id,
                        item_id: item.item_id,
                    });

                    if (error) throw error;
                    console.log("Successfully added to database:", item.title);
                }
            } catch (error) {
                console.error("Database operation failed, reverting:", error);
                // Revert the optimistic update if database operation fails
                fetchFavorites();
            }
        },
        [user?.id, favorites, fetchFavorites]
    );

    // Check if item is favorited
    const isFavorited = useCallback(
        (itemId) => {
            return favorites.some((fav) => fav.item_id === itemId);
        },
        [favorites]
    );

    // Load favorites on user change
    useEffect(() => {
        fetchFavorites();
    }, [fetchFavorites]);

    // Real-time subscription for favorites changes (as backup to optimistic updates)
    useEffect(() => {
        if (!user?.id) return;

        console.log("Setting up favorites subscription for user:", user.id);

        const favoritesChannel = supabase
            .channel(`favorites_user_${user.id}`)
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "favorites",
                    filter: `user_id=eq.${user.id}`,
                },
                (payload) => {
                    console.log(
                        "Real-time favorites change detected:",
                        payload.eventType
                    );
                    // Small delay to let optimistic updates settle
                    setTimeout(() => {
                        fetchFavorites();
                    }, 100);
                }
            )
            .subscribe();

        return () => {
            console.log("Cleaning up favorites subscription");
            supabase.removeChannel(favoritesChannel);
        };
    }, [user?.id, fetchFavorites]);

    const value = {
        favorites,
        favoritesCount,
        loading,
        toggleFavorite,
        isFavorited,
        fetchFavorites,
    };

    return (
        <FavoritesContext.Provider value={value}>
            {children}
        </FavoritesContext.Provider>
    );
}

export function useFavorites() {
    const context = useContext(FavoritesContext);
    if (context === undefined) {
        throw new Error("useFavorites must be used within a FavoritesProvider");
    }
    return context;
}
