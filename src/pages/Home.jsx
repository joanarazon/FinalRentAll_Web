import React, { useEffect, useState, useCallback } from "react";
import { useUser } from "../hooks/useUser";
import TopMenu from "../components/topMenu";
import ItemCard from "../components/ItemCard";
import AddItemModal from "../components/AddItemModal";
import { supabase } from "../../supabaseClient";
import { Skeleton } from "@/components/ui/skeleton";
import BookItemModal from "../components/BookItemModal";

function Home() {
    const user = useUser();
    const [favorites, setFavorites] = useState([]);
    const [addOpen, setAddOpen] = useState(false);
    const [categories, setCategories] = useState([]); // {category_id, name}
    const [selectedCategoryId, setSelectedCategoryId] = useState("");
    const [searchTerm, setSearchTerm] = useState("");
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [bookOpen, setBookOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);

    const toggleFavorite = (item) => {
        setFavorites((prev) => {
            const exists = prev.some((fav) => fav.title === item.title);
            if (exists) {
                // Remove it
                return prev.filter((fav) => fav.title !== item.title);
            } else {
                // Add it
                return [...prev, item];
            }
        });
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
            let baseSelect =
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

            setItems(filtered);
        } catch (e) {
            console.error("Fetch items failed:", e.message);
        } finally {
            setLoading(false);
        }
    }, [searchTerm, selectedCategoryId]);

    useEffect(() => {
        fetchCategories();
    }, [fetchCategories]);

    useEffect(() => {
        fetchItems();
    }, [fetchItems]);

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
        <div className="bg-[#FFFBF2] min-h-screen">
            <TopMenu
                activePage="home"
                favorites={favorites}
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
            />
            {/* Desktop category menu */}
            <div className="hidden md:flex flex-row gap-4 md:gap-10 mt-10 px-4 md:px-30">
                <p
                    className={`cursor-pointer px-2 py-1 md:px-0 md:py-0 ${
                        selectedCategoryId === "" ? "font-bold underline" : ""
                    }`}
                    onClick={() => setSelectedCategoryId("")}
                >
                    All
                </p>
                {categories.map((cat) => (
                    <p
                        key={cat.category_id}
                        className={`cursor-pointer px-2 py-1 md:px-0 md:py-0 ${
                            selectedCategoryId === String(cat.category_id)
                                ? "font-bold underline"
                                : ""
                        }`}
                        onClick={() =>
                            setSelectedCategoryId(String(cat.category_id))
                        }
                    >
                        {cat.name}
                    </p>
                ))}
            </div>

            {/* Mobile dropdown */}
            <div className="relative block md:hidden mt-10 px-4">
                <select
                    value={selectedCategoryId}
                    onChange={(e) => setSelectedCategoryId(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 pr-8 appearance-none"
                >
                    <option value="">All</option>
                    {categories.map((cat) => (
                        <option key={cat.category_id} value={cat.category_id}>
                            {cat.name}
                        </option>
                    ))}
                </select>

                {/* Custom arrow */}
                <span className="pointer-events-none absolute right-10 top-1/2 -translate-y-1/2 text-gray-500">
                    ▼
                </span>
            </div>

            <div className="flex flex-col md:flex-row gap-4 md:gap-10 mt-10 px-4 md:px-30">
                <h1 className="text-3xl font-semibold px-2 py-1 md:px-0 md:py-0">
                    Items
                </h1>
            </div>

            <div className="flex flex-wrap gap-4 mt-10 px-4 md:px-30">
                {loading && (
                    <>
                        {Array.from({ length: 6 }).map((_, i) => (
                            <div
                                key={i}
                                className="w-full sm:w-64 md:w-80 lg:w-100 overflow-hidden p-0"
                            >
                                <Skeleton className="w-full h-60 mb-2" />
                                <div className="px-1">
                                    <Skeleton className="h-5 w-3/4 mb-2" />
                                    <Skeleton className="h-4 w-full mb-1" />
                                    <Skeleton className="h-4 w-2/3 mb-3" />
                                    <div className="flex justify-between items-center">
                                        <Skeleton className="h-6 w-24" />
                                        <Skeleton className="h-10 w-24" />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </>
                )}
                {!loading && items.length === 0 && (
                    <p className="text-gray-500 text-lg">No Item Found</p>
                )}
                {!loading &&
                    items.length > 0 &&
                    items.map((item, index) => {
                        const isFavorited = favorites.some(
                            (fav) => fav.title === item.title
                        );
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
                                    setSelectedItem(item.raw || item); // prefer raw DB shape if available
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
                className="cursor-pointer fixed bottom-20 left-5 w-16 h-16 bg-[#4F4F4F] text-white text-xl font-bold rounded-full shadow-lg flex items-center justify-center hover:bg-[#303030] transition"
                onClick={() => setAddOpen(true)}
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
