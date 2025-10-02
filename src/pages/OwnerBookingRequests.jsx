import { useEffect, useMemo, useState, useCallback } from "react";
import { supabase } from "../../supabaseClient";
import { useUser } from "../hooks/useUser";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Loader2 } from "lucide-react";
const PROOF_BUCKET = "proof-of-deposit";
import TopMenu from "../components/topMenu";
import { useToastApi } from "@/components/ui/toast";
import {
    Dialog,
    DialogContent,
    DialogTrigger,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";

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
    const [deposits, setDeposits] = useState([]); // deposit_submitted
    const [enRoute, setEnRoute] = useState([]); // on_the_way
    const [cancelled, setCancelled] = useState([]);
    const [loading, setLoading] = useState(false);
    const [actionId, setActionId] = useState(null);

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

            // Fetch expired (auto-expired or manually expired) requests for this owner
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

            // Fetch ongoing/confirmed rentals for this owner
            const { data: ong, error: e4 } = await supabase
                .from("rental_transactions")
                .select(
                    `rental_id,item_id,renter_id,start_date,end_date,total_cost,status,quantity,proof_of_deposit_url,
                     items!inner(title,user_id,main_image_url),
                     renter:renter_id ( first_name,last_name )`
                )
                .eq("items.user_id", user.id)
                .in("status", ["confirmed", "ongoing"]) // note: deposit_submitted and on_the_way are separated
                .neq("renter_id", user.id)
                .order("start_date", { ascending: true });
            if (e4) throw e4;
            setOngoing(ong || []);

            // Fetch cancelled for this owner
            const { data: canx, error: e5 } = await supabase
                .from("rental_transactions")
                .select(
                    `rental_id,item_id,renter_id,start_date,end_date,total_cost,status,quantity,
                     items!inner(title,user_id,main_image_url),
                     renter:renter_id ( first_name,last_name )`
                )
                .eq("items.user_id", user.id)
                .eq("status", "cancelled")
                .neq("renter_id", user.id)
                .order("created_at", { ascending: false });
            if (e5) throw e5;
            setCancelled(canx || []);

            // Fetch deposit_submitted for verification
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

            // Fetch on_the_way deliveries
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
                // Surface capacity violation or other errors
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

    // Mark owner confirmation but keep status awaiting_owner_confirmation
    // This keeps capacity reserved (held for maintenance) per current availability rules.
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
                .update({ status: "confirmed", proof_of_deposit_url: null }) // back to confirmed, ask renter to re-upload
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

    const openProof = async (pathOrUrl) => {
        try {
            if (!pathOrUrl) return;
            if (/^https?:\/\//i.test(pathOrUrl)) {
                window.open(pathOrUrl, "_blank");
                return;
            }
            const { data, error } = await supabase.storage
                .from(PROOF_BUCKET)
                .createSignedUrl(pathOrUrl, 300);
            if (error) throw error;
            window.open(data.signedUrl, "_blank");
        } catch (e) {
            toast.error(e.message || "Cannot open proof");
        }
    };

    if (!user) return <div className="p-6">Loading...</div>;

    return (
        <div className="bg-[#FFFBF2] min-h-screen">
            <TopMenu
                activePage="requests"
                favorites={favorites}
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
            />
            <div className="max-w-5xl mx-auto p-6">
                <h1 className="text-2xl font-bold mb-1">Booking Requests</h1>
                <p className="text-gray-600 mb-4">
                    Pending requests for items you own
                </p>
                <div className="flex justify-end mb-3">
                    <Button
                        variant="outline"
                        onClick={fetchData}
                        disabled={loading}
                        className="cursor-pointer"
                    >
                        {loading && (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        )}{" "}
                        Refresh
                    </Button>
                </div>
                <div className="bg-white rounded-lg shadow-sm border p-4">
                    {loading ? (
                        <div className="text-sm text-gray-600">
                            Loading requests…
                        </div>
                    ) : rows.length === 0 ? (
                        <div className="text-sm text-gray-600">
                            No pending requests.
                        </div>
                    ) : (
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b bg-gray-50">
                                    <th className="p-2">Item</th>
                                    <th className="p-2">Renter</th>
                                    <th className="p-2">Dates</th>
                                    <th className="p-2">Total</th>
                                    <th className="p-2">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map((r) => (
                                    <tr key={r.rental_id} className="border-b">
                                        <td className="p-2 text-sm">
                                            <div className="flex items-center gap-2">
                                                <ImagePreviewThumb
                                                    src={
                                                        r.items?.main_image_url
                                                    }
                                                    alt={r.items?.title}
                                                    size={40}
                                                />
                                                <span>
                                                    {r.items?.title ||
                                                        r.item_id}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="p-2 text-sm">
                                            {r.renter?.first_name}{" "}
                                            {r.renter?.last_name}
                                        </td>
                                        <td className="p-2 text-sm">
                                            {new Date(
                                                r.start_date
                                            ).toLocaleDateString()}{" "}
                                            —{" "}
                                            {new Date(
                                                r.end_date
                                            ).toLocaleDateString()}
                                        </td>
                                        <td className="p-2 text-sm">
                                            ₱
                                            {Number(r.total_cost || 0).toFixed(
                                                2
                                            )}
                                        </td>
                                        <td className="p-2">
                                            <div className="flex gap-2">
                                                <RequestDetailsDialog row={r} />
                                                <Button
                                                    size="sm"
                                                    className="bg-green-600 text-white hover:bg-green-700 cursor-pointer"
                                                    disabled={
                                                        actionId === r.rental_id
                                                    }
                                                    onClick={() =>
                                                        approve(r.rental_id)
                                                    }
                                                >
                                                    {actionId ===
                                                    r.rental_id ? (
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                    ) : (
                                                        "Approve"
                                                    )}
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="destructive"
                                                    className="cursor-pointer"
                                                    disabled={
                                                        actionId === r.rental_id
                                                    }
                                                    onClick={() =>
                                                        reject(r.rental_id)
                                                    }
                                                >
                                                    {actionId ===
                                                    r.rental_id ? (
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                    ) : (
                                                        "Reject"
                                                    )}
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                <h2 className="text-xl font-semibold mt-8 mb-2">
                    Deposits to Verify
                </h2>
                <div className="bg-white rounded-lg shadow-sm border p-4">
                    {loading ? (
                        <div className="text-sm text-gray-600">Loading…</div>
                    ) : deposits.length === 0 ? (
                        <div className="text-sm text-gray-600">
                            No deposits awaiting verification.
                        </div>
                    ) : (
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b bg-gray-50">
                                    <th className="p-2">Item</th>
                                    <th className="p-2">Renter</th>
                                    <th className="p-2">Dates</th>
                                    <th className="p-2">Proof</th>
                                    <th className="p-2">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {deposits.map((r) => (
                                    <tr key={r.rental_id} className="border-b">
                                        <td className="p-2 text-sm">
                                            <div className="flex items-center gap-2">
                                                <ImagePreviewThumb
                                                    src={
                                                        r.items?.main_image_url
                                                    }
                                                    alt={r.items?.title}
                                                    size={40}
                                                />
                                                <span>
                                                    {r.items?.title ||
                                                        r.item_id}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="p-2 text-sm">
                                            {r.renter?.first_name}{" "}
                                            {r.renter?.last_name}
                                        </td>
                                        <td className="p-2 text-sm">
                                            {new Date(
                                                r.start_date
                                            ).toLocaleDateString()}{" "}
                                            —{" "}
                                            {new Date(
                                                r.end_date
                                            ).toLocaleDateString()}
                                        </td>
                                        <td className="p-2 text-sm">
                                            {r.proof_of_deposit_url ? (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="cursor-pointer"
                                                    onClick={() =>
                                                        openProof(
                                                            r.proof_of_deposit_url
                                                        )
                                                    }
                                                >
                                                    View Proof
                                                </Button>
                                            ) : (
                                                "—"
                                            )}
                                        </td>
                                        <td className="p-2">
                                            <div className="flex gap-2">
                                                <Button
                                                    size="sm"
                                                    className="bg-green-600 text-white hover:bg-green-700 cursor-pointer"
                                                    disabled={
                                                        actionId === r.rental_id
                                                    }
                                                    onClick={() =>
                                                        verifyDeposit(
                                                            r.rental_id
                                                        )
                                                    }
                                                >
                                                    {actionId ===
                                                    r.rental_id ? (
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                    ) : (
                                                        "Verify & Send"
                                                    )}
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="destructive"
                                                    className="cursor-pointer"
                                                    disabled={
                                                        actionId === r.rental_id
                                                    }
                                                    onClick={() =>
                                                        declineDeposit(
                                                            r.rental_id
                                                        )
                                                    }
                                                >
                                                    {actionId ===
                                                    r.rental_id ? (
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                    ) : (
                                                        "Decline"
                                                    )}
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                <h2 className="text-xl font-semibold mt-8 mb-2">On The Way</h2>
                <div className="bg-white rounded-lg shadow-sm border p-4">
                    {loading ? (
                        <div className="text-sm text-gray-600">Loading…</div>
                    ) : enRoute.length === 0 ? (
                        <div className="text-sm text-gray-600">
                            No deliveries in transit.
                        </div>
                    ) : (
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b bg-gray-50">
                                    <th className="p-2">Item</th>
                                    <th className="p-2">Renter</th>
                                    <th className="p-2">Dates</th>
                                    <th className="p-2">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {enRoute.map((r) => (
                                    <tr key={r.rental_id} className="border-b">
                                        <td className="p-2 text-sm">
                                            <div className="flex items-center gap-2">
                                                <ImagePreviewThumb
                                                    src={
                                                        r.items?.main_image_url
                                                    }
                                                    alt={r.items?.title}
                                                    size={40}
                                                />
                                                <span>
                                                    {r.items?.title ||
                                                        r.item_id}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="p-2 text-sm">
                                            {r.renter?.first_name}{" "}
                                            {r.renter?.last_name}
                                        </td>
                                        <td className="p-2 text-sm">
                                            {new Date(
                                                r.start_date
                                            ).toLocaleDateString()}{" "}
                                            —{" "}
                                            {new Date(
                                                r.end_date
                                            ).toLocaleDateString()}
                                        </td>
                                        <td className="p-2 text-sm capitalize">
                                            {r.status}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
                <h2 className="text-xl font-semibold mt-8 mb-2">
                    Awaiting Owner Confirmation
                </h2>
                <div className="bg-white rounded-lg shadow-sm border p-4">
                    {loading ? (
                        <div className="text-sm text-gray-600">Loading…</div>
                    ) : awaiting.length === 0 ? (
                        <div className="text-sm text-gray-600">
                            No returns awaiting confirmation.
                        </div>
                    ) : (
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b bg-gray-50">
                                    <th className="p-2">Item</th>
                                    <th className="p-2">Renter</th>
                                    <th className="p-2">Dates</th>
                                    <th className="p-2">Marked Returned</th>
                                    <th className="p-2">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {awaiting.map((r) => (
                                    <tr key={r.rental_id} className="border-b">
                                        <td className="p-2 text-sm">
                                            <div className="flex items-center gap-2">
                                                <ImagePreviewThumb
                                                    src={
                                                        r.items?.main_image_url
                                                    }
                                                    alt={r.items?.title}
                                                    size={40}
                                                />
                                                <span>
                                                    {r.items?.title ||
                                                        r.item_id}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="p-2 text-sm">
                                            {r.renter?.first_name}{" "}
                                            {r.renter?.last_name}
                                        </td>
                                        <td className="p-2 text-sm">
                                            {new Date(
                                                r.start_date
                                            ).toLocaleDateString()}{" "}
                                            —{" "}
                                            {new Date(
                                                r.end_date
                                            ).toLocaleDateString()}
                                        </td>
                                        <td className="p-2 text-sm">
                                            {r.renter_return_marked_at
                                                ? new Date(
                                                      r.renter_return_marked_at
                                                  ).toLocaleString()
                                                : "—"}
                                        </td>
                                        <td className="p-2">
                                            <div className="flex gap-2">
                                                <RequestDetailsDialog
                                                    row={r}
                                                    awaiting
                                                />
                                                {r.owner_confirmed_at ? (
                                                    <Button
                                                        size="sm"
                                                        className="bg-green-600 text-white hover:bg-green-700 cursor-pointer"
                                                        disabled={
                                                            actionId ===
                                                            r.rental_id
                                                        }
                                                        onClick={() =>
                                                            confirmReturn(
                                                                r.rental_id
                                                            )
                                                        }
                                                    >
                                                        {actionId ===
                                                        r.rental_id ? (
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
                                                            className="cursor-pointer"
                                                            disabled={
                                                                actionId ===
                                                                r.rental_id
                                                            }
                                                            onClick={() =>
                                                                holdReturn(
                                                                    r.rental_id
                                                                )
                                                            }
                                                        >
                                                            {actionId ===
                                                            r.rental_id ? (
                                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                            ) : (
                                                                "Hold (maintenance)"
                                                            )}
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            className="bg-green-600 text-white hover:bg-green-700 cursor-pointer"
                                                            disabled={
                                                                actionId ===
                                                                r.rental_id
                                                            }
                                                            onClick={() =>
                                                                confirmReturn(
                                                                    r.rental_id
                                                                )
                                                            }
                                                        >
                                                            {actionId ===
                                                            r.rental_id ? (
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
                                                    disabled={
                                                        actionId === r.rental_id
                                                    }
                                                    onClick={() =>
                                                        reportIssue(r.rental_id)
                                                    }
                                                >
                                                    {actionId ===
                                                    r.rental_id ? (
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                    ) : (
                                                        "Report Issue"
                                                    )}
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                <h2 className="text-xl font-semibold mt-8 mb-2">
                    Ongoing Rentals
                </h2>
                <div className="bg-white rounded-lg shadow-sm border p-4">
                    {loading ? (
                        <div className="text-sm text-gray-600">Loading…</div>
                    ) : ongoing.length === 0 ? (
                        <div className="text-sm text-gray-600">
                            No ongoing rentals.
                        </div>
                    ) : (
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b bg-gray-50">
                                    <th className="p-2">Item</th>
                                    <th className="p-2">Renter</th>
                                    <th className="p-2">Dates</th>
                                    <th className="p-2">Total</th>
                                    <th className="p-2">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {ongoing.map((r) => (
                                    <tr key={r.rental_id} className="border-b">
                                        <td className="p-2 text-sm">
                                            <div className="flex items-center gap-2">
                                                <ImagePreviewThumb
                                                    src={
                                                        r.items?.main_image_url
                                                    }
                                                    alt={r.items?.title}
                                                    size={40}
                                                />
                                                <span>
                                                    {r.items?.title ||
                                                        r.item_id}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="p-2 text-sm">
                                            {r.renter?.first_name}{" "}
                                            {r.renter?.last_name}
                                        </td>
                                        <td className="p-2 text-sm">
                                            {new Date(
                                                r.start_date
                                            ).toLocaleDateString()}{" "}
                                            —{" "}
                                            {new Date(
                                                r.end_date
                                            ).toLocaleDateString()}
                                        </td>
                                        <td className="p-2 text-sm">
                                            ₱
                                            {Number(r.total_cost || 0).toFixed(
                                                2
                                            )}
                                        </td>
                                        <td className="p-2 text-sm capitalize">
                                            {r.status}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                <h2 className="text-xl font-semibold mt-8 mb-2">
                    Cancelled Bookings
                </h2>
                <div className="bg-white rounded-lg shadow-sm border p-4">
                    {loading ? (
                        <div className="text-sm text-gray-600">Loading…</div>
                    ) : cancelled.length === 0 ? (
                        <div className="text-sm text-gray-600">
                            No cancelled bookings.
                        </div>
                    ) : (
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b bg-gray-50">
                                    <th className="p-2">Item</th>
                                    <th className="p-2">Renter</th>
                                    <th className="p-2">Dates</th>
                                    <th className="p-2">Total</th>
                                    <th className="p-2">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {cancelled.map((r) => (
                                    <tr key={r.rental_id} className="border-b">
                                        <td className="p-2 text-sm">
                                            <div className="flex items-center gap-2">
                                                <ImagePreviewThumb
                                                    src={
                                                        r.items?.main_image_url
                                                    }
                                                    alt={r.items?.title}
                                                    size={40}
                                                />
                                                <span>
                                                    {r.items?.title ||
                                                        r.item_id}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="p-2 text-sm">
                                            {r.renter?.first_name}{" "}
                                            {r.renter?.last_name}
                                        </td>
                                        <td className="p-2 text-sm">
                                            {new Date(
                                                r.start_date
                                            ).toLocaleDateString()}{" "}
                                            —{" "}
                                            {new Date(
                                                r.end_date
                                            ).toLocaleDateString()}
                                        </td>
                                        <td className="p-2 text-sm">
                                            ₱
                                            {Number(r.total_cost || 0).toFixed(
                                                2
                                            )}
                                        </td>
                                        <td className="p-2 text-sm capitalize">
                                            {r.status}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                <h2 className="text-xl font-semibold mt-8 mb-2">Expired</h2>
                <div className="bg-white rounded-lg shadow-sm border p-4">
                    {loading ? (
                        <div className="text-sm text-gray-600">Loading…</div>
                    ) : expired.length === 0 ? (
                        <div className="text-sm text-gray-600">
                            No expired requests.
                        </div>
                    ) : (
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b bg-gray-50">
                                    <th className="p-2">Item</th>
                                    <th className="p-2">Renter</th>
                                    <th className="p-2">Dates</th>
                                    <th className="p-2">Total</th>
                                    <th className="p-2">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {expired.map((r) => (
                                    <tr key={r.rental_id} className="border-b">
                                        <td className="p-2 text-sm">
                                            <div className="flex items-center gap-2">
                                                <ImagePreviewThumb
                                                    src={
                                                        r.items?.main_image_url
                                                    }
                                                    alt={r.items?.title}
                                                    size={40}
                                                />
                                                <span>
                                                    {r.items?.title ||
                                                        r.item_id}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="p-2 text-sm">
                                            {r.renter?.first_name}{" "}
                                            {r.renter?.last_name}
                                        </td>
                                        <td className="p-2 text-sm">
                                            {new Date(
                                                r.start_date
                                            ).toLocaleDateString()}{" "}
                                            —{" "}
                                            {new Date(
                                                r.end_date
                                            ).toLocaleDateString()}
                                        </td>
                                        <td className="p-2 text-sm">
                                            ₱
                                            {Number(r.total_cost || 0).toFixed(
                                                2
                                            )}
                                        </td>
                                        <td className="p-2 text-sm capitalize">
                                            {r.status}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
}

function ImagePreviewThumb({ src, alt, size = 40 }) {
    const imgSrc = src || "/vite.svg";
    return (
        <Dialog>
            <DialogTrigger asChild>
                <img
                    src={imgSrc}
                    alt={alt || "Item"}
                    className="object-cover rounded border cursor-pointer"
                    style={{ width: size, height: size }}
                    onError={(e) => (e.currentTarget.style.display = "none")}
                />
            </DialogTrigger>
            <DialogContent className="max-w-2xl p-0">
                <img
                    src={imgSrc}
                    alt={alt || "Item"}
                    className="w-full h-auto rounded-md"
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
        // Units involved is simply this row's quantity
        setUnitsCount(Number(row.quantity ?? 1));
    }, [open, row.quantity]);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="cursor-pointer">
                    View
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>
                        {row.items?.title || "Request Details"}
                    </DialogTitle>
                </DialogHeader>
                <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                        <span>Renter</span>
                        <span>
                            {row.renter?.first_name || ""}{" "}
                            {row.renter?.last_name || ""}
                        </span>
                    </div>
                    <div className="flex justify-between">
                        <span>Start</span>
                        <span>
                            {new Date(row.start_date).toLocaleDateString()}
                        </span>
                    </div>
                    <div className="flex justify-between">
                        <span>End</span>
                        <span>
                            {new Date(row.end_date).toLocaleDateString()}
                        </span>
                    </div>
                    <div className="flex justify-between">
                        <span>Status</span>
                        <span className="capitalize">{row.status}</span>
                    </div>
                    <div className="flex justify-between">
                        <span>Total</span>
                        <span>₱{Number(row.total_cost || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span>Units involved</span>
                        <span>{unitsCount ?? "—"}</span>
                    </div>
                    {awaiting && (
                        <div className="flex justify-between">
                            <span>Renter Marked</span>
                            <span>
                                {row.renter_return_marked_at
                                    ? new Date(
                                          row.renter_return_marked_at
                                      ).toLocaleString()
                                    : "—"}
                            </span>
                        </div>
                    )}
                    {awaiting && (
                        <div className="flex justify-between">
                            <span>Owner Confirmed</span>
                            <span>
                                {row.owner_confirmed_at
                                    ? new Date(
                                          row.owner_confirmed_at
                                      ).toLocaleString()
                                    : "—"}
                            </span>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
