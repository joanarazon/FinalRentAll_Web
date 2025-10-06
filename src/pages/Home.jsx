"use client";

import { useEffect, useState, useCallback } from "react";
import { useUser } from "../hooks/useUser";
import TopMenu from "../components/topMenu";
import ItemCard from "../components/ItemCard";
import AddItemModal from "../components/AddItemModal";
import { supabase } from "../../supabaseClient";
import { Skeleton } from "@/components/ui/skeleton";
import BookItemModal from "../components/BookItemModal";
import { useFavorites } from "../context/FavoritesContext.jsx";
import { ChevronDown } from "lucide-react";

function Home() {
    const user = useUser();
    const [addOpen, setAddOpen] = useState(false);
    const [categories, setCategories] = useState([]); // {category_id, name}
    const [selectedCategoryId, setSelectedCategoryId] = useState("");
    const [searchTerm, setSearchTerm] = useState("");
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [bookOpen, setBookOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);

    const [selectedLocation, setSelectedLocation] = useState("");
    const [priceRange, setPriceRange] = useState([0, 1000]);
    const [maxPrice, setMaxPrice] = useState(1000);

    const { favorites, toggleFavorite, isFavorited } = useFavorites();

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
                    const imagePromise = getImageUrl(it.user_id, it.item_id);
                    const availabilityPromise = (async () => {
                        try {
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
                                    .select(
                                        "quantity, start_date, end_date, status"
                                    )
                                    .eq("item_id", it.item_id)
                                    .in("status", consumingStatuses)
                                    .lte("start_date", todayStr)
                                    .gte("end_date", todayStr),
                                supabase
                                    .from("rental_transactions")
                                    .select(
                                        "quantity, start_date, end_date, status"
                                    )
                                    .eq("item_id", it.item_id)
                                    .in("status", departedStatuses)
                                    .lte("start_date", todayStr)
                                    .gte("end_date", todayStr),
                            ]);

                            if (cErr) throw cErr;
                            if (dErr) throw dErr;

                            // Debug logging for Home page
                            console.log(
                                "Home availability check for item:",
                                it.item_id
                            );
                            console.log("Today date:", todayStr);
                            console.log("Total item quantity:", it.quantity);
                            console.log("Consuming bookings:", consumeRows);
                            console.log("Departed bookings:", departedRows);

                            const sum = (rows) =>
                                (rows || []).reduce(
                                    (acc, r) => acc + (Number(r.quantity) || 1),
                                    0
                                );
                            const consumeSum = sum(consumeRows);
                            const departedSum = sum(departedRows);

                            console.log("Consume sum:", consumeSum);
                            console.log("Departed sum:", departedSum);

                            const baseCapacity =
                                (Number(it.quantity) || 0) + departedSum;
                            const remaining = Math.max(
                                0,
                                baseCapacity - consumeSum
                            );

                            console.log("Base capacity:", baseCapacity);
                            console.log("Home remaining units:", remaining);

                            return remaining;
                        } catch (e) {
                            console.warn(
                                "availability calc failed for item",
                                it.item_id,
                                e?.message || e
                            );
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

            if (filtered.length > 0) {
                const prices = filtered.map((item) => Number(item.price) || 0);
                const calculatedMax = Math.max(...prices, 100);
                setMaxPrice(calculatedMax);
                if (priceRange[1] === 1000 || priceRange[1] > calculatedMax) {
                    setPriceRange([0, calculatedMax]);
                }
            }
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

    const uniqueLocations = [
        ...new Set(items.map((item) => item.location).filter(Boolean)),
    ].sort();

    const filteredItems = items.filter((item) => {
        const itemPrice = Number(item.price) || 0;
        const matchesLocation =
            !selectedLocation || item.location === selectedLocation;
        const matchesPrice =
            itemPrice >= priceRange[0] && itemPrice <= priceRange[1];
        return matchesLocation && matchesPrice;
    });

    const clearFilters = () => {
        setSelectedCategoryId("");
        setSelectedLocation("");
        setPriceRange([0, maxPrice]);
    };

    const hasActiveFilters =
        selectedCategoryId !== "" ||
        selectedLocation !== "" ||
        priceRange[0] !== 0 ||
        priceRange[1] !== maxPrice;

    if (!user) return <p>Loading...</p>;

    return (
        <div className="bg-background min-h-screen">
            <TopMenu
                activePage="home"
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
            />

            {/* Filters - non-sticky to avoid overlap issues */}
            <div className="bg-card border-b border-border shadow-sm">
                <div className="px-4 md:px-8 lg:px-16 xl:px-24 py-4">
                    {/* Desktop: All filters in one row */}
                    <div className="hidden md:flex items-center gap-4 flex-wrap">
                        {/* Category Dropdown */}
                        <div className="relative min-w-[180px]">
                            <select
                                value={selectedCategoryId}
                                onChange={(e) =>
                                    setSelectedCategoryId(e.target.value)
                                }
                                className="w-full appearance-none bg-background border-2 border-border rounded-lg px-4 py-2.5 pr-10 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-[#FFAB00] focus:border-[#FFAB00] transition-all cursor-pointer hover:border-[#FFAB00]/50"
                            >
                                <option value="">All Categories</option>
                                {categories.map((cat) => (
                                    <option
                                        key={cat.category_id}
                                        value={cat.category_id}
                                    >
                                        {cat.name}
                                    </option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                        </div>

                        {/* Location Dropdown */}
                        <div className="relative min-w-[180px]">
                            <select
                                value={selectedLocation}
                                onChange={(e) =>
                                    setSelectedLocation(e.target.value)
                                }
                                className="w-full appearance-none bg-background border-2 border-border rounded-lg px-4 py-2.5 pr-10 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-[#FFAB00] focus:border-[#FFAB00] transition-all cursor-pointer hover:border-[#FFAB00]/50"
                            >
                                <option value="">All Locations</option>
                                {uniqueLocations.map((loc) => (
                                    <option key={loc} value={loc}>
                                        {loc}
                                    </option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                        </div>

                        {/* Price Range */}
                        <div className="flex items-center gap-3 min-w-[320px]">
                            <span className="text-sm font-medium text-foreground whitespace-nowrap">
                                Price:
                            </span>
                            <div className="flex items-center gap-3">
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                                        ₱
                                    </span>
                                    <input
                                        type="number"
                                        min="0"
                                        value={priceRange[0] || ""}
                                        onChange={(e) => {
                                            const value = Math.max(
                                                0,
                                                Number(e.target.value) || 0
                                            );
                                            // Only enforce min <= max if max is set
                                            if (
                                                priceRange[1] > 0 &&
                                                value > priceRange[1]
                                            ) {
                                                setPriceRange([
                                                    priceRange[1],
                                                    priceRange[1],
                                                ]);
                                            } else {
                                                setPriceRange([
                                                    value,
                                                    priceRange[1],
                                                ]);
                                            }
                                        }}
                                        className="w-28 pl-6 pr-2 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-[#FFAB00] focus:border-[#FFAB00] transition-all"
                                        placeholder="Min"
                                    />
                                </div>
                                <span className="text-sm text-muted-foreground font-medium">
                                    to
                                </span>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                                        ₱
                                    </span>
                                    <input
                                        type="number"
                                        min={priceRange[0]}
                                        value={priceRange[1] || ""}
                                        onChange={(e) => {
                                            const value = Math.max(
                                                priceRange[0],
                                                Number(e.target.value) || 0
                                            );
                                            setPriceRange([
                                                priceRange[0],
                                                value,
                                            ]);
                                        }}
                                        className="w-28 pl-6 pr-2 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-[#FFAB00] focus:border-[#FFAB00] transition-all"
                                        placeholder="Max"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Clear Filters Button */}
                        {hasActiveFilters && (
                            <button
                                onClick={clearFilters}
                                className="ml-auto px-4 py-2 text-sm font-medium text-[#FFAB00] hover:text-[#FF9800] transition-colors"
                            >
                                Clear All
                            </button>
                        )}
                    </div>

                    {/* Mobile: Stacked filters */}
                    <div className="flex md:hidden flex-col gap-3">
                        {/* Category Dropdown */}
                        <div className="relative">
                            <select
                                value={selectedCategoryId}
                                onChange={(e) =>
                                    setSelectedCategoryId(e.target.value)
                                }
                                className="w-full appearance-none bg-background border-2 border-border rounded-lg px-4 py-3 pr-10 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-[#FFAB00] focus:border-[#FFAB00] transition-all"
                            >
                                <option value="">All Categories</option>
                                {categories.map((cat) => (
                                    <option
                                        key={cat.category_id}
                                        value={cat.category_id}
                                    >
                                        {cat.name}
                                    </option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                        </div>
                        {/* Location Dropdown */}
                        <div className="relative">
                            <select
                                value={selectedLocation}
                                onChange={(e) =>
                                    setSelectedLocation(e.target.value)
                                }
                                className="w-full appearance-none bg-background border-2 border-border rounded-lg px-4 py-3 pr-10 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-[#FFAB00] focus:border-[#FFAB00] transition-all"
                            >
                                <option value="">All Locations</option>
                                {uniqueLocations.map((loc) => (
                                    <option key={loc} value={loc}>
                                        {loc}
                                    </option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                        </div>
                        {/* Price Range */}
                        <div className="bg-background border-2 border-border rounded-lg px-4 py-4">
                            <div className="flex items-center justify-between mb-4">
                                <span className="text-sm font-medium text-foreground">
                                    Price Range
                                </span>
                                <span className="text-xs text-muted-foreground font-medium px-2 py-1 bg-muted rounded">
                                    ₱{priceRange[0]} - ₱{priceRange[1]}
                                </span>
                            </div>

                            {/* Input Fields */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-muted-foreground mb-2">
                                        Minimum Price
                                    </label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                                            ₱
                                        </span>
                                        <input
                                            type="number"
                                            min="0"
                                            value={priceRange[0] || ""}
                                            onChange={(e) => {
                                                const value = Math.max(
                                                    0,
                                                    Number(e.target.value) || 0
                                                );
                                                // Only enforce min <= max if max is set
                                                if (
                                                    priceRange[1] > 0 &&
                                                    value > priceRange[1]
                                                ) {
                                                    setPriceRange([
                                                        priceRange[1],
                                                        priceRange[1],
                                                    ]);
                                                } else {
                                                    setPriceRange([
                                                        value,
                                                        priceRange[1],
                                                    ]);
                                                }
                                            }}
                                            className="w-full pl-7 pr-3 py-3 text-sm bg-white border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FFAB00] focus:border-[#FFAB00] transition-all"
                                            placeholder="0"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-muted-foreground mb-2">
                                        Maximum Price
                                    </label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                                            ₱
                                        </span>
                                        <input
                                            type="number"
                                            min={priceRange[0]}
                                            value={priceRange[1] || ""}
                                            onChange={(e) => {
                                                const value = Math.max(
                                                    priceRange[0],
                                                    Number(e.target.value) || 0
                                                );
                                                setPriceRange([
                                                    priceRange[0],
                                                    value,
                                                ]);
                                            }}
                                            className="w-full pl-7 pr-3 py-3 text-sm bg-white border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FFAB00] focus:border-[#FFAB00] transition-all"
                                            placeholder="Any amount"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>{" "}
                        {/* Clear Filters Button */}
                        {hasActiveFilters && (
                            <button
                                onClick={clearFilters}
                                className="w-full py-2 text-sm font-medium text-[#FFAB00] hover:text-[#FF9800] transition-colors"
                            >
                                Clear All Filters
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="px-4 md:px-8 lg:px-16 xl:px-24 mt-8">
                <div className="flex items-center justify-between mb-6">
                    <h1 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight">
                        Available Items
                    </h1>
                    <span className="text-sm text-muted-foreground">
                        {filteredItems.length}{" "}
                        {filteredItems.length === 1 ? "item" : "items"}
                    </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-32">
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
                    {!loading && filteredItems.length === 0 && (
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
                        filteredItems.length > 0 &&
                        filteredItems.map((item, index) => {
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
                                    isFavorited={isFavorited(item.raw?.item_id)}
                                    onHeartClick={() =>
                                        toggleFavorite(item.raw || item)
                                    }
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
                                                              item.raw
                                                                  ?.item_id ||
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
            </div>

            <button
                className="cursor-pointer fixed bottom-24 right-6 md:bottom-8 md:right-8 w-16 h-16 bg-[#FFAB00] hover:bg-[#FF9800] text-white text-3xl font-bold rounded-full shadow-lg hover:shadow-xl hover:scale-105 flex items-center justify-center transition-all duration-200 z-50"
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
