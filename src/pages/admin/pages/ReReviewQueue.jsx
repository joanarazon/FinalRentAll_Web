"use client";

import { useEffect, useMemo, useState } from "react";
import AdminLayout from "../../../components/AdminLayout";
import { Button } from "@/components/ui/button";
import { supabase } from "../../../../supabaseClient";
import { useUserContext } from "@/context/UserContext.jsx";
import { useToastApi } from "@/components/ui/toast";
import {
    handleItemApproved,
    handleItemRejected,
} from "@/lib/notificationEvents";
import {
    CalendarIcon,
    CheckCircle2,
    Loader2,
    XCircle,
    Eye,
    ClipboardList,
} from "lucide-react";

export default function ReReviewQueue() {
    const { user } = useUserContext();
    const toast = useToastApi();
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(false);
    const [viewItem, setViewItem] = useState(null);
    const [actionRow, setActionRow] = useState(null);
    const [actionType, setActionType] = useState(null); // 'approve' | 'reject'
    const [adminNotes, setAdminNotes] = useState("");
    const [imagePreview, setImagePreview] = useState(null);
    // Filters
    const [filterTitle, setFilterTitle] = useState("");
    const [filterItemId, setFilterItemId] = useState("");
    const [filterRequester, setFilterRequester] = useState("");
    const [filterStatus, setFilterStatus] = useState("all");
    const [filterDate, setFilterDate] = useState(null);

    const fetchQueue = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from("item_rereview_requests")
                .select(
                    `
                    request_id, item_id, requested_by, status, requested_at, admin_notes,
                    items:items!item_rereview_requests_item_id_fkey(
                        title, user_id, item_status, created_at, main_image_url,
                        owner:users!items_user_id_fkey(first_name, last_name)
                    ),
                    requester:users!item_rereview_requests_requested_by_fkey(first_name, last_name)
                `
                )
                .order("requested_at", { ascending: false });
            if (error) throw error;

            // If DB relationship isn't present, `items` subselect may be null.
            // Fetch items explicitly and merge `main_image_url` so UI always has the image when available.
            const itemIds = (data || []).map((d) => d.item_id).filter(Boolean);
            if (itemIds.length > 0) {
                try {
                    const { data: itemsData, error: itemsErr } = await supabase
                        .from("items")
                        .select("item_id, title, main_image_url, user_id, item_status, created_at")
                        .in("item_id", itemIds);

                    if (!itemsErr && itemsData) {
                        const merged = (data || []).map((row) => {
                            const found = itemsData.find((i) => i.item_id === row.item_id);
                            // Ensure row.items exists and merge fields from items table when missing
                            const base = row.items || {};
                            return {
                                ...row,
                                items: {
                                    title: base.title || (found && found.title) || null,
                                    user_id: base.user_id || (found && found.user_id) || null,
                                    item_status: base.item_status || (found && found.item_status) || null,
                                    created_at: base.created_at || (found && found.created_at) || null,
                                    main_image_url: (base.main_image_url ?? (found && found.main_image_url)) || null,
                                },
                            };
                        });
                        setRows(merged);
                    } else {
                        setRows(data || []);
                    }
                } catch (e2) {
                    console.warn("Failed to fetch items for merge", e2);
                    setRows(data || []);
                }
            } else {
                setRows(data || []);
            }
        } catch (e) {
            console.error("Load queue failed", e);
            toast.error("Failed to load re-review queue");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchQueue();
    }, []);

    // Real-time: refresh queue on any re-review request change
    useEffect(() => {
        const channel = supabase
            .channel("rereview_queue")
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "item_rereview_requests",
                },
                () => {
                    // Debounce with microtask to batch bursts
                    queueMicrotask(() => fetchQueue());
                }
            )
            .subscribe();

        return () => {
            try {
                supabase.removeChannel(channel);
            } catch (_) {}
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const pendingCount = useMemo(
        () => rows.filter((r) => r.status === "pending").length,
        [rows]
    );

    // Filtered rows (client-side)
    const filteredRows = useMemo(() => {
        if (!rows || rows.length === 0) return [];
        return rows.filter((r) => {
            // Title
            if (filterTitle && !String(r.items?.title || "").toLowerCase().includes(filterTitle.toLowerCase())) return false;
            // Item ID
            if (filterItemId && !String(r.item_id || "").toLowerCase().includes(filterItemId.toLowerCase())) return false;
            // Requester (first + last)
            const requesterName = ((r.requester?.first_name || "") + " " + (r.requester?.last_name || "")).trim();
            if (filterRequester && !requesterName.toLowerCase().includes(filterRequester.toLowerCase())) return false;
            // Status
            if (filterStatus && filterStatus !== "all") {
                if (String(r.status || "").toLowerCase() !== filterStatus.toLowerCase()) return false;
            }
            // Requested date (YYYY-MM-DD)
            if (filterDate) {
                try {
                    const d = new Date(r.requested_at);
                    const iso = d.toISOString().slice(0, 10);
                    if (iso !== filterDate) return false;
                } catch (e) {
                    return false;
                }
            }
            return true;
        });
    }, [rows, filterTitle, filterItemId, filterRequester, filterStatus, filterDate]);

    const takeAction = async ({ row, approve, notes }) => {
        if (!user?.id) {
            toast.error("No admin context");
            return;
        }
        const newStatus = approve ? "approved" : "rejected";
        try {
            const now = new Date().toISOString();
            const { error: upErr } = await supabase
                .from("item_rereview_requests")
                .update({
                    status: newStatus,
                    reviewed_by: user.id,
                    reviewed_at: now,
                    admin_notes: notes || null,
                })
                .eq("request_id", row.request_id);
            if (upErr) throw upErr;

            if (approve) {
                // Attempt to restore item to approved (if enum value exists)
                const { error: itemErr } = await supabase
                    .from("items")
                    .update({ item_status: "approved" })
                    .eq("item_id", row.item_id);
                if (itemErr) {
                    // If enum does not include 'approved', fallback to 'pending'
                    const isEnumError =
                        /invalid input value for enum|invalid input value/i.test(
                            itemErr.message || ""
                        );
                    if (isEnumError) {
                        const { error: pendErr } = await supabase
                            .from("items")
                            .update({ item_status: "pending" })
                            .eq("item_id", row.item_id);
                        if (pendErr) throw pendErr;
                    } else {
                        throw itemErr;
                    }
                }
                // Notify owner that item was approved (restored)
                try {
                    await handleItemApproved(
                        {
                            item_id: row.item_id,
                            title: row.items?.title || "Item",
                        },
                        row.items?.user_id,
                        "an admin"
                    );
                } catch (notifyErr) {
                    console.warn(
                        "Failed to send approval notification",
                        notifyErr
                    );
                }
            }
            if (!approve) {
                // Optionally log a violation entry for audit trail
                try {
                    await supabase.from("item_violations").insert({
                        item_id: row.item_id,
                        reported_by: user.id,
                        reason: "re-review rejected",
                        details: notes || null,
                    });
                } catch (vioErr) {
                    console.warn(
                        "Failed to insert rejection violation log",
                        vioErr
                    );
                }
                // Notify owner of rejection
                try {
                    await handleItemRejected(
                        {
                            item_id: row.item_id,
                            title: row.items?.title || "Item",
                        },
                        row.items?.user_id,
                        "an admin",
                        notes || ""
                    );
                } catch (notifyErr) {
                    console.warn(
                        "Failed to send rejection notification",
                        notifyErr
                    );
                }
            }

            toast.success(
                approve ? "Re-review approved" : "Re-review rejected"
            );
            fetchQueue();
        } catch (e) {
            console.error("Action failed", e);
            toast.error(e.message || "Action failed");
        }
    };

    return (
        <AdminLayout>
            <div className="p-6 max-w-[1600px] mx-auto">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#FFAB00] to-[#FF8C00] flex items-center justify-center shadow-lg">
                        <ClipboardList className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">
                            Re-review Requests
                        </h1>
                        <p className="text-sm text-gray-600">
                            Review owner requests to restore banned items
                        </p>
                    </div>
                    <div className="ml-auto flex items-center gap-2">
                        <div className="text-sm text-gray-700">
                            Pending:{" "}
                            <span className="font-semibold">
                                {pendingCount}
                            </span>
                        </div>
                        <Button
                            onClick={fetchQueue}
                            variant="outline"
                            className="border-gray-300 bg-transparent"
                        >
                            {loading ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : null}{" "}
                            Refresh
                        </Button>
                    </div>
                </div>

                {/* Filters (card) */}
                <div className="mb-6">
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4">
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
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
                                <label className="text-xs text-gray-600">Item ID</label>
                                <input
                                    value={filterItemId}
                                    onChange={(e) => setFilterItemId(e.target.value)}
                                    placeholder="Item ID"
                                    className="mt-1 w-full border border-gray-200 rounded-md px-3 py-2 text-sm"
                                />
                            </div>

                            <div>
                                <label className="text-xs text-gray-600">Requester</label>
                                <input
                                    value={filterRequester}
                                    onChange={(e) => setFilterRequester(e.target.value)}
                                    placeholder="Requester name"
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
                                    <option value="pending">Pending</option>
                                    <option value="approved">Approved</option>
                                    <option value="rejected">Rejected</option>
                                    <option value="cancelled">Cancelled</option>
                                </select>
                            </div>

                            <div className="flex items-center gap-2">
                                <div className="w-full">
                                    <label className="text-xs text-gray-600">Requested Date</label>
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
                                            setFilterItemId("");
                                            setFilterRequester("");
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

                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b bg-gray-50">
                                    <th className="p-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                        Item
                                    </th>
                                    <th className="p-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                        Requested By
                                    </th>
                                    <th className="p-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                        Requested At
                                    </th>
                                    <th className="p-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                        Status
                                    </th>
                                    <th className="p-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading && (
                                    <tr>
                                        <td
                                            colSpan={5}
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
                                            colSpan={5}
                                            className="p-8 text-center text-gray-500"
                                        >
                                            No requests
                                        </td>
                                    </tr>
                                )}
                                {!loading &&
                                    filteredRows.map((r) => (
                                        <tr
                                            key={r.request_id}
                                            className="border-b hover:bg-orange-50/30"
                                        >
                                            <td className="p-4">
                                                <div className="flex items-center gap-3">
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            if (r.items?.main_image_url) setImagePreview(r.items.main_image_url);
                                                            else setViewItem(r);
                                                        }}
                                                        className="w-12 h-12 rounded-md overflow-hidden bg-gray-100 flex-shrink-0 border border-gray-200 p-0"
                                                        title={r.items?.main_image_url ? 'Open image preview' : 'View details'}
                                                        aria-label={r.items?.main_image_url ? `Open image for ${r.items?.title || r.item_id}` : `View details for ${r.items?.title || r.item_id}`}
                                                    >
                                                        {r.items?.main_image_url ? (
                                                            <img
                                                                src={r.items.main_image_url}
                                                                alt={r.items?.title || 'Item image'}
                                                                className="w-full h-full object-cover"
                                                                loading="lazy"
                                                            />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">
                                                                No Image
                                                            </div>
                                                        )}
                                                    </button>
                                                    <div className="flex flex-col">
                                                        <span className="font-medium text-gray-900 line-clamp-1">
                                                            {r.items?.title || 'Item'}
                                                        </span>
                                                        <span className="text-xs text-amber-700 font-mono">
                                                            {r.item_id}
                                                        </span>
                                                    </div>
                                                </div>
                                            </td>
                                            {/* Owner column removed as requested */}
                                            <td className="p-4">
                                                <div className="text-sm text-gray-800">
                                                    {(r.requester?.first_name ||
                                                        "") +
                                                        " " +
                                                        (r.requester
                                                            ?.last_name || "")}
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <div className="flex items-center gap-2">
                                                    <CalendarIcon className="w-4 h-4 text-gray-400" />{" "}
                                                    {new Date(
                                                        r.requested_at
                                                    ).toLocaleString()}
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                {r.status === "pending" && (
                                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
                                                        Pending
                                                    </span>
                                                )}
                                                {r.status === "approved" && (
                                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                                                        Approved
                                                    </span>
                                                )}
                                                {r.status === "rejected" && (
                                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800">
                                                        Rejected
                                                    </span>
                                                )}
                                                {r.status === "cancelled" && (
                                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">
                                                        Cancelled
                                                    </span>
                                                )}
                                            </td>
                                            <td className="p-4">
                                                <div className="flex items-center gap-2">
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() =>
                                                            setViewItem(r)
                                                        }
                                                        className="border-gray-300"
                                                    >
                                                        {" "}
                                                        <Eye className="w-4 h-4 mr-1" />{" "}
                                                        Details
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        disabled={
                                                            r.status !==
                                                            "pending"
                                                        }
                                                        onClick={() => {
                                                            setActionRow(r);
                                                            setActionType(
                                                                "approve"
                                                            );
                                                            setAdminNotes("");
                                                        }}
                                                        className="bg-green-600 hover:bg-green-700 text-white"
                                                    >
                                                        <CheckCircle2 className="w-4 h-4 mr-1" />
                                                        Approve
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        disabled={
                                                            r.status !==
                                                            "pending"
                                                        }
                                                        onClick={() => {
                                                            setActionRow(r);
                                                            setActionType(
                                                                "reject"
                                                            );
                                                            setAdminNotes("");
                                                        }}
                                                        className="bg-red-600 hover:bg-red-700 text-white"
                                                    >
                                                        <XCircle className="w-4 h-4 mr-1" />
                                                        Reject
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                    {imagePreview && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                            <div className="absolute inset-0 bg-black/60" onClick={() => setImagePreview(null)} />
                            <div className="relative z-10 max-w-[90vw] max-h-[90vh] bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
                                <div className="p-3 border-b flex justify-end">
                                    <Button variant="ghost" onClick={() => setImagePreview(null)}>Close</Button>
                                </div>
                                <div className="p-4 flex items-center justify-center bg-black">
                                    <img src={imagePreview} alt="Preview" className="max-w-full max-h-[80vh] object-contain" />
                                </div>
                            </div>
                        </div>
                    )}

                    {viewItem && (
                    <RequestDetailsDialog
                        row={viewItem}
                        onClose={() => setViewItem(null)}
                    />
                )}

                {actionRow && (
                    <ActionNotesDialog
                        mode={actionType}
                        notes={adminNotes}
                        setNotes={setAdminNotes}
                        onCancel={() => {
                            setActionRow(null);
                            setActionType(null);
                            setAdminNotes("");
                        }}
                        onConfirm={async () => {
                            const row = actionRow;
                            const approve = actionType === "approve";
                            const notes = adminNotes;
                            setActionRow(null);
                            setActionType(null);
                            setAdminNotes("");
                            await takeAction({ row, approve, notes });
                        }}
                    />
                )}
            </div>
        </AdminLayout>
    );
}

function RequestDetailsDialog({ row, onClose }) {
    const [violations, setViolations] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                const { data, error } = await supabase
                    .from("item_violations")
                    .select(
                        "violation_id, reason, details, created_at, reported_by"
                    )
                    .eq("item_id", row.item_id)
                    .order("created_at", { ascending: false });
                if (error) throw error;
                setViolations(data || []);
            } catch (e) {
                console.error("Load violations failed", e);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [row.item_id]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60" onClick={onClose} />
            <div className="relative z-10 w-full max-w-3xl max-h-[90vh] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden">
                <div className="px-6 py-4 border-b bg-gradient-to-r from-orange-50 to-amber-50 flex items-center justify-between">
                    <div>
                        <div className="text-lg font-semibold text-gray-900">
                            Request Details
                        </div>
                        <div className="text-sm text-gray-600">
                            {row.items?.title}
                        </div>
                    </div>
                    <Button variant="ghost" onClick={onClose}>
                        Close
                    </Button>
                </div>
                <div className="p-6 overflow-y-auto">
                    <div className="mb-4">
                        <div className="text-sm text-gray-700">
                            <span className="font-medium">Item ID:</span>{" "}
                            <span className="font-mono text-amber-700">
                                {row.item_id}
                            </span>
                        </div>
                        <div className="text-sm text-gray-700">
                        </div>
                        <div className="text-sm text-gray-700">
                            <span className="font-medium">Requested by:</span>{" "}
                            {(row.requester?.first_name || "") +
                                " " +
                                (row.requester?.last_name || "")}
                        </div>
                        <div className="text-sm text-gray-700">
                            <span className="font-medium">Requested at:</span>{" "}
                            {new Date(row.requested_at).toLocaleString()}
                        </div>
                        <div className="text-sm text-gray-700">
                            <span className="font-medium">
                                Current item status:
                            </span>{" "}
                            {row.items?.item_status}
                        </div>
                        {row.admin_notes && (
                            <div className="mt-2 text-sm text-gray-700">
                                <span className="font-medium">
                                    Admin notes:
                                </span>{" "}
                                <span className="whitespace-pre-wrap">
                                    {row.admin_notes}
                                </span>
                            </div>
                        )}
                    </div>

                    <div className="mt-4">
                        <h3 className="text-sm font-semibold text-gray-800 mb-2">
                            Violation History
                        </h3>
                        <div className="bg-white border rounded-xl">
                            {loading && (
                                <div className="p-4 text-sm text-gray-500">
                                    Loading…
                                </div>
                            )}
                            {!loading && violations.length === 0 && (
                                <div className="p-4 text-sm text-gray-500">
                                    No violations recorded
                                </div>
                            )}
                            {!loading && violations.length > 0 && (
                                <ul className="divide-y">
                                    {violations.map((v) => (
                                        <li
                                            key={v.violation_id}
                                            className="p-4"
                                        >
                                            <div className="text-sm font-medium text-gray-900">
                                                {v.reason}
                                            </div>
                                            {v.details && (
                                                <div className="text-sm text-gray-700 mt-1">
                                                    {v.details}
                                                </div>
                                            )}
                                            <div className="text-xs text-gray-500 mt-1">
                                                {new Date(
                                                    v.created_at
                                                ).toLocaleString()}
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>
                </div>
                <div className="px-6 py-4 border-t bg-gray-50 text-right">
                    <Button variant="outline" onClick={onClose}>
                        Close
                    </Button>
                </div>
            </div>
        </div>
    );
}

function ActionNotesDialog({ mode, notes, setNotes, onCancel, onConfirm }) {
    const title = mode === "approve" ? "Approve Re-review" : "Reject Re-review";
    const cta = mode === "approve" ? "Approve" : "Reject";
    const ctaClass =
        mode === "approve"
            ? "bg-green-600 hover:bg-green-700 text-white"
            : "bg-red-600 hover:bg-red-700 text-white";
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60" onClick={onCancel} />
            <div className="relative z-10 w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b bg-gradient-to-r from-orange-50 to-amber-50">
                    <div className="text-lg font-semibold text-gray-900">
                        {title}
                    </div>
                    <div className="text-sm text-gray-600">
                        Add optional admin notes for audit trail and owner
                        visibility.
                    </div>
                </div>
                <div className="p-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Admin notes
                    </label>
                    <textarea
                        className="w-full min-h-28 border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-amber-400"
                        placeholder="e.g., Missing clear photos; please update description and resubmit"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                    />
                </div>
                <div className="px-6 py-4 border-t bg-gray-50 flex items-center justify-end gap-2">
                    <Button variant="outline" onClick={onCancel}>
                        Cancel
                    </Button>
                    <Button className={ctaClass} onClick={onConfirm}>
                        {cta}
                    </Button>
                </div>
            </div>
        </div>
    );
}
