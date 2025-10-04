"use client";

import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import TopMenu from "@/components/topMenu";
import { useUser } from "@/hooks/useUser";
import { supabase } from "../../supabaseClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToastApi } from "@/components/ui/toast";
import { Separator } from "@/components/ui/separator";
import Loading from "@/components/Loading";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    getExistingLessorReview,
    saveLessorReview,
    getExistingItemReview,
    saveItemReview,
    getExistingLessorReviewForLessor,
} from "@/lib/reviews";
import ReportDialog from "@/components/ReportDialog";
import { Badge } from "@/components/ui/badge";
import {
    Clock,
    Calendar,
    Package,
    User,
    PhilippinePeso,
    ChevronRight,
} from "lucide-react";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { BookingSteps, ProgressLegend } from "@/components/shared/BookingSteps";
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

const PROOF_BUCKET = "proof-of-deposit";

// Module-scope detector that supports both ID and category-name fallback.
function isAccommodationAny(catId, categoriesList = []) {
    if (catId == null) return false;
    const envRaw = (
        import.meta?.env?.VITE_ACCOMMODATION_CATEGORY_IDS ||
        import.meta?.env?.VITE_ACCOMMODATION_CATEGORY_ID ||
        ""
    ).toString();
    const envIds = envRaw
        .split(",")
        .map((s) => Number(String(s).trim()))
        .filter((n) => !Number.isNaN(n));
    const candidates = envIds.length ? envIds : [11];
    if (candidates.includes(Number(catId))) return true;
    const cat = (categoriesList || []).find(
        (c) => String(c.category_id) === String(catId)
    );
    if (cat && /accom/i.test(cat.name || "")) return true;
    return false;
}

const BOOKING_TABS = [
    { key: "pending", label: "Pending", tip: null },
    {
        key: "awaitingDeposit",
        label: "Confirmed",
        tip: "Upload your deposit proof to proceed with the booking.",
    },
    { key: "awaitingOwnerConfirmDeposit", label: "Deposit", tip: null },
    { key: "onTheWay", label: "On the way", tip: null },
    { key: "ongoing", label: "Ongoing", tip: null },
    { key: "awaitingOwnerConfirmReturn", label: "Returned", tip: null },
    { key: "completed", label: "Completed", tip: null },
];

export default function MyBookings() {
    const user = useUser();
    const [loading, setLoading] = useState(true);
    const [rows, setRows] = useState([]);
    const [search, setSearch] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("");
    const [categories, setCategories] = useState([]);
    const [activeTab, setActiveTab] = useState("pending");
    const toast = useToastApi();
    const navigate = useNavigate();

    // Determine if a given category_id belongs to accommodation
    const isAccommodation = (catId) => {
        if (catId == null) return false;
        // Allow one or many IDs via env; fallback to [11]
        const envRaw = (
            import.meta?.env?.VITE_ACCOMMODATION_CATEGORY_IDS ||
            import.meta?.env?.VITE_ACCOMMODATION_CATEGORY_ID ||
            ""
        ).toString();
        const envIds = envRaw
            .split(",")
            .map((s) => Number(String(s).trim()))
            .filter((n) => !Number.isNaN(n));
        const candidates = envIds.length ? envIds : [11];
        if (candidates.includes(Number(catId))) return true;
        // Fallback by category name if we have categories loaded
        const cat = categories.find(
            (c) => String(c.category_id) === String(catId)
        );
        if (cat && /accom/i.test(cat.name || "")) return true;
        return false;
    };

    useEffect(() => {
        if (!user?.id) return;
        (async () => {
            try {
                setLoading(true);
                const { data, error } = await supabase
                    .from("rental_transactions")
                    .select(
                        `rental_id,item_id,start_date,end_date,total_cost,status,quantity,proof_of_deposit_url,owner_confirmed_at,
             renter:renter_id ( first_name, last_name ),
             items (
               title,
               main_image_url,
               user_id,
               category_id,
               owner:users ( first_name, last_name )
             )`
                    )
                    .eq("renter_id", user.id)
                    .order("created_at", { ascending: false });
                if (error) throw error;
                setRows(data || []);
                try {
                    const { data: cats } = await supabase
                        .from("categories")
                        .select("category_id,name")
                        .order("name", { ascending: true });
                    setCategories(cats || []);
                } catch {
                    /* ignore */
                }
            } finally {
                setLoading(false);
            }
        })();
    }, [user?.id]);

    const grouped = useMemo(() => {
        const by = {
            pending: [],
            awaitingDeposit: [],
            awaitingOwnerConfirmDeposit: [],
            onTheWay: [],
            ongoing: [],
            awaitingOwnerConfirmReturn: [],
            completed: [],
            expired: [],
            cancelled: [],
        };
        for (const r of rows) {
            const st = String(r.status || "");
            if (st === "completed") by.completed.push(r);
            else if (st === "expired") by.expired.push(r);
            else if (st === "cancelled" || st === "rejected")
                by.cancelled.push(r);
            else if (st === "pending") by.pending.push(r);
            else if (st === "confirmed") by.awaitingDeposit.push(r);
            else if (st === "deposit_submitted")
                by.awaitingOwnerConfirmDeposit.push(r);
            else if (st === "on_the_way") by.onTheWay.push(r);
            else if (st === "ongoing") by.ongoing.push(r);
            else if (st === "awaiting_owner_confirmation")
                by.awaitingOwnerConfirmReturn.push(r);
        }
        const term = search.trim().toLowerCase();
        const activeCategory = (categoryFilter || "").trim();
        const filter = (arr) =>
            arr.filter((r) => {
                const titleOk = term
                    ? r.items?.title?.toLowerCase().includes(term)
                    : true;
                const catOk = activeCategory
                    ? String(r.items?.category_id || "") === activeCategory
                    : true;
                return titleOk && catOk;
            });
        return {
            pending: filter(by.pending),
            awaitingDeposit: filter(by.awaitingDeposit),
            awaitingOwnerConfirmDeposit: filter(by.awaitingOwnerConfirmDeposit),
            onTheWay: filter(by.onTheWay),
            ongoing: filter(by.ongoing),
            awaitingOwnerConfirmReturn: filter(by.awaitingOwnerConfirmReturn),
            completed: filter(by.completed),
            expired: filter(by.expired),
            cancelled: filter(by.cancelled),
        };
    }, [rows, search, categoryFilter]);

    const refetchBookings = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from("rental_transactions")
                .select(
                    `rental_id,item_id,start_date,end_date,total_cost,status,quantity,proof_of_deposit_url,owner_confirmed_at,
             renter:renter_id ( first_name, last_name ),
             items (
               title,
               main_image_url,
               user_id,
               category_id,
               owner:users ( first_name, last_name )
             )`
                )
                .eq("renter_id", user.id)
                .order("created_at", { ascending: false });
            if (error) throw error;
            setRows(data || []);
        } finally {
            setLoading(false);
        }
    };

    if (!user) return null;

    const currentTab =
        BOOKING_TABS.find((t) => t.key === activeTab) || BOOKING_TABS[0];
    const currentData = grouped[activeTab] || [];

    return (
        <div className="min-h-screen bg-[#FAF5EF]">
            <TopMenu
                activePage="my-bookings"
                searchTerm={search}
                setSearchTerm={setSearch}
            />
            <div className="bg-gradient-to-br from-[#FFAB00]/5 via-transparent to-[#FFAB00]/5 border-b border-[#1E1E1E]/5">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
                        <div className="space-y-2">
                            <h1 className="text-4xl font-bold text-[#1E1E1E] tracking-tight">
                                My Bookings
                            </h1>
                            <p className="text-base text-[#1E1E1E]/60">
                                Manage and track all your rental bookings in one
                                place
                            </p>
                        </div>
                        <div className="flex items-center gap-3 bg-white rounded-xl px-5 py-3.5 shadow-sm border border-[#1E1E1E]/10 hover:shadow-md transition-shadow">
                            <Package className="w-4 h-4 text-[#FFAB00]" />
                            <label className="text-sm font-semibold text-[#1E1E1E]/70">
                                Category
                            </label>
                            <select
                                className="border border-[#1E1E1E]/20 rounded-lg px-4 py-2 text-sm bg-white text-[#1E1E1E] focus:outline-none focus:ring-2 focus:ring-[#FFAB00] focus:border-transparent transition-all cursor-pointer"
                                value={categoryFilter}
                                onChange={(e) =>
                                    setCategoryFilter(e.target.value)
                                }
                            >
                                <option value="">All Categories</option>
                                {categories.map((c) => (
                                    <option
                                        key={c.category_id}
                                        value={String(c.category_id)}
                                    >
                                        {c.name}
                                    </option>
                                ))}
                            </select>
                            {categoryFilter && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="cursor-pointer text-[#1E1E1E]/60 hover:text-[#1E1E1E] hover:bg-[#FFAB00]/10 transition-all"
                                    onClick={() => setCategoryFilter("")}
                                >
                                    Clear
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
                <div className="bg-white rounded-2xl border border-[#1E1E1E]/10 shadow-lg p-3 hover:shadow-xl transition-shadow">
                    <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1">
                        {BOOKING_TABS.map((tab) => {
                            const count = grouped[tab.key]?.length || 0;
                            const isActive = activeTab === tab.key;
                            return (
                                <button
                                    key={tab.key}
                                    onClick={() => setActiveTab(tab.key)}
                                    className={`group relative flex items-center gap-2.5 px-5 py-3 rounded-xl font-semibold text-sm whitespace-nowrap transition-all duration-300 ${
                                        isActive
                                            ? "bg-gradient-to-r from-[#FFAB00] to-[#FFAB00]/90 text-[#1E1E1E] shadow-lg shadow-[#FFAB00]/30 scale-105"
                                            : "bg-transparent text-[#1E1E1E]/60 hover:bg-[#FAF5EF] hover:text-[#1E1E1E] hover:scale-102"
                                    }`}
                                >
                                    <span className="relative z-10">
                                        {tab.label}
                                    </span>
                                    <Badge
                                        className={`relative z-10 ${
                                            isActive
                                                ? "bg-[#1E1E1E] text-white shadow-md"
                                                : "bg-[#1E1E1E]/10 text-[#1E1E1E]/70 group-hover:bg-[#FFAB00]/20"
                                        } border-none font-bold px-2.5 py-0.5 text-xs transition-all`}
                                    >
                                        {count}
                                    </Badge>
                                    {isActive && (
                                        <div className="absolute inset-0 bg-gradient-to-r from-[#FFAB00] to-[#FFAB00]/90 rounded-xl blur-xl opacity-20 -z-10" />
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
                <Card className="bg-gradient-to-br from-white to-[#FAF5EF]/30 backdrop-blur-sm border-[#1E1E1E]/10 shadow-md hover:shadow-lg transition-shadow">
                    <CardContent className="p-5">
                        <div className="flex items-center justify-between gap-4 flex-wrap">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg bg-[#FFAB00]/10 flex items-center justify-center">
                                    <Calendar className="w-4 h-4 text-[#FFAB00]" />
                                </div>
                                <span className="text-sm font-bold text-[#1E1E1E]">
                                    Booking Progress Guide
                                </span>
                            </div>
                            <ProgressLegend />
                        </div>
                    </CardContent>
                </Card>
                {loading ? (
                    <Loading />
                ) : (
                    <div className="space-y-6">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FFAB00] to-[#FFAB00]/80 flex items-center justify-center shadow-md">
                                <ChevronRight className="w-5 h-5 text-[#1E1E1E]" />
                            </div>
                            <h2 className="text-3xl font-bold text-[#1E1E1E]">
                                {currentTab.label}
                            </h2>
                            <Badge className="bg-gradient-to-r from-[#FFAB00] to-[#FFAB00]/80 text-[#1E1E1E] border-none hover:from-[#FFAB00]/90 hover:to-[#FFAB00]/70 font-bold px-4 py-1.5 text-base shadow-md">
                                {currentData.length}
                            </Badge>
                        </div>
                        {currentTab.tip && (
                            <div className="bg-gradient-to-r from-[#FFAB00]/10 via-[#FFAB00]/5 to-transparent border-l-4 border-[#FFAB00] rounded-lg px-5 py-4 shadow-sm">
                                <p className="text-sm text-[#1E1E1E]/80 font-medium flex items-start gap-2">
                                    <span className="text-lg">💡</span>
                                    <span>{currentTab.tip}</span>
                                </p>
                            </div>
                        )}
                        {currentData.length === 0 ? (
                            <div className="bg-gradient-to-br from-white to-[#FAF5EF]/50 backdrop-blur-sm rounded-2xl border border-[#1E1E1E]/10 p-12 text-center shadow-md">
                                <div className="w-20 h-20 rounded-full bg-[#FFAB00]/10 flex items-center justify-center mx-auto mb-4">
                                    <Clock className="w-10 h-10 text-[#FFAB00]/40" />
                                </div>
                                <p className="text-base text-[#1E1E1E]/60 font-medium">
                                    No {currentTab.label.toLowerCase()} bookings
                                    at the moment.
                                </p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {currentData.map((r) => (
                                    <Card
                                        key={r.rental_id}
                                        className="group bg-white border-[#1E1E1E]/10 shadow-md hover:shadow-2xl transition-all duration-300 hover:border-[#FFAB00]/40 hover:-translate-y-1 overflow-hidden"
                                    >
                                        <div className="h-1 bg-gradient-to-r from-[#FFAB00] via-[#FFAB00]/60 to-transparent" />
                                        <CardHeader className="pb-4">
                                            <div className="flex items-start justify-between gap-3">
                                                <CardTitle className="text-base flex items-center gap-3 flex-1">
                                                    <ImagePreviewThumb
                                                        src={
                                                            r.items
                                                                ?.main_image_url ||
                                                            "/placeholder.svg"
                                                        }
                                                        alt={r.items?.title}
                                                    />
                                                    <span className="line-clamp-2 text-[#1E1E1E] font-bold leading-snug group-hover:text-[#FFAB00] transition-colors">
                                                        {r.items?.title ||
                                                            "Item"}
                                                    </span>
                                                </CardTitle>
                                                <div className="flex items-center gap-2">
                                                    <StatusBadge
                                                        status={r.status}
                                                    />
                                                    {String(r.status) ===
                                                        "awaiting_owner_confirmation" &&
                                                        r.owner_confirmed_at && (
                                                            <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
                                                                On hold
                                                            </Badge>
                                                        )}
                                                </div>
                                            </div>
                                        </CardHeader>
                                        <CardContent className="text-sm space-y-5">
                                            <BookingSteps
                                                status={String(r.status || "")}
                                                labelsOverride={
                                                    r.items?.category_id &&
                                                    isAccommodationAny(
                                                        r.items.category_id,
                                                        categories
                                                    )
                                                        ? {
                                                              on_the_way:
                                                                  "Check-in",
                                                              ongoing:
                                                                  "Checked-in",
                                                              awaiting_owner_confirmation:
                                                                  "Checkout",
                                                          }
                                                        : null
                                                }
                                            />
                                            <div className="bg-gradient-to-br from-[#FAF5EF] to-[#FAF5EF]/50 rounded-xl p-4 space-y-3 border border-[#1E1E1E]/5">
                                                <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                                                    <div className="flex items-center gap-2">
                                                        <Calendar className="w-3.5 h-3.5 text-[#FFAB00]" />
                                                        <span className="text-[#1E1E1E]/60 text-xs font-medium">
                                                            Start Date
                                                        </span>
                                                    </div>
                                                    <div className="text-[#1E1E1E] font-bold text-xs">
                                                        {new Date(
                                                            r.start_date
                                                        ).toLocaleDateString()}
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Calendar className="w-3.5 h-3.5 text-[#FFAB00]" />
                                                        <span className="text-[#1E1E1E]/60 text-xs font-medium">
                                                            End Date
                                                        </span>
                                                    </div>
                                                    <div className="text-[#1E1E1E] font-bold text-xs">
                                                        {new Date(
                                                            r.end_date
                                                        ).toLocaleDateString()}
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <User className="w-3.5 h-3.5 text-[#FFAB00]" />
                                                        <span className="text-[#1E1E1E]/60 text-xs font-medium">
                                                            Owner
                                                        </span>
                                                    </div>
                                                    <div className="text-[#1E1E1E] font-bold text-xs">
                                                        {r.items?.owner
                                                            ?.first_name ||
                                                            ""}{" "}
                                                        {r.items?.owner
                                                            ?.last_name || ""}
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Package className="w-3.5 h-3.5 text-[#FFAB00]" />
                                                        <span className="text-[#1E1E1E]/60 text-xs font-medium">
                                                            Units
                                                        </span>
                                                    </div>
                                                    <div className="text-[#1E1E1E] font-bold text-xs">
                                                        {Number(
                                                            r.quantity || 1
                                                        )}
                                                    </div>
                                                </div>
                                                <Separator className="bg-[#1E1E1E]/10" />
                                                <div className="flex items-center justify-between pt-1">
                                                    <div className="flex items-center gap-2">
                                                        <PhilippinePeso className="w-4 h-4 text-[#FFAB00]" />
                                                        <span className="text-[#1E1E1E]/60 text-xs font-medium">
                                                            Total Cost
                                                        </span>
                                                    </div>
                                                    <div className="text-[#FFAB00] font-bold text-lg">
                                                        ₱
                                                        {Number(
                                                            r.total_cost || 0
                                                        ).toFixed(2)}
                                                    </div>
                                                </div>
                                            </div>
                                            <ActionBar
                                                tabKey={activeTab}
                                                rental={r}
                                                user={user}
                                                onChanged={refetchBookings}
                                                categories={categories}
                                            />
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

function ActionBar({ tabKey, rental, user, onChanged, categories }) {
    let primary = null;
    if (tabKey === "pending") {
        primary = (
            <CancelBooking rental={rental} onChanged={onChanged} user={user} />
        );
    } else if (tabKey === "awaitingDeposit") {
        if (rental.status === "confirmed") {
            primary = <UploadDeposit rental={rental} onChanged={onChanged} />;
        }
    } else if (tabKey === "awaitingOwnerConfirmDeposit") {
        if (rental.status === "deposit_submitted") {
            primary = <ViewDepositProof rental={rental} />;
        }
    } else if (tabKey === "onTheWay") {
        // For accommodation, go straight to ongoing with renter check-in
        if (isAccommodationAny(rental.items?.category_id, categories || [])) {
            primary = <MarkCheckIn rental={rental} onChanged={onChanged} />;
        } else {
            primary = <MarkReceived rental={rental} onChanged={onChanged} />;
        }
    } else if (tabKey === "ongoing") {
        if (isAccommodationAny(rental.items?.category_id, categories || [])) {
            primary = <MarkCheckout rental={rental} onChanged={onChanged} />;
        } else {
            if (isEligibleReturn(rental)) {
                primary = (
                    <MarkReturned rental={rental} onChanged={onChanged} />
                );
            }
        }
    } else if (tabKey === "completed") {
        primary = (
            <div className="flex gap-2">
                <RateLessorButton rental={rental} />
                <RateItemButton rental={rental} />
            </div>
        );
    }

    return (
        <div className="pt-3 flex items-center justify-between gap-2 flex-wrap border-t border-[#1E1E1E]/10">
            <div className="flex gap-2">
                {primary}
                <DetailsModal
                    rental={rental}
                    user={user}
                    categories={categories}
                />
            </div>
            <MoreMenu rental={rental} user={user} onChanged={onChanged} />
        </div>
    );
}

function MoreMenu({ rental, user, onChanged }) {
    const navigate = useNavigate();
    const ownerId = rental?.items?.user_id;
    const [openUpload, setOpenUpload] = useState(false);
    const [file, setFile] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const toast = useToastApi();

    const doUpload = async (e) => {
        e?.preventDefault?.();
        if (!file) return;
        try {
            setSubmitting(true);
            const ext = file.name.split(".").pop();
            const path = `${rental.rental_id}/${Date.now()}.${ext}`;
            const { error: upErr } = await supabase.storage
                .from(PROOF_BUCKET)
                .upload(path, file, {
                    cacheControl: "3600",
                    upsert: false,
                    contentType: file.type || "application/octet-stream",
                });
            if (upErr) throw upErr;
            const { error } = await supabase
                .from("rental_transactions")
                .update({
                    proof_of_deposit_url: path,
                    status: "deposit_submitted",
                })
                .eq("rental_id", rental.rental_id)
                .eq("status", "confirmed");
            if (error) throw error;
            toast.success("Deposit uploaded. Waiting for owner verification.");
            setOpenUpload(false);
            setFile(null);
            onChanged && onChanged();
        } catch (err) {
            toast.error(err.message || "Upload failed");
        } finally {
            setSubmitting(false);
        }
    };

    const openProof = async () => {
        const url = rental?.proof_of_deposit_url;
        if (!url) return;
        try {
            if (/^https?:\/\//i.test(url)) {
                window.open(url, "_blank");
                return;
            }
            const { data, error } = await supabase.storage
                .from(PROOF_BUCKET)
                .createSignedUrl(url, 300);
            if (error) throw error;
            window.open(data.signedUrl, "_blank");
        } catch (e) {
            toast.error(e.message || "Could not open proof");
        }
    };
    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="outline"
                        size="sm"
                        className="cursor-pointer border-[#1E1E1E]/20 hover:bg-[#FFAB00]/10 hover:border-[#FFAB00] transition-all bg-transparent"
                    >
                        More
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-white">
                    <DropdownMenuItem
                        onSelect={(e) => {
                            e.preventDefault();
                            if (ownerId) navigate(`/profile/${ownerId}`);
                        }}
                    >
                        View owner profile
                    </DropdownMenuItem>
                    {String(rental.status) === "confirmed" && (
                        <DropdownMenuItem
                            onSelect={(e) => {
                                e.preventDefault();
                                setOpenUpload(true);
                            }}
                        >
                            Upload deposit
                        </DropdownMenuItem>
                    )}
                    {String(rental.status) === "deposit_submitted" && (
                        <DropdownMenuItem
                            onSelect={(e) => {
                                e.preventDefault();
                                openProof();
                            }}
                        >
                            View deposit
                        </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <ReportDialog
                        trigger={
                            <DropdownMenuItem
                                onSelect={(e) => {
                                    e.preventDefault();
                                }}
                            >
                                Report owner
                            </DropdownMenuItem>
                        }
                        senderId={rental?.renter?.id || user?.id}
                        targetUserId={ownerId}
                        rentalId={rental.rental_id}
                        title="Report Owner"
                        description="Describe your issue with the owner for this booking."
                    />
                    <ReportDialog
                        trigger={
                            <DropdownMenuItem
                                onSelect={(e) => {
                                    e.preventDefault();
                                }}
                            >
                                Report item
                            </DropdownMenuItem>
                        }
                        senderId={rental?.renter?.id || user?.id}
                        targetItemId={rental.item_id}
                        targetUserId={ownerId}
                        rentalId={rental.rental_id}
                        title="Report Item"
                        description="Describe your issue with this item for this booking."
                    />
                </DropdownMenuContent>
            </DropdownMenu>
            <Dialog open={openUpload} onOpenChange={setOpenUpload}>
                <DialogContent className="bg-white">
                    <DialogHeader>
                        <DialogTitle className="text-[#1E1E1E]">
                            Upload deposit proof
                        </DialogTitle>
                    </DialogHeader>
                    <form onSubmit={doUpload} className="space-y-4">
                        <input
                            type="file"
                            accept="image/*,application/pdf"
                            onChange={(e) =>
                                setFile(e.target.files?.[0] || null)
                            }
                            className="w-full text-sm text-[#1E1E1E] file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-[#FFAB00] file:text-[#1E1E1E] hover:file:bg-[#FFAB00]/90 file:cursor-pointer"
                        />
                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                className="cursor-pointer bg-transparent"
                                onClick={() => setOpenUpload(false)}
                                disabled={submitting}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={!file || submitting}
                                className="bg-[#FFAB00] text-[#1E1E1E] hover:bg-[#FFAB00]/90"
                            >
                                {submitting ? "Uploading…" : "Submit"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
}

function CancelBooking({ rental, onChanged, user }) {
    const [open, setOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const toast = useToastApi();
    const doCancel = async () => {
        if (!rental?.rental_id) return;
        try {
            setSubmitting(true);
            const { error } = await supabase
                .from("rental_transactions")
                .update({ status: "cancelled" })
                .eq("rental_id", rental.rental_id)
                .eq("renter_id", user?.id)
                .eq("status", "pending");
            if (error) throw error;
            toast.success("Booking cancelled");
            setOpen(false);
            onChanged && onChanged();
        } catch (e) {
            toast.error(e.message || "Could not cancel booking");
        } finally {
            setSubmitting(false);
        }
    };
    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button
                    size="sm"
                    variant="outline"
                    className="cursor-pointer border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400 bg-transparent"
                >
                    Cancel
                </Button>
            </DialogTrigger>
            <DialogContent className="bg-white">
                <DialogHeader>
                    <DialogTitle className="text-[#1E1E1E]">
                        Cancel booking request?
                    </DialogTitle>
                </DialogHeader>
                <div className="text-sm text-[#1E1E1E]/80 space-y-3">
                    <p>
                        This will withdraw your request for
                        <span className="font-semibold text-[#1E1E1E]">
                            {" "}
                            {rental.items?.title}
                        </span>
                        .
                    </p>
                    <div className="bg-[#FAF5EF] rounded-lg p-3 space-y-1">
                        <div className="flex justify-between text-xs">
                            <span className="text-[#1E1E1E]/60">Dates</span>
                            <span className="font-medium text-[#1E1E1E]">
                                {new Date(
                                    rental.start_date
                                ).toLocaleDateString()}{" "}
                                —{" "}
                                {new Date(rental.end_date).toLocaleDateString()}
                            </span>
                        </div>
                    </div>
                    <p className="text-xs text-[#1E1E1E]/50">
                        This action cannot be undone.
                    </p>
                </div>
                <DialogFooter>
                    <Button
                        type="button"
                        variant="outline"
                        className="cursor-pointer bg-transparent"
                        onClick={() => setOpen(false)}
                        disabled={submitting}
                    >
                        Keep Booking
                    </Button>
                    <Button
                        type="button"
                        variant="destructive"
                        className="cursor-pointer"
                        onClick={doCancel}
                        disabled={submitting}
                    >
                        {submitting ? "Cancelling…" : "Confirm Cancel"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function isEligibleReturn(rental) {
    if (!rental) return false;
    const now = new Date();
    const end = new Date(rental.end_date);
    return (
        end <= now &&
        ["confirmed", "ongoing"].includes(
            String(rental.status || "").toLowerCase()
        )
    );
}

function MarkReturned({ rental, onChanged }) {
    const [submitting, setSubmitting] = useState(false);
    const toast = useToastApi();
    const doMark = async () => {
        try {
            setSubmitting(true);
            const { error } = await supabase
                .from("rental_transactions")
                .update({
                    status: "awaiting_owner_confirmation",
                    renter_return_marked_at: new Date().toISOString(),
                })
                .eq("rental_id", rental.rental_id)
                .in("status", ["confirmed", "ongoing"]);
            if (error) throw error;
            toast.success(
                "Marked as returned. Waiting for owner confirmation."
            );
            onChanged && onChanged();
        } catch (e) {
            toast.error(
                `Could not mark returned: ${e.message || "Unknown error"}`
            );
        } finally {
            setSubmitting(false);
        }
    };
    return (
        <Button
            size="sm"
            onClick={doMark}
            disabled={submitting}
            className="cursor-pointer bg-[#FFAB00] text-[#1E1E1E] hover:bg-[#FFAB00]/90 font-semibold"
        >
            {submitting ? "Marking…" : "Mark as Returned"}
        </Button>
    );
}

function MarkCheckIn({ rental, onChanged }) {
    const [loading, setLoading] = useState(false);
    const toast = useToastApi();
    const doMark = async () => {
        try {
            setLoading(true);
            const { error } = await supabase
                .from("rental_transactions")
                .update({ status: "ongoing" })
                .eq("rental_id", rental.rental_id)
                .eq("status", "on_the_way");
            if (error) throw error;
            toast.success("Checked in. Enjoy your stay!");
            onChanged && onChanged();
        } catch (e) {
            toast.error(e.message || "Could not update");
        } finally {
            setLoading(false);
        }
    };
    return (
        <Button
            size="sm"
            onClick={doMark}
            disabled={loading}
            className="cursor-pointer bg-[#FFAB00] text-[#1E1E1E] hover:bg-[#FFAB00]/90 font-semibold"
        >
            {loading ? "Updating…" : "Check-in"}
        </Button>
    );
}

function MarkCheckout({ rental, onChanged }) {
    const [submitting, setSubmitting] = useState(false);
    const toast = useToastApi();
    const doMark = async () => {
        try {
            setSubmitting(true);
            const { error } = await supabase
                .from("rental_transactions")
                .update({
                    status: "awaiting_owner_confirmation",
                    renter_return_marked_at: new Date().toISOString(),
                })
                .eq("rental_id", rental.rental_id)
                .in("status", ["confirmed", "ongoing"]);
            if (error) throw error;
            toast.success("Checked out. Waiting for host confirmation.");
            onChanged && onChanged();
        } catch (e) {
            toast.error(
                `Could not mark checkout: ${e.message || "Unknown error"}`
            );
        } finally {
            setSubmitting(false);
        }
    };
    return (
        <Button
            size="sm"
            onClick={doMark}
            disabled={submitting}
            className="cursor-pointer bg-[#FFAB00] text-[#1E1E1E] hover:bg-[#FFAB00]/90 font-semibold"
        >
            {submitting ? "Marking…" : "Mark as Checkout"}
        </Button>
    );
}

function RateLessorButton({ rental }) {
    const user = useUser();
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [existing, setExisting] = useState(null);
    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState("");
    const toast = useToastApi();

    useEffect(() => {
        if (!open) return;
        (async () => {
            try {
                setLoading(true);
                const lessorId = rental?.items?.user_id;
                let data = null;
                if (lessorId) {
                    data = await getExistingLessorReviewForLessor(
                        lessorId,
                        user?.id
                    );
                } else {
                    data = await getExistingLessorReview(
                        rental.rental_id,
                        user?.id
                    );
                }
                setExisting(data);
                setRating(Number(data?.rating || 0));
                setComment(data?.comment || "");
            } catch (e) {
                // ignore
            } finally {
                setLoading(false);
            }
        })();
    }, [open, rental?.rental_id, rental?.items?.user_id, user?.id]);

    const submit = async (e) => {
        e?.preventDefault?.();
        if (!user?.id) return;
        if (!rating) return;
        try {
            setLoading(true);
            const { updated } = await saveLessorReview({
                rentalId: rental.rental_id,
                reviewerId: user.id,
                rating,
                comment,
            });
            toast.success(updated ? "Review updated" : "Review submitted");
            setOpen(false);
        } catch (err) {
            toast.error(err.message || "Could not save review");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button
                    variant="outline"
                    size="sm"
                    className="cursor-pointer border-[#FFAB00] text-[#FFAB00] hover:bg-[#FFAB00]/10 font-semibold bg-transparent"
                >
                    {existing ? "Edit review" : "Rate lessor"}
                </Button>
            </DialogTrigger>
            <DialogContent className="bg-white">
                <DialogHeader>
                    <DialogTitle className="text-[#1E1E1E]">
                        Rate lessor
                    </DialogTitle>
                </DialogHeader>
                <form onSubmit={submit} className="space-y-4">
                    <div className="flex items-center gap-2">
                        {[1, 2, 3, 4, 5].map((n) => (
                            <button
                                type="button"
                                key={n}
                                onClick={() => setRating(n)}
                                className={`w-10 h-10 rounded-full border-2 flex items-center justify-center font-bold transition-all ${
                                    n <= rating
                                        ? "bg-[#FFAB00] border-[#FFAB00] text-[#1E1E1E] scale-110"
                                        : "bg-white border-[#1E1E1E]/20 text-[#1E1E1E]/40 hover:border-[#FFAB00]/50"
                                }`}
                                aria-label={`${n} star`}
                            >
                                {n}
                            </button>
                        ))}
                    </div>
                    <textarea
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        placeholder="Share your experience with this lessor..."
                        className="w-full border border-[#1E1E1E]/20 rounded-lg p-3 text-sm text-[#1E1E1E] focus:outline-none focus:ring-2 focus:ring-[#FFAB00] transition-all"
                        rows={4}
                    />
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            className="cursor-pointer bg-transparent"
                            onClick={() => setOpen(false)}
                            disabled={loading}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={loading || !rating}
                            className="bg-[#FFAB00] text-[#1E1E1E] hover:bg-[#FFAB00]/90 font-semibold"
                        >
                            {loading
                                ? "Saving..."
                                : existing
                                ? "Update"
                                : "Submit"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

function RateItemButton({ rental }) {
    const user = useUser();
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [existing, setExisting] = useState(null);
    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState("");
    const toast = useToastApi();

    useEffect(() => {
        if (!open) return;
        (async () => {
            try {
                setLoading(true);
                const data = await getExistingItemReview(
                    rental.rental_id,
                    user?.id
                );
                setExisting(data);
                setRating(Number(data?.rating || 0));
                setComment(data?.comment || "");
            } catch (e) {
                // ignore
            } finally {
                setLoading(false);
            }
        })();
    }, [open, rental?.rental_id, user?.id]);

    const submit = async (e) => {
        e?.preventDefault?.();
        if (!user?.id) return;
        if (!rating) return;
        try {
            setLoading(true);
            const { updated } = await saveItemReview({
                rentalId: rental.rental_id,
                reviewerId: user.id,
                rating,
                comment,
            });
            toast.success(
                updated ? "Item review updated" : "Item review submitted"
            );
            setOpen(false);
        } catch (err) {
            toast.error(err.message || "Could not save item review");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button
                    variant="outline"
                    size="sm"
                    className="cursor-pointer border-[#1E1E1E]/30 text-[#1E1E1E] hover:bg-[#FFAB00]/10 bg-transparent"
                >
                    {existing ? "Edit item review" : "Rate item"}
                </Button>
            </DialogTrigger>
            <DialogContent className="bg-white">
                <DialogHeader>
                    <DialogTitle className="text-[#1E1E1E]">
                        Rate item
                    </DialogTitle>
                </DialogHeader>
                <form onSubmit={submit} className="space-y-4">
                    <div className="flex items-center gap-2">
                        {[1, 2, 3, 4, 5].map((n) => (
                            <button
                                type="button"
                                key={n}
                                onClick={() => setRating(n)}
                                className={`w-10 h-10 rounded-full border-2 flex items-center justify-center font-bold transition-all ${
                                    n <= rating
                                        ? "bg-[#FFAB00] border-[#FFAB00] text-[#1E1E1E] scale-110"
                                        : "bg-white border-[#1E1E1E]/20 text-[#1E1E1E]/40 hover:border-[#FFAB00]/50"
                                }`}
                                aria-label={`${n} star`}
                            >
                                {n}
                            </button>
                        ))}
                    </div>
                    <textarea
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        placeholder="Share your experience with this item..."
                        className="w-full border border-[#1E1E1E]/20 rounded-lg p-3 text-sm text-[#1E1E1E] focus:outline-none focus:ring-2 focus:ring-[#FFAB00] transition-all"
                        rows={4}
                    />
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            className="cursor-pointer bg-transparent"
                            onClick={() => setOpen(false)}
                            disabled={loading}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={loading || !rating}
                            className="bg-[#FFAB00] text-[#1E1E1E] hover:bg-[#FFAB00]/90 font-semibold"
                        >
                            {loading
                                ? "Saving..."
                                : existing
                                ? "Update"
                                : "Submit"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

function ImagePreviewThumb({ src, alt }) {
    const imgSrc = src || "/vite.svg";
    return (
        <Dialog>
            <DialogTrigger asChild>
                <div className="relative group/img cursor-pointer">
                    <img
                        src={imgSrc || "/placeholder.svg"}
                        alt={alt || "Item"}
                        className="w-16 h-16 object-cover rounded-xl border-2 border-[#1E1E1E]/10 group-hover/img:border-[#FFAB00] transition-all shadow-sm group-hover/img:shadow-lg group-hover/img:scale-105"
                        onError={(e) =>
                            (e.currentTarget.style.display = "none")
                        }
                    />
                    <div className="absolute inset-0 bg-[#FFAB00]/0 group-hover/img:bg-[#FFAB00]/10 rounded-xl transition-all" />
                </div>
            </DialogTrigger>
            <DialogContent className="max-w-3xl p-2 bg-white">
                <img
                    src={imgSrc || "/placeholder.svg"}
                    alt={alt || "Item"}
                    className="w-full h-auto rounded-lg"
                />
            </DialogContent>
        </Dialog>
    );
}

function DetailsModal({ rental, user, categories }) {
    const [open, setOpen] = useState(false);
    const [unitsCount, setUnitsCount] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        if (!open) return;
        setUnitsCount(Number(rental.quantity ?? 1));
    }, [open, rental.quantity]);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button
                    size="sm"
                    variant="outline"
                    className="cursor-pointer border-[#1E1E1E]/20 hover:bg-[#FAF5EF] hover:border-[#1E1E1E]/40 bg-transparent"
                >
                    View Details
                </Button>
            </DialogTrigger>
            <DialogContent className="bg-white max-w-lg">
                <DialogHeader>
                    <DialogTitle className="text-[#1E1E1E] text-xl font-bold">
                        {rental.items?.title || "Item Details"}
                    </DialogTitle>
                </DialogHeader>
                <div className="mb-4">
                    <img
                        src={rental.items?.main_image_url || "/vite.svg"}
                        alt={rental.items?.title || "Item"}
                        className="w-full h-48 object-cover rounded-lg border-2 border-[#1E1E1E]/10"
                        onError={(e) =>
                            (e.currentTarget.style.display = "none")
                        }
                    />
                </div>
                <div className="space-y-3 text-sm">
                    <div className="bg-[#FAF5EF] rounded-lg p-4 space-y-2">
                        <div className="flex justify-between">
                            <span className="text-[#1E1E1E]/60 font-medium">
                                Owner
                            </span>
                            <span className="text-[#1E1E1E] font-semibold">
                                {rental.items?.owner?.first_name || ""}{" "}
                                {rental.items?.owner?.last_name || ""}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-[#1E1E1E]/60 font-medium">
                                Renter
                            </span>
                            <span className="text-[#1E1E1E] font-semibold">
                                {rental.renter?.first_name || "You"}{" "}
                                {rental.renter?.last_name || ""}
                            </span>
                        </div>
                    </div>
                    <Separator className="bg-[#1E1E1E]/10" />
                    <div className="space-y-2">
                        <div className="flex justify-between">
                            <span className="text-[#1E1E1E]/60 font-medium">
                                Start
                            </span>
                            <span className="text-[#1E1E1E] font-semibold">
                                {new Date(
                                    rental.start_date
                                ).toLocaleDateString()}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-[#1E1E1E]/60 font-medium">
                                End
                            </span>
                            <span className="text-[#1E1E1E] font-semibold">
                                {new Date(rental.end_date).toLocaleDateString()}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-[#1E1E1E]/60 font-medium">
                                Units
                            </span>
                            <span className="text-[#1E1E1E] font-semibold">
                                {unitsCount ?? "—"}
                            </span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-[#1E1E1E]/60 font-medium">
                                Status
                            </span>
                            <StatusBadge status={rental.status} />
                        </div>
                        {String(rental.status) ===
                            "awaiting_owner_confirmation" &&
                            rental.owner_confirmed_at && (
                                <div className="flex justify-between">
                                    <span className="text-[#1E1E1E]/60 font-medium">
                                        Hold
                                    </span>
                                    <span className="text-[#1E1E1E] font-semibold text-xs">
                                        {new Date(
                                            rental.owner_confirmed_at
                                        ).toLocaleString()}
                                    </span>
                                </div>
                            )}
                        <div className="flex justify-between items-center pt-2 border-t border-[#1E1E1E]/10">
                            <span className="text-[#1E1E1E] font-bold">
                                Total
                            </span>
                            <span className="text-[#FFAB00] font-bold text-lg">
                                ₱{Number(rental.total_cost || 0).toFixed(2)}
                            </span>
                        </div>
                    </div>
                    <div className="pt-2">
                        <p className="text-[#1E1E1E]/60 font-medium text-xs mb-2">
                            Booking Progress
                        </p>
                        <BookingSteps
                            status={String(rental.status || "")}
                            compact
                            labelsOverride={
                                rental.items?.category_id &&
                                isAccommodationAny(
                                    rental.items.category_id,
                                    categories || []
                                )
                                    ? {
                                          on_the_way: "Check-in",
                                          ongoing: "Checked-in",
                                          awaiting_owner_confirmation:
                                              "Checkout",
                                      }
                                    : null
                            }
                        />
                    </div>
                </div>
                <DialogFooter className="flex items-center justify-between gap-2 flex-wrap">
                    <Button
                        type="button"
                        variant="outline"
                        className="cursor-pointer border-[#FFAB00] text-[#FFAB00] hover:bg-[#FFAB00]/10 bg-transparent"
                        onClick={() => {
                            const ownerId = rental?.items?.user_id;
                            if (ownerId) navigate(`/profile/${ownerId}`);
                        }}
                    >
                        View Owner Profile
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        className="cursor-pointer bg-transparent"
                        onClick={() => setOpen(false)}
                    >
                        Close
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function UploadDeposit({ rental, onChanged }) {
    const [open, setOpen] = useState(false);
    const [file, setFile] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const toast = useToastApi();

    const handleUpload = async (e) => {
        e?.preventDefault?.();
        if (!file) return;
        try {
            setSubmitting(true);
            const ext = file.name.split(".").pop();
            const path = `${rental.rental_id}/${Date.now()}.${ext}`;
            const { error: upErr } = await supabase.storage
                .from(PROOF_BUCKET)
                .upload(path, file, {
                    cacheControl: "3600",
                    upsert: false,
                    contentType: file.type || "application/octet-stream",
                });
            if (upErr) throw upErr;
            const { error } = await supabase
                .from("rental_transactions")
                .update({
                    proof_of_deposit_url: path,
                    status: "deposit_submitted",
                })
                .eq("rental_id", rental.rental_id)
                .eq("status", "confirmed");
            if (error) throw error;
            toast.success("Deposit uploaded. Waiting for owner verification.");
            setOpen(false);
            onChanged && onChanged();
        } catch (err) {
            toast.error(err.message || "Upload failed");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button
                    size="sm"
                    className="cursor-pointer bg-[#FFAB00] text-[#1E1E1E] hover:bg-[#FFAB00]/90 font-semibold"
                >
                    Upload Deposit
                </Button>
            </DialogTrigger>
            <DialogContent className="bg-white">
                <DialogHeader>
                    <DialogTitle className="text-[#1E1E1E]">
                        Upload deposit proof
                    </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleUpload} className="space-y-4">
                    <div className="border-2 border-dashed border-[#1E1E1E]/20 rounded-lg p-6 text-center hover:border-[#FFAB00] transition-all">
                        <input
                            type="file"
                            accept="image/*,application/pdf"
                            onChange={(e) =>
                                setFile(e.target.files?.[0] || null)
                            }
                            className="w-full text-sm text-[#1E1E1E] file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-[#FFAB00] file:text-[#1E1E1E] hover:file:bg-[#FFAB00]/90 file:cursor-pointer"
                        />
                        {file && (
                            <p className="mt-3 text-xs text-[#1E1E1E]/60">
                                Selected: {file.name}
                            </p>
                        )}
                    </div>
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            className="cursor-pointer bg-transparent"
                            onClick={() => setOpen(false)}
                            disabled={submitting}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={!file || submitting}
                            className="bg-[#FFAB00] text-[#1E1E1E] hover:bg-[#FFAB00]/90 font-semibold"
                        >
                            {submitting ? "Uploading…" : "Submit"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

function ViewDepositProof({ rental }) {
    const url = rental?.proof_of_deposit_url;
    if (!url) return null;
    const openProof = async () => {
        try {
            if (/^https?:\/\//i.test(url)) {
                window.open(url, "_blank");
                return;
            }
            const { data, error } = await supabase.storage
                .from(PROOF_BUCKET)
                .createSignedUrl(url, 300);
            if (error) throw error;
            window.open(data.signedUrl, "_blank");
        } catch (e) {
            alert(e.message || "Could not open proof");
        }
    };
    return (
        <Button
            size="sm"
            variant="outline"
            className="cursor-pointer border-[#FFAB00] text-[#FFAB00] hover:bg-[#FFAB00]/10 bg-transparent"
            onClick={openProof}
        >
            View Deposit
        </Button>
    );
}

function MarkReceived({ rental, onChanged }) {
    const [loading, setLoading] = useState(false);
    const toast = useToastApi();
    const doMark = async () => {
        try {
            setLoading(true);
            const { error } = await supabase
                .from("rental_transactions")
                .update({ status: "ongoing" })
                .eq("rental_id", rental.rental_id)
                .eq("status", "on_the_way");
            if (error) throw error;
            toast.success("Marked as received. Enjoy your rental!");
            onChanged && onChanged();
        } catch (e) {
            toast.error(e.message || "Could not update");
        } finally {
            setLoading(false);
        }
    };
    return (
        <Button
            size="sm"
            onClick={doMark}
            disabled={loading}
            className="cursor-pointer bg-[#FFAB00] text-[#1E1E1E] hover:bg-[#FFAB00]/90 font-semibold"
        >
            {loading ? "Updating…" : "Mark Delivered"}
        </Button>
    );
}
