"use client"

import { useCallback, useEffect, useState } from "react"
import AdminLayout from "../../../components/AdminLayout"
import { supabase } from "../../../../supabaseClient"
import { useUser } from "../../../hooks/useUser"
import { Button } from "@/components/ui/button"
import { Loader2, Eye, Gavel, ThumbsDown, AlertCircle, RefreshCw, Info } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import { useToastApi } from "@/components/ui/toast"
import { Badge } from "@/components/ui/badge"

export default function ReportedUsers() {
  const admin = useUser()
  const toast = useToastApi()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [statusFilter, setStatusFilter] = useState("pending")
  const [resolvingId, setResolvingId] = useState(null)

  // For resolution note dialog
  const [noteDialog, setNoteDialog] = useState({
    open: false,
    action: null,
    complaintId: null,
    targetUserId: null,
    increment: null,
  })
  const [resolutionNote, setResolutionNote] = useState("")
  const [noteSubmitting, setNoteSubmitting] = useState(false)

  // Fetch reports from Supabase
  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      let query = supabase
        .from("user_complaints")
        .select(
          `complaint_id, sender_id, target_user_id, rental_id, reason, content, sent_at, status,
           sender:users!user_complaints_sender_id_fkey(id, first_name, last_name),
           target_user:users!user_complaints_target_user_id_fkey(id, first_name, last_name, profile_pic_url, face_image_url)`,
        )
        .order("sent_at", { ascending: false })

      if (statusFilter && statusFilter !== "all") {
        query = query.eq("status", statusFilter)
      }

      const { data, error } = await query
      if (error) throw error
      setRows(data || [])
    } catch (e) {
      console.error(e)
      toast.error("Failed to load reports.")
    } finally {
      setLoading(false)
    }
  }, [statusFilter, toast])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // --- Helper functions ---

  // Show note dialog, then handle action
  const handleActionWithNote = (action, complaintId, targetUserId = null, increment = null) => {
    setResolutionNote("")
    setNoteDialog({
      open: true,
      action,
      complaintId,
      targetUserId,
      increment,
    })
  }

  // Called after note is submitted
  const submitNoteAction = async () => {
    if (!noteDialog.open || !resolutionNote.trim()) return
    setNoteSubmitting(true)
    setResolvingId(noteDialog.complaintId)
    try {
      if (noteDialog.action === "warn") {
        // increment warnings
        const { error: warnError } = await supabase.rpc("increment_user_warnings", {
          user_id: noteDialog.targetUserId,
          increment_by: noteDialog.increment,
        })
        if (warnError) throw warnError
        // mark resolved
        const { error: resError } = await supabase
          .from("user_complaints")
          .update({
            status: "resolved",
            resolved_by: admin.id,
            resolved_at: new Date().toISOString(),
            resolution_note: resolutionNote.trim(),
          })
          .eq("complaint_id", noteDialog.complaintId)
        if (resError) throw resError
        toast.success(`Added +${noteDialog.increment} warning(s) and marked resolved.`)
      } else if (noteDialog.action === "resolve") {
        const { error } = await supabase
          .from("user_complaints")
          .update({
            status: "resolved",
            resolved_by: admin.id,
            resolved_at: new Date().toISOString(),
            resolution_note: resolutionNote.trim(),
          })
          .eq("complaint_id", noteDialog.complaintId)
        if (error) throw error
        toast.success("Report marked as resolved.")
      } else if (noteDialog.action === "reject") {
        const { error } = await supabase
          .from("user_complaints")
          .update({
            status: "rejected",
            resolved_by: admin.id,
            resolved_at: new Date().toISOString(),
            resolution_note: resolutionNote.trim(),
          })
          .eq("complaint_id", noteDialog.complaintId)
        if (error) throw error
        toast.success("Report rejected (not enough evidence).")
      }
      setNoteDialog({
        open: false,
        action: null,
        complaintId: null,
        targetUserId: null,
        increment: null,
      })
      setResolutionNote("")
      fetchData()
    } catch (e) {
      console.error(e)
      toast.error("Failed to complete action.")
    } finally {
      setNoteSubmitting(false)
      setResolvingId(null)
    }
  }

  const markResolved = async (complaintId) => {
    try {
      setResolvingId(complaintId)
      const { error } = await supabase
        .from("user_complaints")
        .update({ status: "resolved" })
        .eq("complaint_id", complaintId)
      if (error) throw error
      toast.success("Report marked as resolved.")
      fetchData()
    } catch (e) {
      console.error(e)
      toast.error("Failed to mark resolved.")
    } finally {
      setResolvingId(null)
    }
  }

  const rejectReport = async (complaintId) => {
    try {
      setResolvingId(complaintId)
      const { error } = await supabase
        .from("user_complaints")
        .update({ status: "rejected" })
        .eq("complaint_id", complaintId)
      if (error) throw error
      toast.success("Report rejected (not enough evidence).")
      fetchData()
    } catch (e) {
      console.error(e)
      toast.error("Failed to reject report.")
    } finally {
      setResolvingId(null)
    }
  }

  const getStatusBadge = (status) => {
    const styles = {
      pending: "bg-[#FFAB00]/10 text-[#FFAB00] border-[#FFAB00]/20",
      resolved: "bg-emerald-50 text-emerald-700 border-emerald-200",
      rejected: "bg-slate-100 text-slate-700 border-slate-200",
    }
    return styles[status] || styles.pending
  }

  return (
    <AdminLayout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100/50 p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header Section */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h1 className="text-3xl font-bold text-slate-900 mb-2">Reported Users</h1>
                <p className="text-slate-600 text-base">Review, warn, resolve, or reject user complaints</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 bg-slate-50 rounded-lg px-4 py-2 border border-slate-200">
                  <label className="text-sm font-medium text-slate-700">Status:</label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="bg-transparent border-none text-sm font-medium text-slate-900 focus:ring-0 outline-none cursor-pointer"
                  >
                    <option value="pending">Pending</option>
                    <option value="resolved">Resolved</option>
                    <option value="rejected">Rejected</option>
                    <option value="all">All</option>
                  </select>
                </div>
                <Button
                  variant="outline"
                  onClick={fetchData}
                  disabled={loading}
                  className="cursor-pointer border-slate-300 hover:bg-slate-50 bg-transparent"
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                  Refresh
                </Button>
              </div>
            </div>

            <div className="bg-gradient-to-r from-[#FFAB00]/5 to-amber-50/50 border border-[#FFAB00]/20 rounded-xl p-5">
              <div className="flex gap-3">
                <Info className="w-5 h-5 text-[#FFAB00] flex-shrink-0 mt-0.5" />
                <div className="space-y-2">
                  <h3 className="font-semibold text-slate-900 text-sm">Action Guide</h3>
                  <ul className="space-y-2 text-sm text-slate-700">
                    <li className="flex items-start gap-2">
                      <span className="text-[#FFAB00] font-bold">•</span>
                      <span>
                        <strong className="text-slate-900">+1 Warning:</strong> Adds 1 warning to the reported user and
                        marks the report as resolved
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[#FFAB00] font-bold">•</span>
                      <span>
                        <strong className="text-slate-900">+3 Warnings:</strong> Adds 3 warnings to the reported user
                        and marks the report as resolved
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[#FFAB00] font-bold">•</span>
                      <span>
                        <strong className="text-slate-900">Mark Resolved:</strong> Marks the report as resolved without
                        adding warnings
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[#FFAB00] font-bold">•</span>
                      <span>
                        <strong className="text-slate-900">Reject:</strong> Rejects the report (no action taken, marks
                        as rejected)
                      </span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="text-center space-y-3">
                  <Loader2 className="w-8 h-8 animate-spin text-[#FFAB00] mx-auto" />
                  <p className="text-sm text-slate-600">Loading reports...</p>
                </div>
              </div>
            ) : rows.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-4">
                <AlertCircle className="w-12 h-12 text-slate-300 mb-3" />
                <p className="text-slate-600 font-medium">No reports found</p>
                <p className="text-sm text-slate-500 mt-1">Try adjusting your filters</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                        Target User
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                        Reported By
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                        Reason
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rows.map((r) => (
                      <tr key={r.complaint_id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-medium text-slate-900">
                            {r.target_user
                              ? `${r.target_user.first_name} ${r.target_user.last_name}`
                              : r.target_user_id}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-slate-700">
                            {r.sender ? `${r.sender.first_name} ${r.sender.last_name}` : r.sender_id}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-700 capitalize">
                            {r.reason}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-slate-600">
                            {r.sent_at
                              ? new Date(r.sent_at).toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                              : "—"}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <Badge variant="outline" className={`capitalize ${getStatusBadge(r.status)}`}>
                            {r.status}
                          </Badge>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-start gap-2">
                            <ReportDetailsDialog row={r} />

                            {r.status === "pending" && (
                              <div className="grid grid-cols-2 gap-2">
                                <Button
                                  size="sm"
                                  className="bg-[#FFAB00] text-slate-900 hover:bg-[#FF9500] cursor-pointer font-medium shadow-sm whitespace-nowrap"
                                  disabled={resolvingId === r.complaint_id}
                                  onClick={() => handleActionWithNote("warn", r.complaint_id, r.target_user_id, 1)}
                                  title="Adds 1 warning to the user and resolves the report."
                                >
                                  {resolvingId === r.complaint_id ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <>
                                      <Gavel className="w-4 h-4 mr-1.5" />
                                      +1 Warning
                                    </>
                                  )}
                                </Button>

                                <Button
                                  size="sm"
                                  className="bg-rose-600 text-white hover:bg-rose-700 cursor-pointer font-medium shadow-sm whitespace-nowrap"
                                  disabled={resolvingId === r.complaint_id}
                                  onClick={() => handleActionWithNote("warn", r.complaint_id, r.target_user_id, 3)}
                                  title="Adds 3 warnings to the user and resolves the report."
                                >
                                  {resolvingId === r.complaint_id ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <>
                                      <Gavel className="w-4 h-4 mr-1.5" />
                                      +3 Warnings
                                    </>
                                  )}
                                </Button>

                                <Button
                                  size="sm"
                                  className="bg-emerald-600 text-white hover:bg-emerald-700 cursor-pointer font-medium shadow-sm whitespace-nowrap"
                                  disabled={resolvingId === r.complaint_id}
                                  onClick={() => handleActionWithNote("resolve", r.complaint_id)}
                                  title="Marks the report as resolved without adding warnings."
                                >
                                  {resolvingId === r.complaint_id ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    "Mark Resolved"
                                  )}
                                </Button>

                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="border-slate-300 text-slate-700 hover:bg-slate-50 cursor-pointer font-medium bg-transparent whitespace-nowrap"
                                  disabled={resolvingId === r.complaint_id}
                                  onClick={() => handleActionWithNote("reject", r.complaint_id)}
                                  title="Rejects the report (no action taken, marks as rejected)."
                                >
                                  {resolvingId === r.complaint_id ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <>
                                      <ThumbsDown className="w-4 h-4 mr-1.5" />
                                      Reject
                                    </>
                                  )}
                                </Button>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

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
            })
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">Resolution Note</DialogTitle>
            <DialogDescription className="text-slate-600">
              Please provide a detailed note explaining your decision
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label htmlFor="resolution-note" className="block text-sm font-medium text-slate-700">
              Note <span className="text-rose-500">*</span>
            </label>
            <textarea
              id="resolution-note"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm min-h-[100px] focus:ring-2 focus:ring-[#FFAB00] focus:border-[#FFAB00] outline-none resize-none"
              placeholder="Enter your resolution note here..."
              value={resolutionNote}
              onChange={(e) => setResolutionNote(e.target.value)}
              disabled={noteSubmitting}
              required
            />
            <p className="text-xs text-slate-500">This note will be saved with the report for future reference</p>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
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
              className="border-slate-300"
            >
              Cancel
            </Button>
            <Button
              onClick={submitNoteAction}
              disabled={noteSubmitting || !resolutionNote.trim()}
              className="bg-[#FFAB00] text-slate-900 hover:bg-[#FF9500] font-medium"
            >
              {noteSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  )
}

function ReportDetailsDialog({ row }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          size="sm"
          variant="outline"
          className="cursor-pointer border-slate-300 hover:bg-slate-50 font-medium bg-transparent"
        >
          <Eye className="w-4 h-4 mr-1.5" /> View
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Report Details</DialogTitle>
          <DialogDescription className="text-slate-600">Complete information about this user report</DialogDescription>
        </DialogHeader>
        <div className="space-y-5">
          {row.target_user?.face_image_url && (
            <div className="flex flex-col items-center p-4 bg-slate-50 rounded-xl border border-slate-200">
              <img
                src={row.target_user.face_image_url || "/placeholder.svg"}
                alt={row.target_user.first_name || "User face"}
                className="max-h-64 rounded-lg shadow-sm mb-3"
                style={{ objectFit: "contain" }}
              />
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Face Photo</span>
            </div>
          )}

          <div className="space-y-4">
            <div className="flex justify-between items-start py-2 border-b border-slate-100">
              <span className="text-sm font-medium text-slate-600">Target User</span>
              <span className="text-sm font-semibold text-slate-900 text-right">
                {row.target_user
                  ? `${row.target_user.first_name || ""} ${row.target_user.last_name || ""}`
                  : row.target_user_id}
              </span>
            </div>
            <div className="flex justify-between items-start py-2 border-b border-slate-100">
              <span className="text-sm font-medium text-slate-600">Reported By</span>
              <span className="text-sm font-semibold text-slate-900 text-right">
                {row.sender ? `${row.sender.first_name || ""} ${row.sender.last_name || ""}` : row.sender_id}
              </span>
            </div>
            <div className="flex justify-between items-start py-2 border-b border-slate-100">
              <span className="text-sm font-medium text-slate-600">Reason</span>
              <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-700 capitalize">
                {row.reason}
              </span>
            </div>
            <div className="py-2 border-b border-slate-100">
              <span className="block text-sm font-medium text-slate-600 mb-2">Content</span>
              <p className="text-sm text-slate-900 whitespace-pre-line bg-slate-50 rounded-lg p-3 border border-slate-200">
                {row.content || "—"}
              </p>
            </div>
            <div className="flex justify-between items-start py-2">
              <span className="text-sm font-medium text-slate-600">Sent</span>
              <span className="text-sm text-slate-900 text-right">
                {row.sent_at
                  ? new Date(row.sent_at).toLocaleString("en-US", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "—"}
              </span>
            </div>
            <div className="flex justify-between items-start py-2">
              <span className="text-sm font-medium text-slate-600">Status</span>
              <Badge
                variant="outline"
                className={`capitalize ${
                  row.status === "pending"
                    ? "bg-[#FFAB00]/10 text-[#FFAB00] border-[#FFAB00]/20"
                    : row.status === "resolved"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "bg-slate-100 text-slate-700 border-slate-200"
                }`}
              >
                {row.status}
              </Badge>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
