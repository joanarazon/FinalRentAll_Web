import React, { useCallback, useEffect, useState } from "react";
import AdminLayout from "../../../components/AdminLayout";
import { supabase } from "../../../../supabaseClient";
import { useUser } from "../../../hooks/useUser";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Loader2, Eye, Gavel, ThumbsDown } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from "@/components/ui/dialog";
import { useToastApi } from "@/components/ui/toast";

export default function ReportedUsers() {
    const admin = useUser();
    const toast = useToastApi();
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(false);
    const [statusFilter, setStatusFilter] = useState("pending");
    const [resolvingId, setResolvingId] = useState(null);

    // For resolution note dialog
    const [noteDialog, setNoteDialog] = useState({
        open: false,
        action: null,
        complaintId: null,
        targetUserId: null,
        increment: null,
    });
    const [resolutionNote, setResolutionNote] = useState("");
    const [noteSubmitting, setNoteSubmitting] = useState(false);

    // Fetch reports from Supabase
    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            let query = supabase
                .from("user_complaints")
                .select(
                    `complaint_id, sender_id, target_user_id, rental_id, reason, content, sent_at, status,
           sender:users!user_complaints_sender_id_fkey(id, first_name, last_name),
           target_user:users!user_complaints_target_user_id_fkey(id, first_name, last_name, profile_pic_url, face_image_url)`
                )
                .order("sent_at", { ascending: false });

            if (statusFilter && statusFilter !== "all") {
                query = query.eq("status", statusFilter);
            }

            const { data, error } = await query;
            if (error) throw error;
            setRows(data || []);
        } catch (e) {
            console.error(e);
            toast.error("Failed to load reports.");
        } finally {
            setLoading(false);
        }
    }, [statusFilter, toast]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // --- Helper functions ---

    // Show note dialog, then handle action
    const handleActionWithNote = (
        action,
        complaintId,
        targetUserId = null,
        increment = null
    ) => {
        setResolutionNote("");
        setNoteDialog({
            open: true,
            action,
            complaintId,
            targetUserId,
            increment,
        });
    };

    // Called after note is submitted
    const submitNoteAction = async () => {
        if (!noteDialog.open || !resolutionNote.trim()) return;
        setNoteSubmitting(true);
        setResolvingId(noteDialog.complaintId);
        try {
            if (noteDialog.action === "warn") {
                // increment warnings
                const { error: warnError } = await supabase.rpc(
                    "increment_user_warnings",
                    {
                        user_id: noteDialog.targetUserId,
                        increment_by: noteDialog.increment,
                    }
                );
                if (warnError) throw warnError;
                // mark resolved
                const { error: resError } = await supabase
                    .from("user_complaints")
                    .update({
                        status: "resolved",
                        resolved_by: admin.id,
                        resolved_at: new Date().toISOString(),
                        resolution_note: resolutionNote.trim(),
                    })
                    .eq("complaint_id", noteDialog.complaintId);
                if (resError) throw resError;
                toast.success(
                    `Added +${noteDialog.increment} warning(s) and marked resolved.`
                );
            } else if (noteDialog.action === "resolve") {
                const { error } = await supabase
                    .from("user_complaints")
                    .update({
                        status: "resolved",
                        resolved_by: admin.id,
                        resolved_at: new Date().toISOString(),
                        resolution_note: resolutionNote.trim(),
                    })
                    .eq("complaint_id", noteDialog.complaintId);
                if (error) throw error;
                toast.success("Report marked as resolved.");
            } else if (noteDialog.action === "reject") {
                const { error } = await supabase
                    .from("user_complaints")
                    .update({
                        status: "rejected",
                        resolved_by: admin.id,
                        resolved_at: new Date().toISOString(),
                        resolution_note: resolutionNote.trim(),
                    })
                    .eq("complaint_id", noteDialog.complaintId);
                if (error) throw error;
                toast.success("Report rejected (not enough evidence).");
            }
            setNoteDialog({
                open: false,
                action: null,
                complaintId: null,
                targetUserId: null,
                increment: null,
            });
            setResolutionNote("");
            fetchData();
        } catch (e) {
            console.error(e);
            toast.error("Failed to complete action.");
        } finally {
            setNoteSubmitting(false);
            setResolvingId(null);
        }
    };

    const markResolved = async (complaintId) => {
        try {
            setResolvingId(complaintId);
            const { error } = await supabase
                .from("user_complaints")
                .update({ status: "resolved" })
                .eq("complaint_id", complaintId);
            if (error) throw error;
            toast.success("Report marked as resolved.");
            fetchData();
        } catch (e) {
            console.error(e);
            toast.error("Failed to mark resolved.");
        } finally {
            setResolvingId(null);
        }
    };

    const rejectReport = async (complaintId) => {
        try {
            setResolvingId(complaintId);
            const { error } = await supabase
                .from("user_complaints")
                .update({ status: "rejected" })
                .eq("complaint_id", complaintId);
            if (error) throw error;
            toast.success("Report rejected (not enough evidence).");
            fetchData();
        } catch (e) {
            console.error(e);
            toast.error("Failed to reject report.");
        } finally {
            setResolvingId(null);
        }
    };

    return (
        <AdminLayout>
            <div className="p-6 space-y-6">
                <div>
                    <h1 className="text-2xl font-bold mb-1">Reported Users</h1>
                    <p className="text-gray-600 mb-4">
                        Review, warn, resolve, or reject user complaints.
                    </p>
                    <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-900">
                        <strong>Action Guide:</strong>
                        <ul className="list-disc pl-5 mt-1 space-y-1">
                            <li>
                                <b>+1 Warning</b>: Adds 1 warning to the
                                reported user and marks the report as resolved.
                            </li>
                            <li>
                                <b>+3 Warnings</b>: Adds 3 warnings to the
                                reported user and marks the report as resolved.
                            </li>
                            <li>
                                <b>Mark Resolved</b>: Marks the report as
                                resolved without adding warnings.
                            </li>
                            <li>
                                <b>Reject</b>: Rejects the report (no action
                                taken, marks as rejected).
                            </li>
                            <li>
                                <b>View</b>: Shows full details of the report.
                            </li>
                        </ul>
                    </div>
                </div>

                {/* Filters */}
                <div className="flex items-center gap-3 mb-6">
                    <label className="text-sm font-medium">Status</label>
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="border rounded-md px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
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
                        className="cursor-pointer"
                    >
                        {loading && (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        )}
                        Refresh
                    </Button>
                </div>

                {/* Table */}
                <div className="bg-white rounded-lg shadow-sm border p-4">
                    {loading ? (
                        <div className="text-sm text-gray-600">Loading…</div>
                    ) : rows.length === 0 ? (
                        <div className="text-sm text-gray-600">
                            No reports found.
                        </div>
                    ) : (
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b bg-gray-50 text-gray-700 text-sm">
                                    <th className="p-2">Target User</th>
                                    <th className="p-2">Reported By</th>
                                    <th className="p-2">Reason</th>
                                    <th className="p-2">Sent</th>
                                    <th className="p-2">Status</th>
                                    <th className="p-2">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map((r) => (
                                    <tr
                                        key={r.complaint_id}
                                        className="border-b hover:bg-gray-50"
                                    >
                                        <td className="p-2 text-sm">
                                            {r.target_user
                                                ? `${r.target_user.first_name} ${r.target_user.last_name}`
                                                : r.target_user_id}
                                        </td>
                                        <td className="p-2 text-sm">
                                            {r.sender
                                                ? `${r.sender.first_name} ${r.sender.last_name}`
                                                : r.sender_id}
                                        </td>
                                        <td className="p-2 text-sm capitalize">
                                            {r.reason}
                                        </td>
                                        <td className="p-2 text-sm">
                                            {r.sent_at
                                                ? new Date(
                                                      r.sent_at
                                                  ).toLocaleString()
                                                : "—"}
                                        </td>
                                        <td className="p-2 text-sm capitalize">
                                            {r.status}
                                        </td>
                                        <td className="p-2">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <ReportDetailsDialog row={r} />

                                                {r.status === "pending" && (
                                                    <>
                                                        <Button
                                                            size="sm"
                                                            className="bg-yellow-500 text-white hover:bg-yellow-600 cursor-pointer"
                                                            disabled={
                                                                resolvingId ===
                                                                r.complaint_id
                                                            }
                                                            onClick={() =>
                                                                handleActionWithNote(
                                                                    "warn",
                                                                    r.complaint_id,
                                                                    r.target_user_id,
                                                                    1
                                                                )
                                                            }
                                                            title="Adds 1 warning to the user and resolves the report."
                                                        >
                                                            {resolvingId ===
                                                            r.complaint_id ? (
                                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                            ) : (
                                                                <>
                                                                    <Gavel className="w-4 h-4 mr-1" />{" "}
                                                                    +1 Warning
                                                                </>
                                                            )}
                                                        </Button>

                                                        <Button
                                                            size="sm"
                                                            className="bg-red-600 text-white hover:bg-red-700 cursor-pointer"
                                                            disabled={
                                                                resolvingId ===
                                                                r.complaint_id
                                                            }
                                                            onClick={() =>
                                                                handleActionWithNote(
                                                                    "warn",
                                                                    r.complaint_id,
                                                                    r.target_user_id,
                                                                    3
                                                                )
                                                            }
                                                            title="Adds 3 warnings to the user and resolves the report."
                                                        >
                                                            {resolvingId ===
                                                            r.complaint_id ? (
                                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                            ) : (
                                                                <>
                                                                    <Gavel className="w-4 h-4 mr-1" />{" "}
                                                                    +3 Warnings
                                                                </>
                                                            )}
                                                        </Button>

                                                        <Button
                                                            size="sm"
                                                            className="bg-green-600 text-white hover:bg-green-700 cursor-pointer"
                                                            disabled={
                                                                resolvingId ===
                                                                r.complaint_id
                                                            }
                                                            onClick={() =>
                                                                handleActionWithNote(
                                                                    "resolve",
                                                                    r.complaint_id
                                                                )
                                                            }
                                                            title="Marks the report as resolved without adding warnings."
                                                        >
                                                            {resolvingId ===
                                                            r.complaint_id ? (
                                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                            ) : (
                                                                "Mark Resolved"
                                                            )}
                                                        </Button>

                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="border-gray-400 text-gray-700 hover:bg-gray-100 cursor-pointer"
                                                            disabled={
                                                                resolvingId ===
                                                                r.complaint_id
                                                            }
                                                            onClick={() =>
                                                                handleActionWithNote(
                                                                    "reject",
                                                                    r.complaint_id
                                                                )
                                                            }
                                                            title="Rejects the report (no action taken, marks as rejected)."
                                                        >
                                                            {resolvingId ===
                                                            r.complaint_id ? (
                                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                            ) : (
                                                                <>
                                                                    <ThumbsDown className="w-4 h-4 mr-1" />{" "}
                                                                    Reject
                                                                </>
                                                            )}
                                                        </Button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
            {/* Resolution Note Modal */}
            <Dialog
                open={noteDialog.open}
                onOpenChange={(open) => {
                    if (!open)
                        setNoteDialog({
                            open: false,
                            action: null,
                            complaintId: null,
                            targetUserId: null,
                            increment: null,
                        });
                }}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Resolution Note</DialogTitle>
                    </DialogHeader>
                    <div className="mb-4">
                        <label
                            htmlFor="resolution-note"
                            className="block text-sm font-medium mb-1"
                        >
                            Please provide a resolution note (required):
                        </label>
                        <textarea
                            id="resolution-note"
                            className="w-full border rounded px-2 py-1 text-sm min-h-[60px]"
                            value={resolutionNote}
                            onChange={(e) => setResolutionNote(e.target.value)}
                            disabled={noteSubmitting}
                            required
                        />
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() =>
                                setNoteDialog({
                                    open: false,
                                    action: null,
                                    complaintId: null,
                                    targetUserId: null,
                                    increment: null,
                                })
                            }
                            disabled={noteSubmitting}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={submitNoteAction}
                            disabled={noteSubmitting || !resolutionNote.trim()}
                        >
                            {noteSubmitting ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                "Submit"
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AdminLayout>
    );
}

// Report Details Modal
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
                    {row.target_user?.face_image_url && (
                        <div className="flex flex-col items-center mb-2">
                            <img
                                src={row.target_user.face_image_url}
                                alt={row.target_user.first_name || "User face"}
                                className="max-h-56 rounded-lg border mb-2"
                                style={{ objectFit: "contain" }}
                            />
                            <span className="text-xs text-gray-500">
                                Face Photo
                            </span>
                        </div>
                    )}
                    <div className="flex justify-between">
                        <span>Target User</span>
                        <span>
                            {row.target_user
                                ? `${row.target_user.first_name || ""} ${
                                      row.target_user.last_name || ""
                                  }`
                                : row.target_user_id}
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
                <DialogFooter></DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
