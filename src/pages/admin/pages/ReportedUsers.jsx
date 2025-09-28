import React, { useCallback, useEffect, useMemo, useState } from "react";
import AdminLayout from "../../../components/AdminLayout";
import { supabase } from "../../../../supabaseClient";
import { useUser } from "../../../hooks/useUser";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Loader2, Eye } from "lucide-react";
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

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            let query = supabase
                .from("complaints")
                .select(
                    `complaint_id, sender_id, target_user_id, target_item_id, rental_id, reason, content, sent_at, status,
                     sender:users!complaints_sender_id_fkey(id, first_name, last_name),
                     target_user:users!complaints_target_user_id_fkey(id, first_name, last_name, profile_pic_url)`
                )
                .not("target_user_id", "is", null)
                .order("sent_at", { ascending: false });
            if (statusFilter && statusFilter !== "all") {
                query = query.eq("status", statusFilter);
            }
            const { data, error } = await query;
            if (error) throw error;
            setRows(data || []);
        } catch (e) {
            console.error("Load reported users failed:", e.message);
            toast.error("Failed to load reports.");
        } finally {
            setLoading(false);
        }
    }, [statusFilter, toast]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

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

    return (
        <AdminLayout>
            <div className="p-4">
                <h1 className="text-2xl font-bold mb-1">Reported Users</h1>
                <p className="text-gray-600 mb-4">
                    Review and resolve reports submitted against users
                </p>
                <div className="flex items-center gap-3 mb-3">
                    <label className="text-sm">Status</label>
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="border rounded px-2 py-1 text-sm"
                    >
                        <option value="pending">Pending</option>
                        <option value="resolved">Resolved</option>
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
                                <tr className="border-b bg-gray-50">
                                    <th className="p-2">Target User</th>
                                    <th className="p-2">Reported By</th>
                                    <th className="p-2">Reason</th>
                                    <th className="p-2">Sent</th>
                                    <th className="p-2">Status</th>
                                    <th className="p-2">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map((r) => (
                                    <tr key={r.complaint_id} className="border-b">
                                        <td className="p-2 text-sm">
                                            {r.target_user ? (
                                                <span>
                                                    {r.target_user.first_name} {r.target_user.last_name}
                                                </span>
                                            ) : (
                                                r.target_user_id
                                            )}
                                        </td>
                                        <td className="p-2 text-sm">
                                            {r.sender ? (
                                                <span>
                                                    {r.sender.first_name} {r.sender.last_name}
                                                </span>
                                            ) : (
                                                r.sender_id
                                            )}
                                        </td>
                                        <td className="p-2 text-sm capitalize">{r.reason}</td>
                                        <td className="p-2 text-sm">
                                            {r.sent_at ? new Date(r.sent_at).toLocaleString() : "—"}
                                        </td>
                                        <td className="p-2 text-sm capitalize">{r.status}</td>
                                        <td className="p-2">
                                            <div className="flex items-center gap-2">
                                                <ReportDetailsDialog row={r} />
                                                {r.status !== "resolved" && (
                                                    <Button
                                                        size="sm"
                                                        className="bg-green-600 text-white hover:bg-green-700 cursor-pointer"
                                                        disabled={resolvingId === r.complaint_id}
                                                        onClick={() => markResolved(r.complaint_id)}
                                                    >
                                                        {resolvingId === r.complaint_id ? (
                                                            <Loader2 className="w-4 h-4 animate-spin" />
                                                        ) : (
                                                            "Mark Resolved"
                                                        )}
                                                    </Button>
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
                <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                        <span>Target User</span>
                        <span>
                            {row.target_user
                                ? `${row.target_user.first_name || ""} ${row.target_user.last_name || ""}`
                                : row.target_user_id}
                        </span>
                    </div>
                    <div className="flex justify-between">
                        <span>Reported By</span>
                        <span>
                            {row.sender
                                ? `${row.sender.first_name || ""} ${row.sender.last_name || ""}`
                                : row.sender_id}
                        </span>
                    </div>
                    <div className="flex justify-between">
                        <span>Reason</span>
                        <span className="capitalize">{row.reason}</span>
                    </div>
                    <div>
                        <span className="block text-gray-600 mb-1">Content</span>
                        <p className="whitespace-pre-line">{row.content || "—"}</p>
                    </div>
                    <Separator />
                    <div className="flex justify-between">
                        <span>Sent</span>
                        <span>{row.sent_at ? new Date(row.sent_at).toLocaleString() : "—"}</span>
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
