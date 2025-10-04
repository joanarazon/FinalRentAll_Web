"use client";

import { useEffect, useState, useCallback } from "react";
import { useUser } from "../hooks/useUser";
import TopMenu from "../components/topMenu";
import ItemCard from "../components/ItemCard";
import AddItemModal from "../components/AddItemModal";
import { supabase } from "../../supabaseClient";
import { Skeleton } from "@/components/ui/skeleton";
import BookItemModal from "../components/BookItemModal";

function Home() {
    const user = useUser();
    const [favorites, setFavorites] = useState([]); // array of item_id
    const [addOpen, setAddOpen] = useState(false);
    const [categories, setCategories] = useState([]); // {category_id, name}
    const [selectedCategoryId, setSelectedCategoryId] = useState("");
    const [searchTerm, setSearchTerm] = useState("");
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [bookOpen, setBookOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);
    const [minPrice, setMinPrice] = useState("");
    const [maxPrice, setMaxPrice] = useState("");
    const [minUnits, setMinUnits] = useState("");

    const toggleFavorite = async (item) => {
        if (!user?.id) return;
        const raw = item.raw || {};
        const id = raw.item_id || item.item_id;
        if (!id) return;
        const exists = favorites.includes(id);
        try {
            if (exists) {
                await supabase
                    .from("favorites")
                    .delete()
                    .eq("user_id", user.id)
                    .eq("item_id", id);
                setFavorites((prev) => prev.filter((fid) => fid !== id));
            } else {
                await supabase
                    .from("favorites")
                    .insert({ user_id: user.id, item_id: id });
                setFavorites((prev) => [...prev, id]);
            }
        } catch (_) {
            // ignore
        }
    };

    const fetchCategories = useCallback(async () => {
        const { data, error } = await supabase
            .from("categories")
            .select("category_id,name")
            .order("name");
        if (!error) setCategories(data || []);
    }, []);

    const getImageUrl = async (userId, itemId) => {
        try {
            const dir = `${userId}/${itemId}`;
            const { data: files, error } = await supabase.storage
                .from("Items-photos")
                .list(dir, {
                    limit: 1,
                    sortBy: { column: "name", order: "desc" },
                });
            if (error || !files || files.length === 0) return undefined;
            const file = files[0];
            const fullPath = `${dir}/${file.name}`;
            const { data: pub } = supabase.storage
                .from("Items-photos")
                .getPublicUrl(fullPath);
            return pub?.publicUrl;
        } catch (e) {
            console.warn("image list failed", e.message);
            return undefined;
        }
    };

    const fetchItems = useCallback(async () => {
        setLoading(true);
        try {
            // First attempt: include item_status and filter to approved.
            const baseSelect =
                "item_id,user_id,category_id,title,description,price_per_day,deposit_fee,location,available,created_at,item_status,quantity";
            let query = supabase
                .from("items")
                .select(baseSelect)
                .eq("available", true)
                .eq("item_status", "approved")
                .order("created_at", { ascending: false });
            if (selectedCategoryId) {
                query = query.eq("category_id", Number(selectedCategoryId));
            }
            let { data, error } = await query;

            // Fallback if item_status column does not exist (Postgres undefined column error code 42703)
            if (
                error &&
                (error.code === "42703" || /item_status/i.test(error.message))
            ) {
                console.warn(
                    "item_status column missing; showing all available items."
                );
                let fallbackQuery = supabase
                    .from("items")
                    .select(
                        "item_id,user_id,category_id,title,description,price_per_day,deposit_fee,location,available,created_at,quantity"
                    )
                    .eq("available", true)
                    .order("created_at", { ascending: false });
                if (selectedCategoryId) {
                    fallbackQuery = fallbackQuery.eq(
                        "category_id",
                        Number(selectedCategoryId)
                    );
                }
                const fallback = await fallbackQuery;
                data = fallback.data;
                error = fallback.error;
            }
            if (error) throw error;

            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const y = today.getFullYear();
            const m = String(today.getMonth() + 1).padStart(2, "0");
            const d = String(today.getDate()).padStart(2, "0");
            const todayStr = `${y}-${m}-${d}`;

            const withImages = await Promise.all(
                (data || []).map(async (it) => {
                    // Fetch image and today's overlapping bookings in parallel
                    const imagePromise = getImageUrl(it.user_id, it.item_id);
                    const availabilityPromise = (async () => {
                        try {
                            // Sum of quantities that consume capacity today (align with DB capacity trigger)
                            const consumingStatuses = [
                                "confirmed",
                                "deposit_submitted",
                                "on_the_way",
                                "ongoing",
                                "awaiting_owner_confirmation",
                            ];
                            const departedStatuses = [
                                "on_the_way",
                                "ongoing",
                                "awaiting_owner_confirmation",
                            ];

                            const [
                                { data: consumeRows, error: cErr },
                                { data: departedRows, error: dErr },
                            ] = await Promise.all([
                                supabase
                                    .from("rental_transactions")
                                    .select("quantity")
                                    .eq("item_id", it.item_id)
                                    .in("status", consumingStatuses)
                                    .lte("start_date", todayStr)
                                    .gte("end_date", todayStr),
                                supabase
                                    .from("rental_transactions")
                                    .select("quantity")
                                    .eq("item_id", it.item_id)
                                    .in("status", departedStatuses)
                                    .lte("start_date", todayStr)
                                    .gte("end_date", todayStr),
                            ]);

                            if (cErr) throw cErr;
                            if (dErr) throw dErr;

                            const sum = (rows) =>
                                (rows || []).reduce(
                                    (acc, r) => acc + (Number(r.quantity) || 1),
                                    0
                                );
                            const consumeSum = sum(consumeRows);
                            const departedSum = sum(departedRows);

                            // Base capacity is DB items.quantity plus what is currently out (since DB already subtracted it)
                            const baseCapacity =
                                (Number(it.quantity) || 0) + departedSum;
                            const remaining = Math.max(
                                0,
                                baseCapacity - consumeSum
                            );
                            return remaining;
                        } catch (e) {
                            console.warn(
                                "availability calc failed for item",
                                it.item_id,
                                e?.message || e
                            );
                            // fallback: show DB quantity as-is
                            return Number(it.quantity) || 0;
                        }
                    })();
                    const [imageUrl, remainingUnits] = await Promise.all([
                        imagePromise,
                        availabilityPromise,
                    ]);

                    return {
                        ownerId: it.user_id,
                        title: it.title,
                        description: it.description || "",
                        location: it.location || "",
                        date: new Date(it.created_at).toLocaleDateString(),
                        price: String(it.price_per_day),
                        quantity: remainingUnits,
                        imageUrl: imageUrl,
                        raw: it,
                    };
                })
            );

            const filtered = withImages.filter((item) => {
                if (!searchTerm) return true;
                const needle = searchTerm.toLowerCase();
                return (
                    item.title.toLowerCase().includes(needle) ||
                    item.description.toLowerCase().includes(needle) ||
                    item.location.toLowerCase().includes(needle)
                );
            });

            // Apply additional filters (pricing and units)
            const priceMin = minPrice ? Number.parseFloat(minPrice) : null;
            const priceMax = maxPrice ? Number.parseFloat(maxPrice) : null;
            const unitsMin = minUnits ? Number.parseInt(minUnits, 10) : null;
            const filtered2 = filtered.filter((it) => {
                const p = Number.parseFloat(it.price);
                const q = Number(it.quantity);
                const okMin =
                    priceMin == null || (!Number.isNaN(p) && p >= priceMin);
                const okMax =
                    priceMax == null || (!Number.isNaN(p) && p <= priceMax);
                const okUnits =
                    unitsMin == null || (!Number.isNaN(q) && q >= unitsMin);
                return okMin && okMax && okUnits;
            });

            setItems(filtered2);
        } catch (e) {
            console.error("Fetch items failed:", e.message);
        } finally {
            setLoading(false);
        }
    }, [searchTerm, selectedCategoryId, minPrice, maxPrice, minUnits]);

    useEffect(() => {
        fetchCategories();
    }, [fetchCategories]);

    useEffect(() => {
        fetchItems();
    }, [fetchItems]);

    // Load initial favorites for the current user
    useEffect(() => {
        if (!user?.id) return;
        (async () => {
            const { data, error } = await supabase
                .from("favorites")
                .select("item_id")
                .eq("user_id", user.id);
            if (!error) setFavorites((data || []).map((r) => r.item_id));
        })();
    }, [user?.id]);

    // Pick up ?q= from URL when navigating from suggestions
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const q = params.get("q");
        if (q) setSearchTerm(q);
    }, []);

    // (Optional) If you need a badge count, consider fetching real rows or a separate lightweight count state

    useEffect(() => {
        const channel = supabase
            .channel("items_changes")
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "items" },
                () => {
                    fetchItems();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [fetchItems]);

    useEffect(() => {
        // Refresh items when rentals change, so Home availability stays up-to-date
        const rentalsChannel = supabase
            .channel("rentals_changes")
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "rental_transactions" },
                () => {
                    fetchItems();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(rentalsChannel);
        };
    }, [fetchItems]);

    if (!user) return <p>Loading...</p>;

    return (
        <div className="bg-background min-h-screen">
            <TopMenu
                activePage="home"
                favorites={favorites}
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
            />

            {/* Desktop category menu */}
            <div className="hidden md:flex flex-row gap-8 mt-12 px-8 lg:px-16 xl:px-24 border-b border-border pb-4">
                <button
                    className={`text-base font-medium transition-all duration-200 pb-2 border-b-2 ${
                        selectedCategoryId === ""
                            ? "border-accent text-foreground"
                            : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted"
                    }`}
                    onClick={() => setSelectedCategoryId("")}
                >
                    All Items
                </button>
                {categories.map((cat) => (
                    <button
                        key={cat.category_id}
                        className={`text-base font-medium transition-all duration-200 pb-2 border-b-2 ${
                            selectedCategoryId === String(cat.category_id)
                                ? "border-accent text-foreground"
                                : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted"
                        }`}
                        onClick={() =>
                            setSelectedCategoryId(String(cat.category_id))
                        }
                    >
                        {cat.name}
                    </button>
                ))}
            </div>

            {/* Mobile dropdown */}
            <div className="relative block md:hidden mt-8 px-6">
                <select
                    value={selectedCategoryId}
                    onChange={(e) => setSelectedCategoryId(e.target.value)}
                    className="w-full border-2 border-border rounded-xl px-4 py-3 pr-10 appearance-none bg-card text-foreground font-medium focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-all"
                >
                    <option value="">All Items</option>
                    {categories.map((cat) => (
                        <option key={cat.category_id} value={cat.category_id}>
                            {cat.name}
                        </option>
                    ))}
                </select>

                {/* Custom arrow */}
                <span className="pointer-events-none absolute right-10 top-1/2 -translate-y-1/2 text-muted-foreground">
                    ▼
                </span>
            </div>

            <div className="flex flex-col md:flex-row gap-4 md:gap-10 mt-12 px-6 md:px-8 lg:px-16 xl:px-24">
                <h1 className="text-4xl font-bold text-foreground tracking-tight">
                    Available Items
                </h1>
            </div>

            {/* Filters */}
            <div className="mt-4 px-6 md:px-8 lg:px-16 xl:px-24">
                <div className="bg-white border border-[#1E1E1E]/10 rounded-2xl p-4 flex flex-col md:flex-row gap-4 md:items-center shadow-sm">
                    <div className="flex items-center gap-3">
                        <span className="text-sm text-[#1E1E1E]/60">Price</span>
                        <input
                            type="number"
                            placeholder="Min"
                            value={minPrice}
                            onChange={(e) => setMinPrice(e.target.value)}
                            className="w-28 px-3 py-2 border border-[#1E1E1E]/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FFAB00]"
                        />
                        <span className="text-[#1E1E1E]/30">—</span>
                        <input
                            type="number"
                            placeholder="Max"
                            value={maxPrice}
                            onChange={(e) => setMaxPrice(e.target.value)}
                            className="w-28 px-3 py-2 border border-[#1E1E1E]/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FFAB00]"
                        />
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-sm text-[#1E1E1E]/60">
                            Min units
                        </span>
                        <input
                            type="number"
                            min="0"
                            placeholder="e.g. 2"
                            value={minUnits}
                            onChange={(e) => setMinUnits(e.target.value)}
                            className="w-28 px-3 py-2 border border-[#1E1E1E]/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FFAB00]"
                        />
                    </div>
                    <div className="md:ml-auto">
                        <button
                            className="cursor-pointer px-4 py-2 border border-[#1E1E1E]/20 rounded-lg text-sm hover:bg-[#FAF5EF]"
                            onClick={() => {
                                setMinPrice("");
                                setMaxPrice("");
                                setMinUnits("");
                            }}
                        >
                            Clear Filters
                        </button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mt-8 px-6 md:px-8 lg:px-16 xl:px-24 pb-32">
                {loading && (
                    <>
                        {Array.from({ length: 8 }).map((_, i) => (
                            <div
                                key={i}
                                className="w-full overflow-hidden rounded-xl border border-border bg-card shadow-sm"
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
                    </>
                )}
                {!loading && items.length === 0 && (
                    <div className="col-span-full flex flex-col items-center justify-center py-20">
                        <p className="text-muted-foreground text-xl font-medium">
                            No items found
                        </p>
                        <p className="text-muted-foreground text-sm mt-2">
                            Try adjusting your search or filters
                        </p>
                    </div>
                )}
                {!loading &&
                    items.length > 0 &&
                    items.map((item, index) => {
                        const id = item.raw?.item_id || item.item_id;
                        const isFavorited = id ? favorites.includes(id) : false;
                        return (
                            <ItemCard
                                key={index}
                                title={item.title}
                                description={item.description}
                                ratings={item.ratings}
                                location={item.location}
                                date={item.date}
                                price={item.price}
                                quantity={item.quantity}
                                imageUrl={item.imageUrl}
                                isOwner={user?.id === item.ownerId}
                                isFavorited={isFavorited}
                                onHeartClick={() => toggleFavorite(item)}
                                onRentClick={() => {
                                    setSelectedItem(item.raw || item);
                                    setBookOpen(true);
                                }}
                                onMessageOwner={
                                    user?.id !== item.ownerId
                                        ? () => {
                                              const params =
                                                  new URLSearchParams({
                                                      to: item.ownerId,
                                                      item:
                                                          item.raw?.item_id ||
                                                          item.item_id,
                                                  });
                                              window.location.href = `/inbox?${params.toString()}`;
                                          }
                                        : undefined
                                }
                            />
                        );
                    })}
            </div>

            <button
                className="cursor-pointer fixed bottom-24 right-6 md:bottom-8 md:right-8 w-16 h-16 bg-accent text-accent-foreground text-3xl font-bold rounded-full shadow-lg hover:shadow-xl hover:scale-105 flex items-center justify-center transition-all duration-200 z-50"
                onClick={() => setAddOpen(true)}
                aria-label="Add new item"
            >
                +
            </button>

            <AddItemModal
                open={addOpen}
                onOpenChange={setAddOpen}
                userId={user?.id}
                onCreated={() => {
                    fetchItems();
                }}
            />

            <BookItemModal
                open={bookOpen}
                onOpenChange={setBookOpen}
                item={selectedItem}
                currentUserId={user?.id}
                onBooked={() => fetchItems()}
            />
        </div>
    );
}

export default Home;
