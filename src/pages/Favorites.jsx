"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import TopMenu from "../components/topMenu";
import ItemCard from "../components/ItemCard";
import { supabase } from "../../supabaseClient";
import { useUser } from "../hooks/useUser";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

export default function Favorites() {
    const user = useUser();
    const [searchTerm, setSearchTerm] = useState("");
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(false);

    const fetchFavorites = useCallback(async () => {
        if (!user?.id) return;
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from("favorites")
                .select(
                    `item:item_id(
            item_id,user_id,category_id,title,description,price_per_day,deposit_fee,location,available,created_at,quantity,main_image_url
          )`
                )
                .eq("user_id", user.id)
                .order("created_at", { ascending: false });
            if (error) throw error;
            setRows((data || []).map((r) => r.item).filter(Boolean));
        } catch (e) {
            console.error("Load favorites failed:", e.message);
            setRows([]);
        } finally {
            setLoading(false);
        }
    }, [user?.id]);

    useEffect(() => {
        fetchFavorites();
    }, [fetchFavorites]);

    const items = useMemo(() => {
        const term = searchTerm.trim().toLowerCase();
        return (rows || []).filter((it) => {
            if (!term) return true;
            return (
                (it.title || "").toLowerCase().includes(term) ||
                (it.description || "").toLowerCase().includes(term) ||
                (it.location || "").toLowerCase().includes(term)
            );
        });
    }, [rows, searchTerm]);

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
                                imageUrl={it.main_image_url || undefined}
                                isOwner={user?.id === it.user_id}
                                isFavorited={true}
                                onHeartClick={undefined}
                                onRentClick={() =>
                                    (window.location.href = `/profile/${it.user_id}`)
                                }
                                onMessageOwner={() =>
                                    (window.location.href = `/inbox?to=${it.user_id}&item=${it.item_id}`)
                                }
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
