import React, { useEffect, useMemo, useState } from "react";
import AdminLayout from "../../../components/AdminLayout";
import { supabase } from "../../../../supabaseClient";
import { Button } from "@/components/ui/button";
import { CalendarIcon, Loader2, Search } from "lucide-react";
import { useToastApi } from "@/components/ui/toast";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";

// Admin page: list pending rental bookings (status='pending') for approval / rejection
export default function PendingBookings() {
    const toast = useToastApi();
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(false);
    const [actionId, setActionId] = useState(null); // rental currently being processed
    const [error, setError] = useState(null);

    // Filters
    const [filterItem, setFilterItem] = useState("");
    const [filterRenter, setFilterRenter] = useState("");
    const [filterDate, setFilterDate] = useState(null); // start_date filter

    const fetchPending = async () => {
        const MIN_DURATION = 800; // smooth loading
        const started = performance.now();
        try {
            setLoading(true);
            setError(null);
            const { data, error: qErr } = await supabase
                .from("rental_transactions")
                .select(
                    `rental_id,item_id,renter_id,start_date,end_date,status,created_at,total_cost,proof_of_deposit_url, items:item_id ( title, main_image_url ), renter:renter_id ( first_name,last_name )`
                )
                .eq("status", "pending")
                .order("created_at", { ascending: false });
            if (qErr) throw qErr;
            setRows(data || []);
        } catch (e) {
            setError(e.message);
            toast.error("Failed to load pending bookings: " + e.message);
        } finally {
            const elapsed = performance.now() - started;
            const remain = MIN_DURATION - elapsed;
            if (remain > 0) await new Promise((r) => setTimeout(r, remain));
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPending();
    }, []);

    const filtered = useMemo(() => {
        return rows.filter((r) => {
            const itemTitle = r.items?.title?.toLowerCase() || "";
            const renterName = `${r.renter?.first_name || ""} ${
                r.renter?.last_name || ""
            }`
                .trim()
                .toLowerCase();
            if (filterItem && !itemTitle.includes(filterItem.toLowerCase()))
                return false;
            if (
                filterRenter &&
                !renterName.includes(filterRenter.toLowerCase())
            )
                return false;
            if (filterDate) {
                try {
                    const start = new Date(r.start_date);
                    if (start.toDateString() !== filterDate.toDateString())
                        return false;
                } catch {
                    /* ignore */
                }
            }
            return true;
        });
    }, [rows, filterItem, filterRenter, filterDate]);

    const approve = async (rentalId) => {
        setActionId(rentalId);
        try {
            const { error: upErr } = await supabase
                .from("rental_transactions")
                .update({ status: "confirmed" })
                .eq("rental_id", rentalId)
                .eq("status", "pending");
            if (upErr) throw upErr;
            // Activity log
            await supabase.from("activity_log").insert([
                {
                    action_type: "booking_approve",
                    description: `Approved booking ${rentalId}`,
                    target_table: "rental_transactions",
                    target_id: rentalId,
                },
            ]);
            toast.success("Booking approved");
            fetchPending();
        } catch (e) {
            toast.error("Approve failed: " + e.message);
        } finally {
            setActionId(null);
        }
    };

    const reject = async (rentalId) => {
        setActionId(rentalId);
        try {
            const { error: upErr } = await supabase
                .from("rental_transactions")
                .update({ status: "rejected" })
                .eq("rental_id", rentalId)
                .eq("status", "pending");
            if (upErr) throw upErr;
            await supabase.from("activity_log").insert([
                {
                    action_type: "booking_reject",
                    description: `Rejected booking ${rentalId}`,
                    target_table: "rental_transactions",
                    target_id: rentalId,
                },
            ]);
            toast.success("Booking rejected");
            fetchPending();
        } catch (e) {
            toast.error("Reject failed: " + e.message);
        } finally {
            setActionId(null);
        }
    };

    const formatDate = (iso) => {
        try {
            return format(new Date(iso), "yyyy-MM-dd");
        } catch {
            return iso;
        }
    };

    return (
        <AdminLayout className="bg-[#FFFBF2] min-h-screen">
            <div className="p-6">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                        Pending Bookings 🕒
                    </h1>
                    <p className="text-gray-600">
                        Review and approve rental booking requests.
                    </p>
                </div>

                <div className="flex flex-col lg:flex-row gap-4 mb-6">
                    <div className="relative flex-1">
                        <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                            value={filterItem}
                            onChange={(e) => setFilterItem(e.target.value)}
                            placeholder="Item Title"
                            className="border py-3 pl-9 pr-3 rounded w-full focus:outline-none focus:ring-2 focus:ring-orange-300"
                        />
                    </div>
                    <input
                        value={filterRenter}
                        onChange={(e) => setFilterRenter(e.target.value)}
                        placeholder="Renter Name"
                        className="border py-3 px-4 rounded w-full lg:w-1/3 focus:outline-none focus:ring-2 focus:ring-orange-300"
                    />
                    <div className="w-full lg:w-1/3">
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    className="w-full justify-start text-left font-normal"
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {filterDate
                                        ? filterDate.toLocaleDateString()
                                        : "Start Date"}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent
                                className="w-auto p-0"
                                align="start"
                            >
                                <Calendar
                                    mode="single"
                                    selected={filterDate}
                                    onSelect={setFilterDate}
                                    disabled={(d) => d > new Date()}
                                    captionLayout="dropdown"
                                    fromYear={1900}
                                    toYear={new Date().getFullYear()}
                                />
                                {filterDate && (
                                    <div className="p-2 pt-0 text-right">
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => setFilterDate(null)}
                                        >
                                            Clear
                                        </Button>
                                    </div>
                                )}
                            </PopoverContent>
                        </Popover>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-10">
                    <div className="flex justify-between items-center mb-3">
                        <p className="text-sm text-gray-600">
                            {loading
                                ? "Loading pending bookings..."
                                : `${filtered.length} pending booking${
                                      filtered.length !== 1 ? "s" : ""
                                  }`}
                        </p>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={fetchPending}
                                disabled={loading}
                            >
                                {loading && (
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                )}
                                Refresh
                            </Button>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b bg-gray-50">
                                    <th className="p-2">Booking ID</th>
                                    <th className="p-2">Item</th>
                                    <th className="p-2">Renter</th>
                                    <th className="p-2">Dates</th>
                                    <th className="p-2">Total Cost</th>
                                    <th className="p-2">Requested</th>
                                    <th className="p-2">Deposit</th>
                                    <th className="p-2">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading && (
                                    <tr>
                                        <td
                                            colSpan={8}
                                            className="p-4 text-center text-sm text-gray-500"
                                        >
                                            <div className="flex items-center justify-center gap-2">
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                Fetching...
                                            </div>
                                        </td>
                                    </tr>
                                )}
                                {!loading && filtered.length === 0 && (
                                    <tr>
                                        <td
                                            colSpan={8}
                                            className="p-4 text-center text-sm text-gray-500"
                                        >
                                            No pending bookings match current
                                            filters.
                                        </td>
                                    </tr>
                                )}
                                {!loading &&
                                    filtered.map((r) => {
                                        const renterName =
                                            `${r.renter?.first_name || ""} ${
                                                r.renter?.last_name || ""
                                            }`.trim() || "(No Name)";
                                        return (
                                            <tr
                                                key={r.rental_id}
                                                className="border-b hover:bg-gray-50 transition"
                                            >
                                                <td className="p-2 font-mono text-xs break-all min-w-[140px] text-orange-600">
                                                    {r.rental_id}
                                                </td>
                                                <td className="p-2">
                                                    <div className="flex items-center gap-2">
                                                        {r.items
                                                            ?.main_image_url && (
                                                            <img
                                                                src={
                                                                    r.items
                                                                        .main_image_url
                                                                }
                                                                alt="item"
                                                                className="w-10 h-10 object-cover rounded border"
                                                            />
                                                        )}
                                                        <span className="text-sm font-medium">
                                                            {r.items?.title ||
                                                                "—"}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="p-2 text-sm">
                                                    {renterName}
                                                </td>
                                                <td className="p-2 text-sm">
                                                    {formatDate(r.start_date)} →{" "}
                                                    {formatDate(r.end_date)}
                                                </td>
                                                <td className="p-2 text-sm">
                                                    ₱
                                                    {Number(
                                                        r.total_cost || 0
                                                    ).toFixed(2)}
                                                </td>
                                                <td className="p-2 text-xs text-gray-500">
                                                    {formatDate(r.created_at)}
                                                </td>
                                                <td className="p-2 text-xs">
                                                    {r.proof_of_deposit_url ? (
                                                        <a
                                                            href={
                                                                r.proof_of_deposit_url
                                                            }
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="text-blue-600 underline"
                                                        >
                                                            View
                                                        </a>
                                                    ) : (
                                                        <span className="text-gray-400">
                                                            None
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="p-2">
                                                    <div className="flex gap-2">
                                                        <Button
                                                            size="sm"
                                                            className="bg-green-600 hover:bg-green-700 cursor-pointer"
                                                            disabled={
                                                                actionId ===
                                                                r.rental_id
                                                            }
                                                            onClick={() =>
                                                                approve(
                                                                    r.rental_id
                                                                )
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
                                                                actionId ===
                                                                r.rental_id
                                                            }
                                                            onClick={() =>
                                                                reject(
                                                                    r.rental_id
                                                                )
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
                                        );
                                    })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}
