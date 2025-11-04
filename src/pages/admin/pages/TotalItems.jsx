"use client";

import { useEffect, useMemo, useState } from "react";
import AdminLayout from "../../../components/AdminLayout";
import { supabase } from "../../../../supabaseClient";
import { Button } from "@/components/ui/button";
import {
    CalendarIcon,
    Loader2,
    PackageSearch,
    RefreshCw,
    ShieldAlert,
} from "lucide-react";

export default function TotalItems() {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(false);
    // Filters
    const [filterTitle, setFilterTitle] = useState("");
    const [filterOwnerId, setFilterOwnerId] = useState("");
    const [filterStatus, setFilterStatus] = useState("all");
    const [filterDate, setFilterDate] = useState(null);

    const fetchItems = async () => {
        setLoading(true);
        try {
            // Fetch images from items table
            const { data: itemsData, error: itemsError } = await supabase
                .from("items")
                .select("item_id, main_image_url");

            if (itemsError) throw itemsError;

            // Fetch metadata from the view
            const { data: totalItems, error: totalError } = await supabase
                .from("view_total_items")
                .select("item_id,user_id,title,created_at,item_status,quantity,violations_count,rereview_pending,last_violation_at")
                .order("created_at", { ascending: false });

            if (totalError) throw totalError;

            // Merge images with totalItems
            const merged = totalItems.map((item) => {
                const found = itemsData.find((i) => i.item_id === item.item_id);
                return { ...item, main_image_url: found?.main_image_url || null };
            });

            // ✅ update state with merged result
            setRows(merged);
        } catch (e) {
            console.error("Load items failed", e);
        } finally {
            setLoading(false);
        }
    };


    useEffect(() => {
        fetchItems();
    }, []);

    // Real-time: refetch when underlying tables change (items, violations, rereview)
    useEffect(() => {
        const channel = supabase
            .channel("total_items_changes")
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "items" },
                () => queueMicrotask(() => fetchItems())
            )
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "item_violations" },
                () => queueMicrotask(() => fetchItems())
            )
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "item_rereview_requests",
                },
                () => queueMicrotask(() => fetchItems())
            )
            .subscribe();

        return () => {
            try {
                supabase.removeChannel(channel);
            } catch (_) { }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const stats = useMemo(() => {
        const total = rows.length;
        const banned = rows.filter((r) => r.item_status === "banned").length;
        const pendingRereview = rows.filter((r) => r.rereview_pending).length;
        return { total, banned, pendingRereview };
    }, [rows]);

    // Filtered rows for table display
    const filteredRows = useMemo(() => {
        if (!rows || rows.length === 0) return [];

        return rows.filter((r) => {
            // Title filter (contains, case-insensitive)
            if (filterTitle && !String(r.title || "").toLowerCase().includes(filterTitle.toLowerCase())) return false;

            // Owner ID filter (contains)
            if (filterOwnerId && !String(r.user_id || "").toLowerCase().includes(filterOwnerId.toLowerCase())) return false;

            // Status filter (exact match)
            if (filterStatus && filterStatus !== "all") {
                if (String(r.item_status || "").toLowerCase() !== filterStatus.toLowerCase()) return false;
            }

            // Created date filter (compare YYYY-MM-DD)
            if (filterDate) {
                try {
                    const d = new Date(r.created_at);
                    const iso = d.toISOString().slice(0, 10);
                    if (iso !== filterDate) return false;
                } catch (e) {
                    return false;
                }
            }

            return true;
        });
    }, [rows, filterTitle, filterOwnerId, filterStatus, filterDate]);

    const fmt = (d) => (d ? new Date(d).toLocaleString() : "—");

    const statusBadge = (s) => {
        const map = {
            pending: {
                bg: "bg-yellow-100",
                text: "text-yellow-800",
                label: "Under Review",
            },
            approved: {
                bg: "bg-green-100",
                text: "text-green-800",
                label: "Approved",
            },
            banned: { bg: "bg-red-100", text: "text-red-800", label: "Banned" },
            rejected: {
                bg: "bg-gray-100",
                text: "text-gray-800",
                label: "Rejected",
            },
        };
        const m = map[s] || {
            bg: "bg-gray-100",
            text: "text-gray-700",
            label: s || "Unknown",
        };
        return (
            <span
                className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${m.bg} ${m.text}`}
            >
                {m.label}
            </span>
        );
    };

    return (
        <AdminLayout>
            <div className="p-6 max-w-[1600px] mx-auto">
                {/* Header */}
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#FFAB00] to-[#FF8C00] flex items-center justify-center shadow-lg">
                        <PackageSearch className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">
                            Total Items
                        </h1>
                        <p className="text-sm text-gray-600">
                            All items with ban status, violations and re-review
                            state
                        </p>
                    </div>
                    <div className="ml-auto">
                        <Button
                            onClick={fetchItems}
                            variant="outline"
                            className="border-gray-300 bg-transparent"
                        >
                            {loading ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                                <RefreshCw className="h-4 w-4 mr-2" />
                            )}
                            Refresh
                        </Button>
                    </div>
                </div>

                {/* Filters (card container to match TotalUsers style) */}
                <div className="mb-6">
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                            <div>
                                <label className="text-xs text-gray-600">Title</label>
                                <input
                                    value={filterTitle}
                                    onChange={(e) => setFilterTitle(e.target.value)}
                                    placeholder="Search title"
                                    className="mt-1 w-full border border-gray-200 rounded-md px-3 py-2 text-sm"
                                />
                            </div>

                            <div>
                                <label className="text-xs text-gray-600">Owner ID</label>
                                <input
                                    value={filterOwnerId}
                                    onChange={(e) => setFilterOwnerId(e.target.value)}
                                    placeholder="User ID"
                                    className="mt-1 w-full border border-gray-200 rounded-md px-3 py-2 text-sm"
                                />
                            </div>

                            <div>
                                <label className="text-xs text-gray-600">Status</label>
                                <select
                                    value={filterStatus}
                                    onChange={(e) => setFilterStatus(e.target.value)}
                                    className="mt-1 w-full border border-gray-200 rounded-md px-3 py-2 text-sm bg-white"
                                >
                                    <option value="all">All</option>
                                    <option value="pending">Under Review</option>
                                    <option value="approved">Approved</option>
                                    <option value="banned">Banned</option>
                                    <option value="rejected">Rejected</option>
                                </select>
                            </div>

                            <div className="flex items-center gap-2">
                                <div className="w-full">
                                    <label className="text-xs text-gray-600">Created Date</label>
                                    <input
                                        type="date"
                                        value={filterDate || ""}
                                        onChange={(e) => setFilterDate(e.target.value || null)}
                                        className="mt-1 w-full border border-gray-200 rounded-md px-3 py-2 text-sm bg-white"
                                    />
                                </div>
                                <div>
                                    <button
                                        onClick={() => {
                                            setFilterTitle("");
                                            setFilterOwnerId("");
                                            setFilterStatus("all");
                                            setFilterDate(null);
                                        }}
                                        className="ml-2 inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm bg-gray-50"
                                    >
                                        Clear
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="bg-white rounded-xl p-4 border border-gray-200">
                        <p className="text-xs text-gray-500 mb-1">
                            Total Items
                        </p>
                        <p className="text-2xl font-bold">{stats.total}</p>
                    </div>
                    <div className="bg-white rounded-xl p-4 border border-gray-200">
                        <p className="text-xs text-gray-500 mb-1">Banned</p>
                        <p className="text-2xl font-bold text-red-600">
                            {stats.banned}
                        </p>
                    </div>
                    <div className="bg-white rounded-xl p-4 border border-gray-200">
                        <p className="text-xs text-gray-500 mb-1">
                            Re-review Pending
                        </p>
                        <p className="text-2xl font-bold text-amber-600">
                            {stats.pendingRereview}
                        </p>
                    </div>
                </div>

                {/* Table */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-[#FFAB00] animate-pulse" />
                            <span className="text-sm text-gray-700">
                                {loading
                                    ? "Loading..."
                                    : `${filteredRows.length} of ${rows.length} items`}
                            </span>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b bg-gray-50">
                                    <th className="p-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                        Item
                                    </th>
                                    <th className="p-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                        Owner ID
                                    </th>
                                    <th className="p-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                        Status
                                    </th>
                                    <th className="p-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                        Violations
                                    </th>
                                    <th className="p-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                        Re-review
                                    </th>
                                    <th className="p-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                        Created
                                    </th>
                                    <th className="p-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                        Last Violation
                                    </th>
                                    <th className="p-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                        Item Image
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading && (
                                    <tr>
                                        <td
                                            colSpan={7}
                                            className="p-8 text-center text-gray-500"
                                        >
                                            <div className="flex items-center justify-center gap-2">
                                                <Loader2 className="h-4 w-4 animate-spin text-[#FFAB00]" />{" "}
                                                Loading
                                            </div>
                                        </td>
                                    </tr>
                                )}
                                {!loading && filteredRows.length === 0 && (
                                    <tr>
                                        <td
                                            colSpan={7}
                                            className="p-8 text-center text-gray-500"
                                        >
                                            <div className="flex items-center justify-center gap-2">
                                                <ShieldAlert className="h-5 w-5 text-gray-300" />{" "}
                                                No items found
                                            </div>
                                        </td>
                                    </tr>
                                )}
                                {!loading &&
                                    filteredRows.map((r) => (
                                        <tr
                                            key={r.item_id}
                                            className="border-b hover:bg-orange-50/30"
                                        >
                                            <td className="p-4">
                                                <div className="flex flex-col">
                                                    <span className="font-medium text-gray-900">
                                                        {r.title}
                                                    </span>
                                                    <span className="text-xs text-amber-600 font-mono">
                                                        {r.item_id}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="p-4 font-mono text-xs text-gray-700 break-all">
                                                {r.user_id}
                                            </td>
                                            <td className="p-4">
                                                {statusBadge(r.item_status)}
                                            </td>
                                            <td className="p-4">
                                                {r.violations_count ?? 0}
                                            </td>
                                            <td className="p-4">
                                                {r.rereview_pending ? (
                                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
                                                        Pending
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">
                                                        None
                                                    </span>
                                                )}
                                            </td>
                                            <td className="p-4">
                                                <div className="flex items-center gap-2">
                                                    <CalendarIcon className="w-4 h-4 text-gray-400" />
                                                    {fmt(r.created_at)}
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <div className="flex items-center gap-2">
                                                    <CalendarIcon className="w-4 h-4 text-gray-400" />
                                                    {fmt(r.last_violation_at)}
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                {r.main_image_url ? (
                                                    <a href={r.main_image_url} target="_blank" rel="noopener noreferrer">
                                                        <img
                                                            src={r.main_image_url}
                                                            alt={r.title}
                                                            className="w-12 h-12 object-cover rounded-md border border-gray-200 hover:scale-105 transition-transform"
                                                        />
                                                    </a>
                                                ) : (
                                                    <span className="text-gray-400 text-sm">No Image</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}
