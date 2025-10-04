"use client"

import { useEffect, useState, useMemo } from "react"
import AdminLayout from "../../../components/AdminLayout"
import { Button } from "@/components/ui/button"
import { supabase } from "../../../../supabaseClient"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import { Loader2, CalendarIcon, Search, Check, X, UserCheck, Clock, Filter } from "lucide-react"
import { useToastApi } from "@/components/ui/toast"

export default function PendingUser() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Filters
  const [filterName, setFilterName] = useState("")
  const [filterId, setFilterId] = useState("")
  const [actionUserId, setActionUserId] = useState(null)
  const [filterDate, setFilterDate] = useState(null)
  const toast = useToastApi()
  const [previewUser, setPreviewUser] = useState(null)

  // Fetch pending users (role = 'unverified')
  const fetchUsers = async () => {
    const MIN_DURATION = 1000
    const start = performance.now()
    try {
      setLoading(true)
      setError(null)
      const { data, error: fetchErr } = await supabase
        .from("users")
        .select("id, first_name, last_name, created_at, id_image_url, face_image_url, face_verified, role")
        .eq("role", "unverified")
        .order("created_at", { ascending: false })
      if (fetchErr) throw fetchErr
      setUsers(data || [])
    } catch (e) {
      console.error("Fetch pending users error", e)
      setError(e.message)
      toast.error("Failed to load pending users: " + e.message)
    } finally {
      const elapsed = performance.now() - start
      const remaining = MIN_DURATION - elapsed
      if (remaining > 0) {
        await new Promise((res) => setTimeout(res, remaining))
      }
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  const filtered = useMemo(() => {
    return users.filter((u) => {
      const fullName = `${u.first_name || ""} ${u.last_name || ""}`.trim().toLowerCase()
      const idMatch = u.id.toLowerCase().includes(filterId.toLowerCase())
      const nameMatch = fullName.includes(filterName.toLowerCase())
      let dateMatch = true
      if (filterDate) {
        const created = new Date(u.created_at)
        dateMatch = created.toDateString() === filterDate.toDateString()
      }
      return idMatch && nameMatch && dateMatch
    })
  }, [users, filterName, filterId, filterDate])

  const handleApprove = async (userId) => {
    try {
      setActionUserId(userId)
      const { error: updErr } = await supabase
        .from("users")
        .update({
          role: "user",
          face_verified: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId)
      if (updErr) throw updErr
      await supabase.from("activity_log").insert([
        {
          user_id: userId,
          action_type: "user_approved",
          description: "Admin approved user and set face_verified TRUE",
          target_table: "users",
          target_id: userId,
        },
      ])
      toast.success("User approved")
      setUsers((prev) => prev.filter((u) => u.id !== userId))
    } catch (e) {
      console.error("Approve error", e)
      toast.error("Approve failed: " + e.message)
    } finally {
      setActionUserId(null)
    }
  }

  const handleReject = async (userId) => {
    try {
      setActionUserId(userId)
      const { error: updErr } = await supabase
        .from("users")
        .update({
          role: "rejected",
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId)
      if (updErr) throw updErr
      await supabase.from("activity_log").insert([
        {
          user_id: userId,
          action_type: "user_rejected",
          description: "Admin rejected user registration",
          target_table: "users",
          target_id: userId,
        },
      ])
      toast.info("User rejected")
      setUsers((prev) => prev.filter((u) => u.id !== userId))
    } catch (e) {
      console.error("Reject error", e)
      toast.error("Reject failed: " + e.message)
    } finally {
      setActionUserId(null)
    }
  }

  const formatDate = (iso) => {
    try {
      return new Date(iso).toLocaleDateString()
    } catch {
      return "-"
    }
  }

  return (
    <AdminLayout className="bg-[#FAF5EF] min-h-screen">
      <div className="p-6 max-w-[1600px] mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#FFAB00] to-[#FF8C00] flex items-center justify-center shadow-lg">
              <UserCheck className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-[#1E1E1E]">Pending User Accounts</h1>
              <p className="text-sm text-gray-600 mt-1">Review and approve new user registrations</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Pending</p>
                  <p className="text-2xl font-bold text-[#1E1E1E]">{users.length}</p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-[#FFAB00]/10 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-[#FFAB00]" />
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Filtered Results</p>
                  <p className="text-2xl font-bold text-[#1E1E1E]">{filtered.length}</p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                  <Filter className="w-5 h-5 text-blue-600" />
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Quick Actions</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={fetchUsers}
                    disabled={loading}
                    className="mt-1 border-[#FFAB00] text-[#FFAB00] hover:bg-[#FFAB00] hover:text-white bg-transparent"
                  >
                    {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Refresh Data
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-5 h-5 text-[#FFAB00]" />
            <h2 className="text-lg font-semibold text-[#1E1E1E]">Filter Users</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <label className="text-xs font-medium text-gray-600 mb-2 block">Search by Name</label>
              <div className="relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  placeholder="Enter user name..."
                  className="border border-gray-300 py-2.5 pl-10 pr-3 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-[#FFAB00] focus:border-transparent transition-all"
                  value={filterName}
                  onChange={(e) => setFilterName(e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-2 block">Search by User ID</label>
              <input
                placeholder="Enter user ID..."
                className="border border-gray-300 py-2.5 px-4 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-[#FFAB00] focus:border-transparent transition-all"
                value={filterId}
                onChange={(e) => setFilterId(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-2 block">Filter by Sign Up Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal border-gray-300 hover:border-[#FFAB00] transition-all bg-transparent"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4 text-gray-500" />
                    <span className={filterDate ? "text-[#1E1E1E]" : "text-gray-500"}>
                      {filterDate ? filterDate.toLocaleDateString() : "Select date..."}
                    </span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={filterDate}
                    onSelect={setFilterDate}
                    disabled={(d) => d > new Date()}
                    captionLayout="dropdown"
                    fromYear={1900}
                    toYear={new Date().getFullYear()}
                    initialFocus
                  />
                  {filterDate && (
                    <div className="p-2 pt-0 text-right border-t">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setFilterDate(null)}
                        className="text-[#FFAB00] hover:text-[#FF8C00]"
                      >
                        Clear Filter
                      </Button>
                    </div>
                  )}
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold text-[#1E1E1E]">User Verification Queue</h3>
                <p className="text-sm text-gray-600 mt-1">
                  {loading
                    ? "Loading pending users..."
                    : `Showing ${filtered.length} of ${users.length} pending user${users.length !== 1 ? "s" : ""}`}
                </p>
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="p-4 text-left">
                    <input type="checkbox" disabled className="rounded border-gray-300" />
                  </th>
                  <th className="p-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    User ID
                  </th>
                  <th className="p-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Sign Up Date
                  </th>
                  <th className="p-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    User Name
                  </th>
                  <th className="p-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    ID Document
                  </th>
                  <th className="p-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {!loading && filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center">
                      <div className="flex flex-col items-center justify-center text-gray-500">
                        <UserCheck className="w-12 h-12 mb-3 text-gray-300" />
                        <p className="text-sm font-medium">No pending users found</p>
                        <p className="text-xs mt-1">Try adjusting your filters</p>
                      </div>
                    </td>
                  </tr>
                )}
                {loading && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center">
                      <div className="flex items-center justify-center gap-2 text-gray-500">
                        <Loader2 className="h-5 w-5 animate-spin text-[#FFAB00]" />
                        <span className="text-sm">Loading users...</span>
                      </div>
                    </td>
                  </tr>
                )}
                {!loading &&
                  filtered.map((u) => {
                    const fullName = `${u.first_name || ""} ${u.last_name || ""}`.trim() || "(No Name)"
                    return (
                      <tr
                        key={u.id}
                        className="border-b border-gray-100 last:border-b-0 hover:bg-[#FAF5EF] transition-colors"
                      >
                        <td className="p-4">
                          <input type="checkbox" className="rounded border-gray-300" />
                        </td>
                        <td className="p-4">
                          <span className="text-sm font-mono text-[#FFAB00] font-medium break-all">{u.id}</span>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <CalendarIcon className="w-4 h-4 text-gray-400" />
                            <span className="text-sm text-gray-700">{formatDate(u.created_at)}</span>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#FFAB00] to-[#FF8C00] flex items-center justify-center text-white text-xs font-semibold">
                              {fullName.charAt(0).toUpperCase()}
                            </div>
                            <span className="text-sm font-medium text-[#1E1E1E]">{fullName}</span>
                          </div>
                        </td>
                        <td className="p-4">
                          {u.id_image_url ? (
                            <button
                              onClick={() => setPreviewUser(u)}
                              className="text-sm text-blue-600 hover:text-blue-800 font-medium underline decoration-2 underline-offset-2 transition-colors"
                            >
                              View Document
                            </button>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                              No Document
                            </span>
                          )}
                        </td>
                        <td className="p-4">
                          <div className="flex gap-2">
                            <Button
                              className="bg-green-600 text-white hover:bg-green-700 shadow-sm hover:shadow-md transition-all flex items-center gap-1.5"
                              size="sm"
                              disabled={actionUserId === u.id}
                              onClick={() => handleApprove(u.id)}
                            >
                              {actionUserId === u.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Check className="h-4 w-4" />
                              )}
                              Approve
                            </Button>
                            <Button
                              className="bg-red-600 text-white hover:bg-red-700 shadow-sm hover:shadow-md transition-all flex items-center gap-1.5"
                              size="sm"
                              disabled={actionUserId === u.id}
                              onClick={() => handleReject(u.id)}
                            >
                              {actionUserId === u.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <X className="h-4 w-4" />
                              )}
                              Reject
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {previewUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setPreviewUser(null)} />
          <div className="relative z-10 w-full max-w-2xl max-h-[90vh] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#FFAB00] to-[#FF8C00] flex items-center justify-center">
                  <UserCheck className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-[#1E1E1E]">ID Document Preview</h2>
                  <p className="text-xs text-gray-600 mt-0.5">
                    {(previewUser.first_name || "") + " " + (previewUser.last_name || "")}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setPreviewUser(null)}
                className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-500 hover:text-gray-800 transition-all"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto bg-[#FAF5EF]">
              {previewUser.id_image_url ? (
                <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
                  <img
                    src={previewUser.id_image_url || "/placeholder.svg"}
                    alt="User ID Document"
                    className="w-full h-auto rounded-lg"
                  />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                  <UserCheck className="w-16 h-16 mb-3 text-gray-300" />
                  <p className="text-sm font-medium">No ID document available</p>
                </div>
              )}
            </div>
            <div className="flex justify-between items-center gap-3 px-6 py-4 border-t border-gray-200 bg-white">
              <div className="flex gap-2">
                <Button
                  className="bg-green-600 text-white hover:bg-green-700 shadow-sm hover:shadow-md transition-all flex items-center gap-2"
                  size="sm"
                  disabled={actionUserId === previewUser.id}
                  onClick={() => {
                    handleApprove(previewUser.id)
                    setPreviewUser(null)
                  }}
                >
                  {actionUserId === previewUser.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                  Approve User
                </Button>
                <Button
                  className="bg-red-600 text-white hover:bg-red-700 shadow-sm hover:shadow-md transition-all flex items-center gap-2"
                  size="sm"
                  disabled={actionUserId === previewUser.id}
                  onClick={() => {
                    handleReject(previewUser.id)
                    setPreviewUser(null)
                  }}
                >
                  {actionUserId === previewUser.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <X className="h-4 w-4" />
                  )}
                  Reject User
                </Button>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPreviewUser(null)}
                className="border-gray-300 hover:bg-gray-50"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
