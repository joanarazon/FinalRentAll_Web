"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { supabase } from "../../supabaseClient";
import { useUser } from "../hooks/useUser";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
    Loader2,
    Calendar,
    Package,
    User,
    AudioLines as PhilippinePeso,
    ChevronRight,
    Clock,
} from "lucide-react";
const PROOF_BUCKET = "proof-of-deposit";
import TopMenu from "../components/topMenu";
import { useToastApi } from "@/components/ui/toast";
import { ProgressLegend } from "@/components/shared/BookingSteps";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogTrigger,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";

function StatusBadge({ status }) {
    const s = String(status || "").toLowerCase();
    const map = {
        pending: "bg-amber-100 text-amber-800 border-amber-200",
        confirmed: "bg-green-100 text-green-800 border-green-200",
        deposit_submitted: "bg-blue-100 text-blue-800 border-blue-200",
        on_the_way: "bg-blue-100 text-blue-800 border-blue-200",
        ongoing: "bg-green-100 text-green-800 border-green-200",
        awaiting_owner_confirmation:
            "bg-purple-100 text-purple-800 border-purple-200",
        completed: "bg-emerald-100 text-emerald-800 border-emerald-200",
        expired: "bg-gray-100 text-gray-700 border-gray-200",
        cancelled: "bg-red-100 text-red-800 border-red-200",
        rejected: "bg-red-100 text-red-800 border-red-200",
    };
    const cls = map[s] || "bg-gray-100 text-gray-700 border-gray-200";
    return (
        <span
            className={`capitalize border ${cls} px-2 py-0.5 rounded-md text-xs`}
        >
            {s.replaceAll("_", " ")}
        </span>
    );
}

const BOOKING_TABS = [
    {
        key: "pending",
        label: "Pending",
        tip: "Review and approve or reject booking requests.",
    },
    {
        key: "confirmed",
        label: "Confirmed",
        tip: "Waiting for renter to upload deposit proof.",
    },
    {
        key: "deposit",
        label: "Deposit",
        tip: "Review deposit proof and verify to proceed.",
    },
    { key: "onTheWay", label: "On the way", tip: null },
    { key: "ongoing", label: "Ongoing", tip: null },
    {
        key: "returned",
        label: "Returned/Checkout",
        tip: "Confirm returns or checkouts and restock items.",
    },
    { key: "cancelled", label: "Cancelled/Rejected", tip: null },
    { key: "expired", label: "Expired", tip: null },
];

export default function OwnerBookingRequests({
    favorites,
    searchTerm,
    setSearchTerm,
}) {
    const user = useUser();
    const toast = useToastApi();
    const [rows, setRows] = useState([]);
    const [awaiting, setAwaiting] = useState([]);
    const [expired, setExpired] = useState([]);
    const [ongoing, setOngoing] = useState([]);
    const [awaitingDepositOwner, setAwaitingDepositOwner] = useState([]);
    const [deposits, setDeposits] = useState([]);
    const combinedDeposits = useMemo(() => {
        const list = [
            ...(awaitingDepositOwner || []).map((r) => ({
                ...r,
                _phase: "awaiting_renter",
            })),
            ...(deposits || []).map((r) => ({ ...r, _phase: "owner_review" })),
        ];
        return list.sort((a, b) => {
            const as = new Date(a.start_date).getTime();
            const bs = new Date(b.start_date).getTime();
            if (as !== bs) return as - bs;
            const aw = a._phase === "awaiting_renter" ? 0 : 1;
            const bw = b._phase === "awaiting_renter" ? 0 : 1;
            return aw - bw;
        });
    }, [awaitingDepositOwner, deposits]);
    const [enRoute, setEnRoute] = useState([]);
    const [cancelled, setCancelled] = useState([]);
    const [loading, setLoading] = useState(false);
    const [actionId, setActionId] = useState(null);
    const [proofOpen, setProofOpen] = useState(false);
    const [proofSrc, setProofSrc] = useState(null);
    const [proofTitle, setProofTitle] = useState("");
    const [activeTab, setActiveTab] = useState("pending");

    const fetchData = useCallback(async () => {
        if (!user?.id) return;
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from("rental_transactions")
                .select(
                    `rental_id,item_id,renter_id,start_date,end_date,total_cost,status,quantity,proof_of_deposit_url,
           items!inner(title,user_id,main_image_url),
           renter:renter_id ( first_name,last_name )`
                )
                .eq("items.user_id", user.id)
                .eq("status", "pending")
                .neq("renter_id", user.id)
                .order("created_at", { ascending: true })
                .order("start_date", { ascending: true });
            if (error) throw error;
            const filtered = (data || []).filter(
                (r) => r.renter_id && r.renter_id !== user.id
            );
            setRows(filtered);

            const { data: ret, error: e2 } = await supabase
                .from("rental_transactions")
                .select(
                    `rental_id,item_id,renter_id,start_date,end_date,total_cost,status,quantity,renter_return_marked_at,
           items!inner(title,user_id,main_image_url),
           renter:renter_id ( first_name,last_name )`
                )
                .eq("items.user_id", user.id)
                .eq("status", "awaiting_owner_confirmation")
                .neq("renter_id", user.id)
                .order("renter_return_marked_at", { ascending: true });
            if (e2) throw e2;
            setAwaiting(ret || []);

            const { data: exp, error: e3 } = await supabase
                .from("rental_transactions")
                .select(
                    `rental_id,item_id,renter_id,start_date,end_date,total_cost,status,quantity,
           items!inner(title,user_id,main_image_url),
           renter:renter_id ( first_name,last_name )`
                )
                .eq("items.user_id", user.id)
                .eq("status", "expired")
                .neq("renter_id", user.id)
                .order("start_date", { ascending: false });
            if (e3) throw e3;
            setExpired(exp || []);

            const { data: ong, error: e4 } = await supabase
                .from("rental_transactions")
                .select(
                    `rental_id,item_id,renter_id,start_date,end_date,total_cost,status,quantity,proof_of_deposit_url,
           items!inner(title,user_id,main_image_url),
           renter:renter_id ( first_name,last_name )`
                )
                .eq("items.user_id", user.id)
                .eq("status", "ongoing")
                .neq("renter_id", user.id)
                .order("start_date", { ascending: true });
            if (e4) throw e4;
            setOngoing(ong || []);

            const { data: conf, error: e4b } = await supabase
                .from("rental_transactions")
                .select(
                    `rental_id,item_id,renter_id,start_date,end_date,total_cost,status,quantity,
           items!inner(title,user_id,main_image_url),
           renter:renter_id ( first_name,last_name )`
                )
                .eq("items.user_id", user.id)
                .eq("status", "confirmed")
                .neq("renter_id", user.id)
                .order("start_date", { ascending: true });
            if (e4b) throw e4b;
            setAwaitingDepositOwner(conf || []);

            const { data: canx, error: e5 } = await supabase
                .from("rental_transactions")
                .select(
                    `rental_id,item_id,renter_id,start_date,end_date,total_cost,status,quantity,
           items!inner(title,user_id,main_image_url),
           renter:renter_id ( first_name,last_name )`
                )
                .eq("items.user_id", user.id)
                .in("status", ["cancelled", "rejected"])
                .neq("renter_id", user.id)
                .order("created_at", { ascending: false });
            if (e5) throw e5;
            setCancelled(canx || []);

            const { data: dep, error: e6 } = await supabase
                .from("rental_transactions")
                .select(
                    `rental_id,item_id,renter_id,start_date,end_date,total_cost,status,quantity,proof_of_deposit_url,
           items!inner(title,user_id,main_image_url),
           renter:renter_id ( first_name,last_name )`
                )
                .eq("items.user_id", user.id)
                .eq("status", "deposit_submitted")
                .neq("renter_id", user.id)
                .order("start_date", { ascending: true });
            if (e6) throw e6;
            setDeposits(dep || []);

            const { data: onw, error: e7 } = await supabase
                .from("rental_transactions")
                .select(
                    `rental_id,item_id,renter_id,start_date,end_date,total_cost,status,quantity,proof_of_deposit_url,
           items!inner(title,user_id,main_image_url),
           renter:renter_id ( first_name,last_name )`
                )
                .eq("items.user_id", user.id)
                .eq("status", "on_the_way")
                .neq("renter_id", user.id)
                .order("start_date", { ascending: true });
            if (e7) throw e7;
            setEnRoute(onw || []);
        } catch (e) {
            console.error("Load owner requests failed:", e.message);
        } finally {
            setLoading(false);
        }
    }, [user?.id]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const approve = async (txId) => {
        setActionId(txId);
        try {
            const { error } = await supabase
                .from("rental_transactions")
                .update({ status: "confirmed" })
                .eq("rental_id", txId)
                .eq("status", "pending");
            if (error) {
                toast.error(
                    error.message?.includes("booked")
                        ? "Capacity exceeded: dates are fully booked."
                        : `Approve failed: ${error.message || "Unknown error"}`
                );
                throw error;
            } else {
                toast.success("Request approved");
            }
        } catch (e) {
            console.error("Approve failed:", e.message);
        } finally {
            setActionId(null);
            fetchData();
        }
    };

    const confirmReturn = async (txId) => {
        setActionId(txId);
        try {
            const { error } = await supabase
                .from("rental_transactions")
                .update({
                    status: "completed",
                    owner_confirmed_at: new Date().toISOString(),
                })
                .eq("rental_id", txId)
                .eq("status", "awaiting_owner_confirmation");
            if (error) {
                toast.error(
                    `Confirm return failed: ${error.message || "Unknown error"}`
                );
                throw error;
            } else {
                toast.success("Return confirmed. Rental completed.");
            }
        } catch (e) {
            console.error("Confirm return failed:", e.message);
        } finally {
            setActionId(null);
            fetchData();
        }
    };

    const holdReturn = async (txId) => {
        setActionId(txId);
        try {
            const { error } = await supabase
                .from("rental_transactions")
                .update({ owner_confirmed_at: new Date().toISOString() })
                .eq("rental_id", txId)
                .eq("status", "awaiting_owner_confirmation");
            if (error) {
                toast.error(`Hold failed: ${error.message || "Unknown error"}`);
                throw error;
            } else {
                toast.info(
                    "Return confirmed and item placed on hold (maintenance)."
                );
            }
        } catch (e) {
            console.error("Hold return failed:", e.message);
        } finally {
            setActionId(null);
            fetchData();
        }
    };

    const reportIssue = async (txId) => {
        setActionId(txId);
        try {
            const { error } = await supabase
                .from("rental_transactions")
                .update({ status: "disputed" })
                .eq("rental_id", txId)
                .eq("status", "awaiting_owner_confirmation");
            if (error) {
                toast.error(
                    `Report issue failed: ${error.message || "Unknown error"}`
                );
                throw error;
            } else {
                toast.info("Issue reported. Our team will review.");
            }
        } catch (e) {
            console.error("Report issue failed:", e.message);
        } finally {
            setActionId(null);
            fetchData();
        }
    };

    const reject = async (txId) => {
        setActionId(txId);
        try {
            const { error } = await supabase
                .from("rental_transactions")
                .update({ status: "rejected" })
                .eq("rental_id", txId)
                .eq("status", "pending");
            if (error) {
                toast.error(
                    `Reject failed: ${error.message || "Unknown error"}`
                );
                throw error;
            } else {
                toast.success("Request rejected");
            }
        } catch (e) {
            console.error("Reject failed:", e.message);
        } finally {
            setActionId(null);
            fetchData();
        }
    };

    const verifyDeposit = async (txId) => {
        setActionId(txId);
        try {
            const { error } = await supabase
                .from("rental_transactions")
                .update({ status: "on_the_way" })
                .eq("rental_id", txId)
                .eq("status", "deposit_submitted");
            if (error) {
                toast.error(
                    `Verify failed: ${error.message || "Unknown error"}`
                );
                throw error;
            } else {
                toast.success("Deposit verified. Marked as On the Way.");
            }
        } catch (e) {
            console.error("Verify deposit failed:", e.message);
        } finally {
            setActionId(null);
            fetchData();
        }
    };

    const declineDeposit = async (txId) => {
        setActionId(txId);
        try {
            const { error } = await supabase
                .from("rental_transactions")
                .update({ status: "confirmed", proof_of_deposit_url: null })
                .eq("rental_id", txId)
                .eq("status", "deposit_submitted");
            if (error) {
                toast.error(
                    `Decline failed: ${error.message || "Unknown error"}`
                );
                throw error;
            } else {
                toast.info("Deposit declined. Renter can re-upload.");
            }
        } catch (e) {
            console.error("Decline deposit failed:", e.message);
        } finally {
            setActionId(null);
            fetchData();
        }
    };

    const openProof = async (pathOrUrl, title = "Deposit Proof") => {
        try {
            if (!pathOrUrl) return;
            let url = pathOrUrl;
            if (!/^https?:\/\//i.test(pathOrUrl)) {
                const { data, error } = await supabase.storage
                    .from(PROOF_BUCKET)
                    .createSignedUrl(pathOrUrl, 300);
                if (error) throw error;
                url = data.signedUrl;
            }
            setProofTitle(title || "Deposit Proof");
            setProofSrc(url);
            setProofOpen(true);
        } catch (e) {
            toast.error(e.message || "Cannot open proof");
        }
    };

    if (!user) return <div className="p-6">Loading...</div>;

    const grouped = {
        pending: rows,
        confirmed: awaitingDepositOwner,
        deposit: combinedDeposits,
        onTheWay: enRoute,
        ongoing: ongoing,
        returned: awaiting,
        cancelled: cancelled,
        expired: expired,
    };

    const currentTab =
        BOOKING_TABS.find((t) => t.key === activeTab) || BOOKING_TABS[0];
    const currentData = grouped[activeTab] || [];

    return (
        <div className="min-h-screen bg-[#FAF5EF]">
            <TopMenu
                activePage="requests"
                favorites={favorites}
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
            />
            <div className="bg-gradient-to-br from-[#FFAB00]/5 via-transparent to-[#FFAB00]/5 border-b border-[#1E1E1E]/5">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
                        <div className="space-y-2">
                            <h1 className="text-4xl font-bold text-[#1E1E1E] tracking-tight">
                                Booking Requests
                            </h1>
                            <p className="text-base text-[#1E1E1E]/60">
                                Manage and track all rental requests in one
                                place
                            </p>
                        </div>
                        <Button
                            variant="outline"
                            onClick={fetchData}
                            disabled={loading}
                            className="cursor-pointer bg-white hover:bg-[#FAF5EF] border-[#1E1E1E]/20"
                        >
                            {loading && (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            )}{" "}
                            Refresh
                        </Button>
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
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-[#FFAB00]" />
                    </div>
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
                                    <BookingCard
                                        key={r.rental_id}
                                        rental={r}
                                        tabKey={activeTab}
                                        actionId={actionId}
                                        onApprove={approve}
                                        onReject={reject}
                                        onVerifyDeposit={verifyDeposit}
                                        onDeclineDeposit={declineDeposit}
                                        onConfirmReturn={confirmReturn}
                                        onHoldReturn={holdReturn}
                                        onReportIssue={reportIssue}
                                        onOpenProof={openProof}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            <ProofPreviewModal
                open={proofOpen}
                onOpenChange={setProofOpen}
                src={proofSrc}
                title={proofTitle}
            />
        </div>
    );
}

function BookingCard({
    rental,
    tabKey,
    actionId,
    onApprove,
    onReject,
    onVerifyDeposit,
    onDeclineDeposit,
    onConfirmReturn,
    onHoldReturn,
    onReportIssue,
    onOpenProof,
}) {
    return (
        <Card className="group bg-white border-[#1E1E1E]/10 shadow-md hover:shadow-2xl transition-all duration-300 hover:border-[#FFAB00]/40 hover:-translate-y-1 overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-[#FFAB00] via-[#FFAB00]/60 to-transparent" />
            <CardHeader className="pb-4">
                <div className="flex items-start justify-between gap-3">
                    <CardTitle className="text-base flex items-center gap-3 flex-1">
                        <ImagePreviewThumb
                            src={
                                rental.items?.main_image_url ||
                                "/placeholder.svg"
                            }
                            alt={rental.items?.title}
                        />
                        <span className="line-clamp-2 text-[#1E1E1E] font-bold leading-snug group-hover:text-[#FFAB00] transition-colors">
                            {rental.items?.title || "Item"}
                        </span>
                    </CardTitle>
                    <StatusBadge status={rental.status} />
                </div>
            </CardHeader>
            <CardContent className="text-sm space-y-5">
                <div className="bg-gradient-to-br from-[#FAF5EF] to-[#FAF5EF]/50 rounded-xl p-4 space-y-3 border border-[#1E1E1E]/5">
                    <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                        <div className="flex items-center gap-2">
                            <Calendar className="w-3.5 h-3.5 text-[#FFAB00]" />
                            <span className="text-[#1E1E1E]/60 text-xs font-medium">
                                Start Date
                            </span>
                        </div>
                        <div className="text-[#1E1E1E] font-bold text-xs">
                            {new Date(rental.start_date).toLocaleDateString()}
                        </div>
                        <div className="flex items-center gap-2">
                            <Calendar className="w-3.5 h-3.5 text-[#FFAB00]" />
                            <span className="text-[#1E1E1E]/60 text-xs font-medium">
                                End Date
                            </span>
                        </div>
                        <div className="text-[#1E1E1E] font-bold text-xs">
                            {new Date(rental.end_date).toLocaleDateString()}
                        </div>
                        <div className="flex items-center gap-2">
                            <User className="w-3.5 h-3.5 text-[#FFAB00]" />
                            <span className="text-[#1E1E1E]/60 text-xs font-medium">
                                Renter
                            </span>
                        </div>
                        <div className="text-[#1E1E1E] font-bold text-xs">
                            {rental.renter?.first_name || ""}{" "}
                            {rental.renter?.last_name || ""}
                        </div>
                        <div className="flex items-center gap-2">
                            <Package className="w-3.5 h-3.5 text-[#FFAB00]" />
                            <span className="text-[#1E1E1E]/60 text-xs font-medium">
                                Units
                            </span>
                        </div>
                        <div className="text-[#1E1E1E] font-bold text-xs">
                            {Number(rental.quantity || 1)}
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
                            ₱{Number(rental.total_cost || 0).toFixed(2)}
                        </div>
                    </div>
                </div>

                <ActionBar
                    tabKey={tabKey}
                    rental={rental}
                    actionId={actionId}
                    onApprove={onApprove}
                    onReject={onReject}
                    onVerifyDeposit={onVerifyDeposit}
                    onDeclineDeposit={onDeclineDeposit}
                    onConfirmReturn={onConfirmReturn}
                    onHoldReturn={onHoldReturn}
                    onReportIssue={onReportIssue}
                    onOpenProof={onOpenProof}
                />
            </CardContent>
        </Card>
    );
}

function ActionBar({
    tabKey,
    rental,
    actionId,
    onApprove,
    onReject,
    onVerifyDeposit,
    onDeclineDeposit,
    onConfirmReturn,
    onHoldReturn,
    onReportIssue,
    onOpenProof,
}) {
    const isLoading = actionId === rental.rental_id;

    return (
        <div className="pt-3 flex items-center justify-between gap-2 flex-wrap border-t border-[#1E1E1E]/10">
            <div className="flex gap-2 flex-wrap">
                <RequestDetailsDialog
                    row={rental}
                    awaiting={tabKey === "returned"}
                />

                {tabKey === "pending" && (
                    <>
                        <Button
                            size="sm"
                            className="bg-green-600 text-white hover:bg-green-700 cursor-pointer"
                            disabled={isLoading}
                            onClick={() => onApprove(rental.rental_id)}
                        >
                            {isLoading ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                "Approve"
                            )}
                        </Button>
                        <Button
                            size="sm"
                            variant="destructive"
                            className="cursor-pointer"
                            disabled={isLoading}
                            onClick={() => onReject(rental.rental_id)}
                        >
                            {isLoading ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                "Reject"
                            )}
                        </Button>
                    </>
                )}

                {tabKey === "confirmed" && (
                    <span className="text-xs text-[#1E1E1E]/60 py-2">
                        Waiting for renter to upload deposit
                    </span>
                )}

                {tabKey === "deposit" && rental._phase === "owner_review" && (
                    <>
                        {rental.proof_of_deposit_url && (
                            <Button
                                size="sm"
                                variant="outline"
                                className="cursor-pointer border-[#FFAB00] text-[#FFAB00] hover:bg-[#FFAB00]/10 bg-transparent"
                                onClick={() =>
                                    onOpenProof(
                                        rental.proof_of_deposit_url,
                                        rental.items?.title || "Deposit Proof"
                                    )
                                }
                            >
                                View Proof
                            </Button>
                        )}
                        <Button
                            size="sm"
                            className="bg-green-600 text-white hover:bg-green-700 cursor-pointer"
                            disabled={isLoading}
                            onClick={() => onVerifyDeposit(rental.rental_id)}
                        >
                            {isLoading ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                "Verify & Send"
                            )}
                        </Button>
                        <Button
                            size="sm"
                            variant="destructive"
                            className="cursor-pointer"
                            disabled={isLoading}
                            onClick={() => onDeclineDeposit(rental.rental_id)}
                        >
                            {isLoading ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                "Decline"
                            )}
                        </Button>
                    </>
                )}

                {tabKey === "deposit" &&
                    rental._phase === "awaiting_renter" && (
                        <span className="text-xs text-[#1E1E1E]/60 py-2">
                            Awaiting renter upload
                        </span>
                    )}

                {tabKey === "returned" && (
                    <>
                        {rental.owner_confirmed_at ? (
                            <Button
                                size="sm"
                                className="bg-green-600 text-white hover:bg-green-700 cursor-pointer"
                                disabled={isLoading}
                                onClick={() =>
                                    onConfirmReturn(rental.rental_id)
                                }
                            >
                                {isLoading ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    "Restock Now"
                                )}
                            </Button>
                        ) : (
                            <>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="cursor-pointer bg-transparent"
                                    disabled={isLoading}
                                    onClick={() =>
                                        onHoldReturn(rental.rental_id)
                                    }
                                >
                                    {isLoading ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        "Hold (maintenance)"
                                    )}
                                </Button>
                                <Button
                                    size="sm"
                                    className="bg-green-600 text-white hover:bg-green-700 cursor-pointer"
                                    disabled={isLoading}
                                    onClick={() =>
                                        onConfirmReturn(rental.rental_id)
                                    }
                                >
                                    {isLoading ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        "Confirm & Restock"
                                    )}
                                </Button>
                            </>
                        )}
                        <Button
                            size="sm"
                            variant="destructive"
                            className="cursor-pointer"
                            disabled={isLoading}
                            onClick={() => onReportIssue(rental.rental_id)}
                        >
                            {isLoading ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                "Report Issue"
                            )}
                        </Button>
                    </>
                )}
            </div>
        </div>
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

function RequestDetailsDialog({ row, awaiting = false }) {
    const [open, setOpen] = useState(false);
    const [unitsCount, setUnitsCount] = useState(null);

    useEffect(() => {
        if (!open) return;
        setUnitsCount(Number(row.quantity ?? 1));
    }, [open, row.quantity]);

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
                        {row.items?.title || "Request Details"}
                    </DialogTitle>
                </DialogHeader>
                <div className="mb-4">
                    <img
                        src={row.items?.main_image_url || "/vite.svg"}
                        alt={row.items?.title || "Item"}
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
                                Renter
                            </span>
                            <span className="text-[#1E1E1E] font-semibold">
                                {row.renter?.first_name || ""}{" "}
                                {row.renter?.last_name || ""}
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
                                {new Date(row.start_date).toLocaleDateString()}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-[#1E1E1E]/60 font-medium">
                                End
                            </span>
                            <span className="text-[#1E1E1E] font-semibold">
                                {new Date(row.end_date).toLocaleDateString()}
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
                            <StatusBadge status={row.status} />
                        </div>
                        <div className="flex justify-between items-center pt-2 border-t border-[#1E1E1E]/10">
                            <span className="text-[#1E1E1E] font-bold">
                                Total
                            </span>
                            <span className="text-[#FFAB00] font-bold text-lg">
                                ₱{Number(row.total_cost || 0).toFixed(2)}
                            </span>
                        </div>
                    </div>
                    {awaiting && (
                        <div className="space-y-2 pt-2 border-t border-[#1E1E1E]/10">
                            <div className="flex justify-between">
                                <span className="text-[#1E1E1E]/60 font-medium">
                                    Renter Marked
                                </span>
                                <span className="text-[#1E1E1E] font-semibold text-xs">
                                    {row.renter_return_marked_at
                                        ? new Date(
                                              row.renter_return_marked_at
                                          ).toLocaleString()
                                        : "—"}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-[#1E1E1E]/60 font-medium">
                                    Owner Confirmed
                                </span>
                                <span className="text-[#1E1E1E] font-semibold text-xs">
                                    {row.owner_confirmed_at
                                        ? new Date(
                                              row.owner_confirmed_at
                                          ).toLocaleString()
                                        : "—"}
                                </span>
                            </div>
                        </div>
                    )}
                </div>
                <DialogFooter>
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

function ProofPreviewModal({ open, onOpenChange, src, title }) {
    const isPdf = typeof src === "string" && src.toLowerCase().includes(".pdf");
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl bg-white">
                <DialogHeader>
                    <DialogTitle className="text-[#1E1E1E]">
                        {title || "Deposit Proof"}
                    </DialogTitle>
                </DialogHeader>
                <div className="w-full max-h-[70vh] overflow-auto">
                    {src ? (
                        isPdf ? (
                            <iframe
                                src={src}
                                title={title || "Deposit Proof"}
                                className="w-full h-[70vh] border rounded"
                            />
                        ) : (
                            <img
                                src={src || "/placeholder.svg"}
                                alt={title || "Deposit Proof"}
                                className="w-full h-auto rounded border"
                            />
                        )
                    ) : (
                        <div className="text-sm text-gray-600">
                            No proof available.
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
