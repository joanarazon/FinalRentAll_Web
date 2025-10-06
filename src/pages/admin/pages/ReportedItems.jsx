import React, { useCallback, useEffect, useState } from "react";
import AdminLayout from "../../../components/AdminLayout";
import { supabase } from "../../../../supabaseClient";
import { useUser } from "../../../hooks/useUser";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    Loader2,
    Eye,
    Gavel,
    CheckCircle,
    ShieldBan,
    XCircle,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { useToastApi } from "@/components/ui/toast";

export default function ReportedItems() {
    const admin = useUser();
    const toast = useToastApi();
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(false);
    const [statusFilter, setStatusFilter] = useState("pending");
    const [resolvingId, setResolvingId] = useState(null);
    const [confirmDialog, setConfirmDialog] = useState(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            let query = supabase
                .from("complaints")
                .select(
                    `
                    complaint_id, sender_id, target_item_id, rental_id, reason, content, sent_at, status,
                    sender:users!complaints_sender_id_fkey(id, first_name, last_name),
                    item:items!complaints_target_item_id_fkey(
                        item_id, title, user_id, main_image_url,
                        owner:users!items_user_id_fkey(id, first_name, last_name)
                    )
                `
                )
                .not("target_item_id", "is", null)
                .order("sent_at", { ascending: false });

            if (statusFilter && statusFilter !== "all") {
                query = query.eq("status", statusFilter);
            }

            const { data, error } = await query;
            if (error) throw error;
            setRows(data || []);
        } catch (e) {
            console.error("Load reported items failed:", e.message);
            toast.error("Failed to load reports.");
        } finally {
            setLoading(false);
        }
    }, [statusFilter]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const warnAndBanItem = async (
        complaintId,
        itemId,
        ownerId,
        warningAmount
    ) => {
        if (!admin?.id || !itemId || !ownerId) return;
        setResolvingId(complaintId);
        try {
            const { error: banErr } = await supabase
                .from("items")
                .update({ item_status: "banned" })
                .eq("item_id", itemId);
            if (banErr) throw banErr;

            const { error: warnErr } = await supabase
                .from("users")
                .update({
                    warnings_count: supabase.rpc("increment_user_warnings", {
                        user_id: ownerId,
                        increment_by: warningAmount,
                    }),
                })
                .eq("id", ownerId);
            if (warnErr) throw warnErr;

            const { error } = await supabase
                .from("complaints")
                .update({
                    status: "resolved",
                    resolved_by: admin.id,
                    resolved_at: new Date().toISOString(),
                })
                .eq("complaint_id", complaintId)
                .neq("status", "resolved");
            if (error) throw error;

            toast.success(
                `Item banned and +${warningAmount} warning${
                    warningAmount > 1 ? "s" : ""
                } issued to owner.`
            );
            fetchData();
        } catch (e) {
            console.error("Ban/resolve failed:", e.message);
            toast.error("Failed to complete action.");
        } finally {
            setResolvingId(null);
            setConfirmDialog(null);
        }
    };

    const markResolved = async (complaintId) => {
        if (!admin?.id) return;
        setResolvingId(complaintId);
        try {
            const { error } = await supabase
                .from("complaints")
                .update({
                    status: "resolved",
                    resolved_by: admin.id,
                    resolved_at: new Date().toISOString(),
                })
                .eq("complaint_id", complaintId)
                .neq("status", "resolved");
            if (error) throw error;
            toast.success("Report marked as resolved.");
            fetchData();
        } catch (e) {
            console.error("Resolve failed:", e.message);
            toast.error("Failed to resolve report.");
        } finally {
            setResolvingId(null);
        }
    };

    const rejectReport = async (complaintId) => {
        if (!admin?.id) return;
        setResolvingId(complaintId);
        try {
            const { error } = await supabase
                .from("complaints")
                .update({
                    status: "rejected",
                    resolved_by: admin.id,
                    resolved_at: new Date().toISOString(),
                })
                .eq("complaint_id", complaintId)
                .neq("status", "resolved");
            if (error) throw error;
            toast.success("Report rejected due to insufficient evidence.");
            fetchData();
        } catch (e) {
            console.error("Reject failed:", e.message);
            toast.error("Failed to reject report.");
        } finally {
            setResolvingId(null);
        }
    };

    return (
        <AdminLayout>
            <div className="p-6 space-y-6">
                <div>
                    <h1 className="text-2xl font-bold mb-1">Reported Items</h1>
                    <p className="text-gray-600 mb-4">
                        Review and take action on reports submitted by users.
                    </p>
                    <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-900">
                        <strong>Action Guide:</strong>
                        <ul className="list-disc pl-5 mt-1 space-y-1">
                            <li>
                                <b>Minor Violation</b>: Bans the item and adds 1
                                warning to the owner.
                            </li>
                            <li>
                                <b>Major Violation</b>: Bans the item and adds 3
                                warnings to the owner.
                            </li>
                            <li>
                                <b>Resolve Only</b>: Marks the report as
                                resolved without banning or warnings.
                            </li>
                            <li>
                                <b>Reject Report</b>: Rejects the report (no
                                action taken, marks as rejected).
                            </li>
                            <li>
                                <b>View</b>: Shows full details of the report.
                            </li>
                        </ul>
                    </div>
                </div>

                {/* Filter Section */}
                <div className="flex items-center gap-3 mb-6">
                    <label className="text-sm font-medium">Filter</label>
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="border rounded px-2 py-1 text-sm"
                    >
                        <option value="pending">Pending</option>
                        <option value="resolved">Resolved</option>
                        <option value="rejected">Rejected</option>
                        <option value="all">All</option>
                    </select>
                    <Button
                        variant="outline"
                        onClick={fetchData}
                        disabled={loading}
                    >
                        {loading && (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        )}
                        Refresh
                    </Button>
                </div>

                {/* Report List */}
                {loading ? (
                    <div className="text-sm text-gray-600">
                        Loading reports…
                    </div>
                ) : rows.length === 0 ? (
                    <div className="text-sm text-gray-600">
                        No reports found.
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {rows.map((r) => (
                            <div
                                key={r.complaint_id}
                                className={`border rounded-xl p-4 shadow-sm transition ${
                                    r.status === "resolved"
                                        ? "bg-gray-50"
                                        : r.status === "rejected"
                                        ? "bg-red-50/50"
                                        : "hover:bg-gray-50/70 bg-white"
                                }`}
                            >
                                <div className="flex justify-between items-center mb-2">
                                    <div className="font-semibold">
                                        {r.item?.title || "Untitled Item"}
                                    </div>
                                    <Badge
                                        variant={
                                            r.status === "resolved"
                                                ? "secondary"
                                                : r.status === "rejected"
                                                ? "destructive"
                                                : "outline"
                                        }
                                    >
                                        {r.status}
                                    </Badge>
                                </div>
                                <p className="text-sm text-gray-600 mb-3">
                                    Reported by{" "}
                                    <strong>
                                        {r.sender
                                            ? `${r.sender.first_name} ${r.sender.last_name}`
                                            : r.sender_id}
                                    </strong>{" "}
                                    for{" "}
                                    <em className="capitalize">{r.reason}</em>
                                </p>

                                <div className="flex flex-wrap gap-2">
                                    <ReportDetailsDialog row={r} />
                                    {r.status === "pending" && (
                                        <>
                                            <Button
                                                size="sm"
                                                className="bg-amber-500 text-white hover:bg-amber-600"
                                                disabled={
                                                    resolvingId ===
                                                    r.complaint_id
                                                }
                                                onClick={() =>
                                                    setConfirmDialog({
                                                        ...r,
                                                        type: "minor",
                                                        amount: 1,
                                                    })
                                                }
                                                title="Ban item and add 1 warning to the owner."
                                            >
                                                <Gavel className="w-4 h-4 mr-1" />{" "}
                                                Minor Violation
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="destructive"
                                                className="bg-red-600 text-white hover:bg-red-700"
                                                disabled={
                                                    resolvingId ===
                                                    r.complaint_id
                                                }
                                                onClick={() =>
                                                    setConfirmDialog({
                                                        ...r,
                                                        type: "major",
                                                        amount: 3,
                                                    })
                                                }
                                                title="Ban item and add 3 warnings to the owner."
                                            >
                                                <ShieldBan className="w-4 h-4 mr-1" />{" "}
                                                Major Violation
                                            </Button>
                                            <Button
                                                size="sm"
                                                className="bg-green-600 text-white hover:bg-green-700"
                                                disabled={
                                                    resolvingId ===
                                                    r.complaint_id
                                                }
                                                onClick={() =>
                                                    markResolved(r.complaint_id)
                                                }
                                                title="Mark report as resolved without banning or warnings."
                                            >
                                                <CheckCircle className="w-4 h-4 mr-1" />{" "}
                                                Resolve Only
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="text-gray-700 border-gray-400 hover:bg-gray-50"
                                                disabled={
                                                    resolvingId ===
                                                    r.complaint_id
                                                }
                                                onClick={() =>
                                                    rejectReport(r.complaint_id)
                                                }
                                                title="Rejects the report (no action taken, marks as rejected)."
                                            >
                                                <XCircle className="w-4 h-4 mr-1" />{" "}
                                                Reject Report
                                            </Button>
                                        </>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Confirmation Dialog */}
                {confirmDialog && (
                    <Dialog open onOpenChange={() => setConfirmDialog(null)}>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>
                                    {confirmDialog.type === "minor"
                                        ? "Confirm Minor Violation"
                                        : "Confirm Major Violation"}
                                </DialogTitle>
                            </DialogHeader>
                            <p className="text-sm text-gray-700 mb-4">
                                Are you sure you want to ban{" "}
                                <strong>{confirmDialog.item?.title}</strong> and
                                issue <strong>+{confirmDialog.amount}</strong>{" "}
                                warning{confirmDialog.amount > 1 && "s"} to its
                                owner?
                            </p>
                            <DialogFooter>
                                <Button
                                    variant="outline"
                                    onClick={() => setConfirmDialog(null)}
                                    disabled={
                                        resolvingId ===
                                        confirmDialog.complaint_id
                                    }
                                >
                                    Cancel
                                </Button>
                                <Button
                                    variant="destructive"
                                    disabled={
                                        resolvingId ===
                                        confirmDialog.complaint_id
                                    }
                                    onClick={() =>
                                        warnAndBanItem(
                                            confirmDialog.complaint_id,
                                            confirmDialog.target_item_id,
                                            confirmDialog.item?.user_id,
                                            confirmDialog.amount
                                        )
                                    }
                                >
                                    {resolvingId ===
                                    confirmDialog.complaint_id ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <>
                                            <Gavel className="w-4 h-4 mr-1" />{" "}
                                            Confirm Ban
                                        </>
                                    )}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                )}
            </div>
        </AdminLayout>
    );
}

function ReportDetailsDialog({ row }) {
    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="cursor-pointer">
                    <Eye className="w-4 h-4 mr-1" /> View
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Report Details</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 text-sm">
                    {row.item?.main_image_url && (
                        <div className="flex flex-col items-center mb-2">
                            <img
                                src={row.item.main_image_url}
                                alt={row.item.title || "Item image"}
                                className="max-h-56 rounded-lg border mb-2"
                                style={{ objectFit: "contain" }}
                            />
                            <span className="text-xs text-gray-500">
                                Item Photo
                            </span>
                        </div>
                    )}
                    <div className="flex justify-between">
                        <span>Item Name</span>
                        <span>{row.item?.title || "—"}</span>
                    </div>
                    <div className="flex justify-between">
                        <span>Owner</span>
                        <span>
                            {row.item?.owner
                                ? `${row.item.owner.first_name || ""} ${
                                      row.item.owner.last_name || ""
                                  }`.trim() || row.item.user_id
                                : row.item?.user_id || "—"}
                        </span>
                    </div>
                    <div className="flex justify-between">
                        <span>Reported By</span>
                        <span>
                            {row.sender
                                ? `${row.sender.first_name || ""} ${
                                      row.sender.last_name || ""
                                  }`
                                : row.sender_id}
                        </span>
                    </div>
                    <div className="flex justify-between">
                        <span>Reason</span>
                        <span className="capitalize">{row.reason}</span>
                    </div>
                    <Separator />
                    <div>
                        <span className="block text-gray-600 mb-1">
                            Content
                        </span>
                        <p className="whitespace-pre-line">
                            {row.content || "—"}
                        </p>
                    </div>
                    <Separator />
                    <div className="flex justify-between">
                        <span>Sent</span>
                        <span>
                            {row.sent_at
                                ? new Date(row.sent_at).toLocaleString()
                                : "—"}
                        </span>
                    </div>
                    <div className="flex justify-between">
                        <span>Status</span>
                        <span className="capitalize">{row.status}</span>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
