"use client";

import { useEffect, useMemo, useState } from "react";
import { useUser } from "../../../hooks/useUser";
import AdminLayout from "../../../components/AdminLayout";
import { supabase } from "../../../../supabaseClient";
import { Calendar } from "@/components/ui/calendar";
import {
    Popover,
    PopoverTrigger,
    PopoverContent,
} from "@/components/ui/popover";
import {
    Search,
    Filter,
    Calendar as CalendarIcon,
    Package,
} from "lucide-react";

function ViewRentingHistory() {
    const user = useUser();
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(false);
    const [categories, setCategories] = useState([]);

    // Filters
    const [itemName, setItemName] = useState("");
    const [itemPicture, setItemPicture] = useState("");
    const [status, setStatus] = useState("");
    const [categoryId, setCategoryId] = useState("");
    const [dateRange, setDateRange] = useState({ from: null, to: null });

    const [selectedImage, setSelectedImage] = useState(null);
    const [isImageModalOpen, setIsImageModalOpen] = useState(false);

    // Fetch categories for dropdown
    useEffect(() => {
        (async () => {
            try {
                const { data, error } = await supabase
                    .from("categories")
                    .select("category_id,name")
                    .order("name");
                if (error) throw error;
                setCategories(data || []);
            } catch {
                setCategories([]);
            }
        })();
    }, []);

    const fetchHistory = async () => {
        setLoading(true);
        try {
            // Base query with joins
            let query = supabase
                .from("rental_transactions")
                .select(
                    `rental_id, start_date, end_date, status, total_cost, quantity, created_at,
           items:items ( item_id, title, category_id, main_image_url )`
                )
                .order("created_at", { ascending: false });

            // Server-side filters
            if (status) query = query.eq("status", status);
            if (itemName) query = query.ilike("items.title", `%${itemName}%`);
            if (itemPicture) query = query.ilike("items.main_image_url", `%${itemPicture}%`);
            if (categoryId)
                query = query.eq("items.category_id", Number(categoryId));
            if (dateRange?.from)
                query = query.gte("start_date", dateRange.from.toISOString());
            if (dateRange?.to)
                query = query.lte("start_date", dateRange.to.toISOString());

            const { data, error } = await query;
            if (error) throw error;
            setRows(data || []);
        } catch (e) {
            console.error("Fetch renting history failed:", e.message || e);
            setRows([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchHistory();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [itemName, status, categoryId, dateRange?.from, dateRange?.to]);

    const filtered = useMemo(() => rows, [rows]);

    const statusBadge = (s) => {
        const st = String(s || "").toLowerCase();
        const map = {
            completed: "bg-green-100 text-green-700",
            pending: "bg-yellow-100 text-yellow-700",
            ongoing: "bg-blue-100 text-blue-700",
            cancelled: "bg-red-100 text-red-700",
            rejected: "bg-red-100 text-red-700",
            confirmed: "bg-emerald-100 text-emerald-700",
            deposit_submitted: "bg-amber-100 text-amber-700",
            on_the_way: "bg-indigo-100 text-indigo-700",
            awaiting_owner_confirmation: "bg-orange-100 text-orange-700",
            expired: "bg-gray-200 text-gray-700",
            disputed: "bg-fuchsia-100 text-fuchsia-700",
        };
        return map[st] || "bg-gray-100 text-gray-700";
    };

    return (
        <AdminLayout className="bg-[#FFFBF2] min-h-screen">
            {/* Page Title */}
            <div className="mb-6">
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-lg bg-[#FFAB00]/15 flex items-center justify-center">
                        <Package className="w-5 h-5 text-[#FFAB00]" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800">
                            Renting History
                        </h1>
                        <p className="mt-1 text-gray-600">
                            Search and filter all rental transactions
                        </p>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm mb-6">
                <div className="flex items-center gap-2 mb-4">
                    <Filter className="w-5 h-5 text-[#FFAB00]" />
                    <h2 className="text-lg font-semibold text-gray-900">
                        Filters
                    </h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {/* Item Name */}
                    <div>
                        <label className="text-xs font-medium text-gray-600 mb-2 block">
                            Item Name
                        </label>
                        <div className="relative">
                            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                                placeholder="Search by title..."
                                value={itemName}
                                onChange={(e) => setItemName(e.target.value)}
                                className="border border-gray-300 py-2.5 pl-10 pr-3 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-[#FFAB00] focus:border-transparent transition-all"
                            />
                        </div>
                    </div>

                    {/* Category */}
                    <div>
                        <label className="text-xs font-medium text-gray-600 mb-2 block">
                            Category
                        </label>
                        <select
                            value={categoryId}
                            onChange={(e) => setCategoryId(e.target.value)}
                            className="border border-gray-300 py-2.5 px-3 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-[#FFAB00] focus:border-transparent"
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
                    </div>

                    {/* Status */}
                    <div>
                        <label className="text-xs font-medium text-gray-600 mb-2 block">
                            Status
                        </label>
                        <select
                            value={status}
                            onChange={(e) => setStatus(e.target.value)}
                            className="border border-gray-300 py-2.5 px-3 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-[#FFAB00] focus:border-transparent"
                        >
                            <option value="">All Statuses</option>
                            <option value="pending">Pending</option>
                            <option value="confirmed">Confirmed</option>
                            <option value="deposit_submitted">
                                Deposit submitted
                            </option>
                            <option value="on_the_way">On the way</option>
                            <option value="ongoing">Ongoing</option>
                            <option value="awaiting_owner_confirmation">
                                Returned
                            </option>
                            <option value="completed">Completed</option>
                            <option value="disputed">Disputed</option>
                            <option value="cancelled">Cancelled</option>
                            <option value="rejected">Rejected</option>
                            <option value="expired">Expired</option>
                        </select>
                    </div>

                    {/* Date Range */}
                    <div>
                        <label className="text-xs font-medium text-gray-600 mb-2 block">
                            Start Date
                        </label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <button className="w-full justify-start text-left font-normal border-gray-300 hover:border-[#FFAB00] transition-all bg-transparent border rounded-lg py-2.5 px-3 flex items-center gap-2">
                                    <CalendarIcon className="w-4 h-4 text-gray-500" />
                                    <span
                                        className={
                                            dateRange.from
                                                ? "text-[#1E1E1E]"
                                                : "text-gray-500"
                                        }
                                    >
                                        {dateRange.from
                                            ? new Date(
                                                dateRange.from
                                            ).toLocaleDateString()
                                            : "Select start..."}
                                    </span>
                                </button>
                            </PopoverTrigger>
                            <PopoverContent
                                className="w-auto p-0"
                                align="start"
                            >
                                <Calendar
                                    mode="single"
                                    selected={dateRange.from}
                                    onSelect={(d) =>
                                        setDateRange((r) => ({ ...r, from: d }))
                                    }
                                    disabled={(d) => d > new Date()}
                                    captionLayout="dropdown"
                                    fromYear={1900}
                                    toYear={new Date().getFullYear()}
                                    initialFocus
                                />
                            </PopoverContent>
                        </Popover>
                        <div className="mt-2">
                            <label className="text-xs font-medium text-gray-600 mb-2 block">
                                End Date
                            </label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <button className="w-full justify-start text-left font-normal border-gray-300 hover:border-[#FFAB00] transition-all bg-transparent border rounded-lg py-2.5 px-3 flex items-center gap-2">
                                        <CalendarIcon className="w-4 h-4 text-gray-500" />
                                        <span
                                            className={
                                                dateRange.to
                                                    ? "text-[#1E1E1E]"
                                                    : "text-gray-500"
                                            }
                                        >
                                            {dateRange.to
                                                ? new Date(
                                                    dateRange.to
                                                ).toLocaleDateString()
                                                : "Select end..."}
                                        </span>
                                    </button>
                                </PopoverTrigger>
                                <PopoverContent
                                    className="w-auto p-0"
                                    align="start"
                                >
                                    <Calendar
                                        mode="single"
                                        selected={dateRange.to}
                                        onSelect={(d) =>
                                            setDateRange((r) => ({
                                                ...r,
                                                to: d,
                                            }))
                                        }
                                        disabled={(d) => d > new Date()}
                                        captionLayout="dropdown"
                                        fromYear={1900}
                                        toYear={new Date().getFullYear()}
                                        initialFocus
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-semibold text-[#1E1E1E]">
                            Transactions
                        </h3>
                        <p className="text-sm text-gray-600">
                            Showing {filtered.length} result
                            {filtered.length === 1 ? "" : "s"}
                        </p>
                    </div>
                    <button
                        className="text-sm border border-[#FFAB00] text-[#FFAB00] px-3 py-1.5 rounded-lg hover:bg-[#FFAB00]/10"
                        onClick={fetchHistory}
                        disabled={loading}
                    >
                        {loading ? "Refreshing…" : "Refresh"}
                    </button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-100 text-gray-700">
                            <tr>
                                <th className="p-3">Rental ID</th>
                                <th className="p-3">Start Date</th>
                                <th className="p-3">End Date</th>
                                <th className="p-3">Item Name</th>
                                <th className="p-3">Category</th>
                                <th className="p-3">Status</th>
                                <th className="p-3">Item Picture</th>
                            </tr>
                        </thead>
                        <tbody className="text-gray-700">
                            {filtered.map((r) => (
                                <tr
                                    key={r.rental_id}
                                    className="border-b hover:bg-gray-50 transition"
                                >
                                    <td className="p-3 font-mono text-sm text-orange-600">
                                        {r.rental_id}
                                    </td>
                                    <td className="p-3">
                                        {new Date(
                                            r.start_date
                                        ).toLocaleDateString()}
                                    </td>
                                    <td className="p-3">
                                        {new Date(
                                            r.end_date
                                        ).toLocaleDateString()}
                                    </td>
                                    <td className="p-3">
                                        {r.items?.title || "—"}
                                    </td>
                                    <td className="p-3">
                                        {(() => {
                                            const c = categories.find(
                                                (c) =>
                                                    String(c.category_id) ===
                                                    String(r.items?.category_id)
                                            );
                                            return c?.name || "—";
                                        })()}
                                    </td>
                                    <td className="p-3">
                                        <span
                                            className={`px-3 py-1 rounded-full text-xs font-semibold ${statusBadge(
                                                r.status
                                            )}`}
                                        >
                                            {r.status}
                                        </span>
                                    </td>
                                    <td className="p-3">
                                        {r.items?.main_image_url ? (
                                            <img
                                                src={r.items.main_image_url}
                                                alt={r.items?.title || "Item image"}
                                                className="w-16 h-16 object-cover rounded-md border border-gray-200 cursor-pointer hover:opacity-80 transition"
                                                onClick={() => {
                                                    setSelectedImage(r.items.main_image_url);
                                                    setIsImageModalOpen(true);
                                                }}
                                            />
                                        ) : (
                                            <span className="text-gray-400 italic">No image</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {!loading && filtered.length === 0 && (
                                <tr>
                                    <td
                                        colSpan="6"
                                        className="p-6 text-center text-gray-500"
                                    >
                                        No results match your filters.
                                    </td>
                                </tr>
                            )}
                            {loading && (
                                <tr>
                                    <td
                                        colSpan="6"
                                        className="p-6 text-center text-gray-500"
                                    >
                                        Loading…
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {isImageModalOpen && selectedImage && (
                <div
                    className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center"
                    onClick={() => setIsImageModalOpen(false)}
                >
                    <img
                        src={selectedImage}
                        alt="Full view"
                        className="max-w-[90%] max-h-[90%] object-contain rounded-lg shadow-2xl border border-gray-300"
                        onClick={(e) => e.stopPropagation()} // prevent closing when clicking image itself
                    />
                    <button
                        className="absolute top-5 right-5 bg-white text-gray-800 px-4 py-2 rounded-lg shadow-md hover:bg-gray-200 transition"
                        onClick={() => setIsImageModalOpen(false)}
                    >
                        Close
                    </button>
                </div>
            )}
        </AdminLayout>
    );
}

export default ViewRentingHistory;
