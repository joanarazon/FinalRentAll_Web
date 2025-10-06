"use client";

import { useMemo, useState } from "react";
import TopMenu from "../components/topMenu";
import ItemCard from "../components/ItemCard";
import { useUser } from "../hooks/useUser";
import { useFavorites } from "../context/FavoritesContext.jsx";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../supabaseClient";
import BookItemModal from "../components/BookItemModal";

export default function Favorites() {
    const user = useUser();
    const [searchTerm, setSearchTerm] = useState("");
    const { favorites, loading, toggleFavorite } = useFavorites();
    const navigate = useNavigate();
    
    // State for booking modal
    const [bookOpen, setBookOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);

    // Copy the same function from Home.tsx
    const getOrCreateConversation = async (currentUserId, otherUserId, itemId, itemTitle) => {
        try {
            // Check if conversation already exists
            const { data: existingConversation, error: checkError } = await supabase
                .from("conversations")
                .select("id")
                .or(
                    `and(user1_id.eq.${currentUserId},user2_id.eq.${otherUserId}),and(user1_id.eq.${otherUserId},user2_id.eq.${currentUserId})`
                )
                .single();

            if (checkError && checkError.code !== "PGRST116") {
                throw checkError;
            }

            if (existingConversation) {
                return existingConversation.id;
            }

            // Create new conversation
            const { data: newConversation, error: createError } = await supabase
                .from("conversations")
                .insert([
                    {
                        user1_id: currentUserId,
                        user2_id: otherUserId,
                        item_id: itemId,
                        last_message: `Interested in: ${itemTitle}`,
                        last_message_at: new Date().toISOString(),
                    },
                ])
                .select()
                .single();

            if (createError) throw createError;
            return newConversation.id;
        } catch (error) {
            console.error("Error in getOrCreateConversation:", error);
            throw error;
        }
    };

    const navigateToChat = (conversationId, otherUserId, itemTitle, itemId) => {
        navigate(`/chat?conversationId=${conversationId}&otherUserId=${otherUserId}&itemId=${itemId}`);
    };

    const handleMessageClick = async (item) => {
        try {
            // Check if conversation exists or create new one
            let conversationId = await getOrCreateConversation(
                user.id,
                item.user_id,
                item.item_id,
                item.title
            );

            // Navigate to chat with conversation details
            navigateToChat(conversationId, item.user_id, item.title, item.item_id);
        } catch (error) {
            console.error("Error starting conversation:", error);
            import("sweetalert2").then(({ default: Swal }) =>
                Swal.fire({
                    icon: "error",
                    title: "Error",
                    text: "Failed to start conversation. Please try again.",
                })
            );
        }
    };

    const handleRentClick = (item) => {
        setSelectedItem(item);
        setBookOpen(true);
    };

    const items = useMemo(() => {
        const term = searchTerm.trim().toLowerCase();
        return (favorites || []).filter((it) => {
            if (!term) return true;
            return (
                (it.title || "").toLowerCase().includes(term) ||
                (it.description || "").toLowerCase().includes(term) ||
                (it.location || "").toLowerCase().includes(term)
            );
        });
    }, [favorites, searchTerm]);

    return (
        <div className="min-h-screen bg-[#FAF5EF]">
            <TopMenu
                activePage="favorites"
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
            />
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FFAB00] to-[#FFAB00]/80 flex items-center justify-center shadow-md">
                        <span className="text-[#1E1E1E] font-bold">❤</span>
                    </div>
                    <h1 className="text-3xl font-bold text-[#1E1E1E]">
                        My Favorites
                    </h1>
                </div>

                {loading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {Array.from({ length: 8 }).map((_, i) => (
                            <div
                                key={i}
                                className="w-full overflow-hidden rounded-xl border border-[#1E1E1E]/10 bg-white shadow-sm"
                            >
                                <Skeleton className="w-full h-64 rounded-t-xl" />
                                <div className="p-5">
                                    <Skeleton className="h-6 w-3/4 mb-3" />
                                    <Skeleton className="h-4 w-full mb-2" />
                                    <Skeleton className="h-4 w-2/3 mb-4" />
                                    <div className="flex justify-between items-center mt-4">
                                        <Skeleton className="h-7 w-28" />
                                        <Skeleton className="h-10 w-28" />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : items.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-[#1E1E1E]/10 p-12 text-center shadow-md">
                        <p className="text-base text-[#1E1E1E]/60 font-medium">
                            No favorites yet.
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {items.map((it) => (
                            <ItemCard
                                key={it.item_id}
                                title={it.title}
                                description={it.description}
                                ratings={undefined}
                                location={it.location}
                                date={new Date(
                                    it.created_at
                                ).toLocaleDateString()}
                                price={String(it.price_per_day)}
                                quantity={it.quantity}
                                imageUrl={
                                    it.main_image_url ||
                                    it.imageUrl ||
                                    it.image_url ||
                                    undefined
                                }
                                isOwner={user?.id === it.user_id}
                                isFavorited={true}
                                onHeartClick={() => toggleFavorite(it)}
                                onRentClick={
                                    user?.id !== it.user_id
                                        ? () => handleRentClick(it)
                                        : undefined
                                }
                                onMessageOwner={
                                    user?.id !== it.user_id
                                        ? () => handleMessageClick(it)
                                        : undefined
                                }
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Add BookItemModal */}
            <BookItemModal
                open={bookOpen}
                onOpenChange={setBookOpen}
                item={selectedItem}
                currentUserId={user?.id}
                onBooked={() => {
                    // You can add any refresh logic here if needed
                    console.log("Item booked successfully");
                }}
            />
        </div>
    );
}