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
    Bell,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { useToastApi } from "@/components/ui/toast";
import { handleItemBanned } from "@/lib/notificationEvents";
import { createNotification } from "@/lib/notifications";

export default function ReportedItems() {
    const admin = useUser();
    const toast = useToastApi();
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(false);
    const [statusFilter, setStatusFilter] = useState("pending");
    const [resolvingId, setResolvingId] = useState(null);

    const [noteDialog, setNoteDialog] = useState({
        open: false,
        action: null,
        complaintId: null,
        itemId: null,
        ownerId: null,
        warningAmount: null,
    });
    const [resolutionNote, setResolutionNote] = useState("");
    const [noteSubmitting, setNoteSubmitting] = useState(false);
    const [sendingNoticeId, setSendingNoticeId] = useState(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            let query = supabase
                .from("complaints")
                .select(
                    `
          complaint_id, sender_id, target_item_id, rental_id, reason, content, sent_at, status, resolution_note, resolved_by, resolved_at,
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

    // Real-time: refetch when complaints (or related items) change
    useEffect(() => {
        const channel = supabase
            .channel("reported_items_changes")
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "complaints" },
                () => queueMicrotask(() => fetchData())
            )
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "items" },
                () => queueMicrotask(() => fetchData())
            )
            .subscribe();

        return () => {
            try {
                supabase.removeChannel(channel);
            } catch (_) {}
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleActionWithNote = (
        action,
        complaintId,
        itemId = null,
        ownerId = null,
        warningAmount = null
    ) => {
        setNoteDialog({
            open: true,
            action,
            complaintId,
            itemId,
            ownerId,
            warningAmount,
        });
        setResolutionNote("");
    };

    // Send an informational notice to the item owner (and optionally the reporter)
    const sendNotice = async (complaintId, itemId, ownerId, reason, rentalId = null) => {
        try {
            setSendingNoticeId(complaintId);

            // find complaint row to get item title and sender
            const complaint = rows.find((r) => r.complaint_id === complaintId) || {};
            const itemTitle = complaint.item?.title || "your item";
            const reporterId = complaint?.sender_id || null;

            const title = "Notice: Your item has been reported";
            const message = `Your item "${itemTitle}" has been reported for ${reason}. Our admin team will verify and evaluate the issue before deciding on any action. You will be notified once the review is complete.`;

            // Notify owner
            if (ownerId) {
                await createNotification({
                    userId: ownerId,
                    title,
                    message,
                    type: "item",
                    rentalId: rentalId || null,
                    itemId: itemId || null,
                });
            }

            // Optionally notify the reporter that their report was received and owner was notified
            if (reporterId) {
                const repTitle = "Report Received";
                const repMessage = `Thanks for reporting \"${itemTitle}\". The owner has been notified and our admin team will review the issue. You will be notified once the review is complete.`;
                await createNotification({
                    userId: reporterId,
                    title: repTitle,
                    message: repMessage,
                    type: "item",
                    rentalId: rentalId || null,
                    itemId: itemId || null,
                });
            }

            toast.success("Owner notified about the report.");
        } catch (err) {
            console.error("Failed to send item notice:", err);
            toast.error("Failed to notify owner.");
        } finally {
            setSendingNoticeId(null);
        }
    };

    // Notify both owner and reporter when admin resolves/rejects/warns or bans
    const notifyResolution = async (complaintId, ownerId, actionType, adminNote) => {
        try {
            const complaint = rows.find((r) => r.complaint_id === complaintId) || {};
            const senderId = complaint?.sender_id || null;
            const itemTitle = complaint.item?.title || "your item";

            // For bans, owner already receives a ban notification via handleItemBanned, so skip owner to avoid duplicate
            if (actionType !== "ban" && ownerId) {
                const targetTitle = "Report review completed";
                const targetMessage = `Your item \"${itemTitle}\" was reviewed by our admin team. Action: ${
                    actionType === "reject"
                        ? "No action taken"
                        : actionType === "ban"
                        ? "Item banned"
                        : actionType === "resolve"
                        ? "Marked resolved"
                        : actionType
                }. ${adminNote || ""}`;
                await createNotification({
                    userId: ownerId,
                    title: targetTitle,
                    message: targetMessage,
                    type: "item",
                    itemId: complaint.item?.item_id || null,
                    rentalId: complaint.rental_id || null,
                });
            }

            if (senderId) {
                const senderTitle = "Report review result";
                const senderMessage = `Thank you for your report about \"${itemTitle}\". The admin review is complete: ${
                    actionType === "reject"
                        ? "Report rejected (not enough evidence)."
                        : actionType === "ban"
                        ? "Item banned and action taken against the owner."
                        : "Report marked as resolved."
                } ${adminNote || ""}`;
                await createNotification({
                    userId: senderId,
                    title: senderTitle,
                    message: senderMessage,
                    type: "item",
                    itemId: complaint.item?.item_id || null,
                    rentalId: complaint.rental_id || null,
                });
            }
        } catch (e) {
            console.error("Failed to create resolution notifications:", e);
        }
    };

    const submitNoteAction = async () => {
        if (!admin?.id || !noteDialog.complaintId) return;
        setNoteSubmitting(true);
        try {
            // 1️⃣ If banning, ban the item
            if (noteDialog.action === "ban") {
                const { error: banErr } = await supabase
                    .from("items")
                    .update({ item_status: "banned" })
                    .eq("item_id", noteDialog.itemId);
                if (banErr) throw banErr;

                // Add warnings via RPC
                const { error: warnErr } = await supabase.rpc(
                    "increment_user_warnings",
                    {
                        user_id: noteDialog.ownerId,
                        increment_by: noteDialog.warningAmount,
                    }
                );
                if (warnErr) throw warnErr;

                // Record a curated violation entry for owner-visible history and admin aggregates
                try {
                    // Try to capture the complaint reason for context
                    let reportReason = null;
                    const { data: compRow } = await supabase
                        .from("complaints")
                        .select("reason")
                        .eq("complaint_id", noteDialog.complaintId)
                        .maybeSingle();
                    if (compRow?.reason) reportReason = compRow.reason;

                    const violationReason =
                        noteDialog.warningAmount >= 3
                            ? "major violation"
                            : "minor violation";
                    const detailsParts = [];
                    if (reportReason)
                        detailsParts.push(`report reason: ${reportReason}`);
                    if (resolutionNote?.trim())
                        detailsParts.push(
                            `admin note: ${resolutionNote.trim()}`
                        );
                    const details = detailsParts.join(" | ") || null;

                    const { error: vioErr } = await supabase
                        .from("item_violations")
                        .insert({
                            item_id: noteDialog.itemId,
                            reported_by: admin.id,
                            reason: violationReason,
                            details,
                        });
                    if (vioErr) console.warn("Violation insert failed", vioErr);
                } catch (vioCatch) {
                    console.warn("Failed to record violation entry", vioCatch);
                }

                // Notify the owner that the item has been banned
                try {
                    const { data: itemRow } = await supabase
                        .from("items")
                        .select("item_id,title,user_id")
                        .eq("item_id", noteDialog.itemId)
                        .single();
                    if (itemRow) {
                        const detailsParts = [];
                        // Include admin's resolution note and/or complaint reason if available
                        if (resolutionNote?.trim())
                            detailsParts.push(
                                `admin note: ${resolutionNote.trim()}`
                            );
                        // Note: reportReason captured above in the same scope
                        // but ensure we include it again for the notification body
                        try {
                            const { data: compRow2 } = await supabase
                                .from("complaints")
                                .select("reason")
                                .eq("complaint_id", noteDialog.complaintId)
                                .maybeSingle();
                            if (compRow2?.reason)
                                detailsParts.unshift(
                                    `report reason: ${compRow2.reason}`
                                );
                        } catch {}

                        const details = detailsParts.join(" | ");
                        await handleItemBanned(
                            { item_id: itemRow.item_id, title: itemRow.title },
                            itemRow.user_id,
                            details
                        );
                    }
                } catch (notifyErr) {
                    console.warn(
                        "Failed to send item banned notification",
                        notifyErr
                    );
                }
            }

            // 2️⃣ Update the complaint with resolution info
            const { error } = await supabase
                .from("complaints")
                .update({
                    status:
                        noteDialog.action === "ban"
                            ? "banned"
                            : noteDialog.action === "resolve"
                            ? "resolved"
                            : "rejected",
                    resolved_by: admin.id,
                    resolved_at: new Date().toISOString(),
                    resolution_note: resolutionNote.trim(),
                })
                .eq("complaint_id", noteDialog.complaintId);
            if (error) throw error;

            // 3️⃣ Toast notifications
            if (noteDialog.action === "ban") {
                toast.success(
                    `Item banned and +${noteDialog.warningAmount} warning${
                        noteDialog.warningAmount > 1 ? "s" : ""
                    } issued to owner.`
                );
                // notify reporter about the outcome, owner already notified via handleItemBanned
                try {
                    await notifyResolution(
                        noteDialog.complaintId,
                        noteDialog.ownerId,
                        "ban",
                        resolutionNote.trim()
                    );
                } catch (err) {
                    console.warn("notifyResolution (ban) failed", err);
                }
            } else if (noteDialog.action === "resolve") {
                toast.success("Report marked as resolved.");
                // notify both owner and reporter
                try {
                    await notifyResolution(
                        noteDialog.complaintId,
                        noteDialog.ownerId,
                        "resolve",
                        resolutionNote.trim()
                    );
                } catch (err) {
                    console.warn("notifyResolution (resolve) failed", err);
                }
            } else {
                toast.success("Report rejected due to insufficient evidence.");
                try {
                    await notifyResolution(
                        noteDialog.complaintId,
                        noteDialog.ownerId,
                        "reject",
                        resolutionNote.trim()
                    );
                } catch (err) {
                    console.warn("notifyResolution (reject) failed", err);
                }
            }

            await fetchData();
        } catch (e) {
            console.error("Action failed:", e.message);
            toast.error("Failed to complete action.");
        } finally {
            setNoteSubmitting(false);
            setNoteDialog({
                open: false,
                action: null,
                complaintId: null,
                itemId: null,
                ownerId: null,
                warningAmount: null,
            });
            setResolvingId(null);
        }
    };

    const markResolved = (complaintId) =>
        handleActionWithNote("resolve", complaintId);
    const rejectReport = (complaintId) =>
        handleActionWithNote("reject", complaintId);

    return (
        <AdminLayout>
            <div className="p-6 space-y-6">
                <div>
                    <h1 className="text-2xl font-bold mb-1">Reported Items</h1>
                    <p className="text-gray-600 mb-4">
                        Review and take action on reports submitted by users.
                    </p>
                </div>

                {/* Filter */}
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
                        <option value="banned">Banned</option>
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

                {/* Report list */}
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
                                        : r.status === "banned"
                                        ? "bg-amber-50/50"
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
                                                : r.status === "banned"
                                                ? "outline"
                                                : "default"
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
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="border-blue-400 text-blue-700 hover:bg-blue-50 cursor-pointer"
                                        disabled={sendingNoticeId === r.complaint_id}
                                        onClick={() =>
                                            sendNotice(
                                                r.complaint_id,
                                                r.target_item_id,
                                                r.item?.user_id,
                                                r.reason,
                                                r.rental_id
                                            )
                                        }
                                        title="Notify the item owner that their item was reported"
                                    >
                                        {sendingNoticeId === r.complaint_id ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <>
                                                <Bell className="w-4 h-4 mr-1" /> Notify
                                            </>
                                        )}
                                    </Button>
                                    {r.status === "pending" && (
                                        <>
                                            <Button
                                                size="sm"
                                                className="bg-amber-500 text-white hover:bg-amber-600"
                                                onClick={() =>
                                                    handleActionWithNote(
                                                        "ban",
                                                        r.complaint_id,
                                                        r.target_item_id,
                                                        r.item?.user_id,
                                                        1
                                                    )
                                                }
                                            >
                                                <Gavel className="w-4 h-4 mr-1" />{" "}
                                                Minor Violation
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="destructive"
                                                className="bg-red-600 text-white hover:bg-red-700"
                                                onClick={() =>
                                                    handleActionWithNote(
                                                        "ban",
                                                        r.complaint_id,
                                                        r.target_item_id,
                                                        r.item?.user_id,
                                                        3
                                                    )
                                                }
                                            >
                                                <ShieldBan className="w-4 h-4 mr-1" />{" "}
                                                Major Violation
                                            </Button>
                                            <Button
                                                size="sm"
                                                className="bg-green-600 text-white hover:bg-green-700"
                                                onClick={() =>
                                                    markResolved(r.complaint_id)
                                                }
                                            >
                                                <CheckCircle className="w-4 h-4 mr-1" />{" "}
                                                Resolve Only
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() =>
                                                    rejectReport(r.complaint_id)
                                                }
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

                {/* Resolution Note Dialog */}
                {noteDialog.open && (
                    <Dialog
                        open
                        onOpenChange={() =>
                            setNoteDialog({ ...noteDialog, open: false })
                        }
                    >
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>
                                    {noteDialog.action === "ban"
                                        ? `Confirm ${
                                              noteDialog.warningAmount === 1
                                                  ? "Minor"
                                                  : "Major"
                                          } Violation`
                                        : noteDialog.action === "resolve"
                                        ? "Resolve Report"
                                        : "Reject Report"}
                                </DialogTitle>
                            </DialogHeader>
                            <div className="mb-3 text-gray-700 text-sm">
                                {noteDialog.action === "ban" ? (
                                    <>
                                        Are you sure you want to ban this item
                                        and issue{" "}
                                        <b>+{noteDialog.warningAmount}</b>{" "}
                                        warning
                                        {noteDialog.warningAmount > 1 && "s"} to
                                        its owner?
                                    </>
                                ) : noteDialog.action === "resolve" ? (
                                    <>
                                        Mark this report as resolved without
                                        banning or warnings?
                                    </>
                                ) : (
                                    <>
                                        Reject this report? No action will be
                                        taken.
                                    </>
                                )}
                            </div>
                            <div className="mb-2">
                                <label className="block text-xs font-medium mb-1">
                                    Resolution Note{" "}
                                    <span className="text-red-500">*</span>
                                </label>
                                <textarea
                                    className="w-full border rounded p-2 text-sm"
                                    rows={3}
                                    value={resolutionNote}
                                    onChange={(e) =>
                                        setResolutionNote(e.target.value)
                                    }
                                    placeholder="Enter reason or details for this action (required)"
                                    required
                                    disabled={noteSubmitting}
                                />
                            </div>
                            <DialogFooter>
                                <Button
                                    variant="outline"
                                    onClick={() =>
                                        setNoteDialog({
                                            ...noteDialog,
                                            open: false,
                                        })
                                    }
                                    disabled={noteSubmitting}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    variant={
                                        noteDialog.action === "reject"
                                            ? "destructive"
                                            : "default"
                                    }
                                    disabled={
                                        noteSubmitting || !resolutionNote.trim()
                                    }
                                    onClick={submitNoteAction}
                                >
                                    {noteSubmitting ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : noteDialog.action === "ban" ? (
                                        <>
                                            <Gavel className="w-4 h-4 mr-1" />{" "}
                                            Confirm Ban
                                        </>
                                    ) : noteDialog.action === "resolve" ? (
                                        <>
                                            <CheckCircle className="w-4 h-4 mr-1" />{" "}
                                            Resolve
                                        </>
                                    ) : (
                                        <>
                                            <XCircle className="w-4 h-4 mr-1" />{" "}
                                            Reject
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
