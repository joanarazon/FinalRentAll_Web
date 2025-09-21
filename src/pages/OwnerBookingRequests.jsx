import { useEffect, useMemo, useState, useCallback } from "react";
import { supabase } from "../../supabaseClient";
import { useUser } from "../hooks/useUser";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Loader2 } from "lucide-react";
import TopMenu from "../components/topMenu";
import { useToastApi } from "@/components/ui/toast";

export default function OwnerBookingRequests({
    favorites,
    searchTerm,
    setSearchTerm,
}) {
    const user = useUser();
    const toast = useToastApi();
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(false);
    const [actionId, setActionId] = useState(null);

    const fetchData = useCallback(async () => {
        if (!user?.id) return;
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from("rental_transactions")
                .select(
                    `rental_id,item_id,renter_id,start_date,end_date,total_cost,status,
                     items!inner(title,user_id),
                     renter:renter_id ( first_name,last_name )`
                )
                .eq("items.user_id", user.id)
                .eq("status", "pending")
                .neq("renter_id", user.id)
                .order("start_date", { ascending: true });
            if (error) throw error;
            const filtered = (data || []).filter(
                (r) => r.renter_id && r.renter_id !== user.id
            );
            setRows(filtered);
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
                                            {r.items?.title || r.item_id}
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
            </div>
        </div>
    );
}
