"use client"

import { useEffect, useState, useMemo } from "react"
import AdminLayout from "../../../components/AdminLayout"
import { Button } from "@/components/ui/button"
import { supabase } from "../../../../supabaseClient"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import {
  Loader2,
  CalendarIcon,
  Search,
  Users,
  UserCheck,
  UserX,
  Shield,
  Mail,
  Eye,
  X,
  Filter,
  Download,
} from "lucide-react"
import { useToastApi } from "@/components/ui/toast"

export default function TotalUser() {
  const toast = useToastApi()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(false)

  // Filters
  const [filterName, setFilterName] = useState("")
  const [filterId, setFilterId] = useState("")
  const [filterEmail, setFilterEmail] = useState("")
  const [filterStatus, setFilterStatus] = useState("all")
  const [filterVerification, setFilterVerification] = useState("all")
  const [filterDate, setFilterDate] = useState(null)
  const [previewUser, setPreviewUser] = useState(null)

  // Fetch all users
  const fetchUsers = async () => {
    const MIN_DURATION = 800
    const start = performance.now()
    try {
      setLoading(true)
      const { data, error: fetchErr } = await supabase
        .from("users")
        .select(
          "id, first_name, last_name, created_at, id_image_url, face_image_url, face_verified, role, profile_pic_url, updated_at, dob",
        )
        .order("created_at", { ascending: false })
      if (fetchErr) throw fetchErr
      setUsers(data || [])
    } catch (e) {
      console.error("Fetch users error", e)
      toast.error("Failed to load users: " + e.message)
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

  // Statistics
  const stats = useMemo(() => {
    const total = users.length
    const verified = users.filter((u) => u.face_verified === true).length
    const active = users.filter((u) => u.role === "user").length
    const pending = users.filter((u) => u.role === "unverified").length
    return { total, verified, active, pending }
  }, [users])

  // Filtered users
  const filtered = useMemo(() => {
    return users.filter((u) => {
      const fullName = `${u.first_name || ""} ${u.last_name || ""}`.trim().toLowerCase()
      const email = (u.email || "").toLowerCase()
      const idMatch = u.id.toLowerCase().includes(filterId.toLowerCase())
      const nameMatch = fullName.includes(filterName.toLowerCase())
      const emailMatch = email.includes(filterEmail.toLowerCase())

      let statusMatch = true
      if (filterStatus !== "all") {
        statusMatch = u.role === filterStatus
      }

      let verificationMatch = true
      if (filterVerification === "verified") {
        verificationMatch = u.face_verified === true
      } else if (filterVerification === "unverified") {
        verificationMatch = u.face_verified !== true
      }

      let dateMatch = true
      if (filterDate) {
        try {
          const created = new Date(u.created_at)
          dateMatch = created.toDateString() === filterDate.toDateString()
        } catch {
          dateMatch = false
        }
      }

      return idMatch && nameMatch && emailMatch && statusMatch && verificationMatch && dateMatch
    })
  }, [users, filterName, filterId, filterEmail, filterStatus, filterVerification, filterDate])

  const formatDate = (iso) => {
    try {
      return new Date(iso).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    } catch {
      return "—"
    }
  }

  const getStatusBadge = (role) => {
    const badges = {
      user: {
        bg: "bg-green-100",
        text: "text-green-700",
        label: "Active",
      },
      unverified: {
        bg: "bg-yellow-100",
        text: "text-yellow-700",
        label: "Pending",
      },
      rejected: {
        bg: "bg-red-100",
        text: "text-red-700",
        label: "Rejected",
      },
      admin: {
        bg: "bg-purple-100",
        text: "text-purple-700",
        label: "Admin",
      },
    }
    const badge = badges[role] || {
      bg: "bg-gray-100",
      text: "text-gray-700",
      label: role || "Unknown",
    }
    return (
      <span
        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${badge.bg} ${badge.text}`}
      >
        {badge.label}
      </span>
    )
  }

  const getVerificationBadge = (verified) => {
    if (verified) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
          <UserCheck className="w-3 h-3" />
          Verified
        </span>
      )
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600">
        <UserX className="w-3 h-3" />
        Unverified
      </span>
    )
  }

  const clearAllFilters = () => {
    setFilterName("")
    setFilterId("")
    setFilterEmail("")
    setFilterStatus("all")
    setFilterVerification("all")
    setFilterDate(null)
  }

  const hasActiveFilters =
    filterName || filterId || filterEmail || filterStatus !== "all" || filterVerification !== "all" || filterDate

  return (
    <AdminLayout className="bg-gradient-to-br from-orange-50 to-amber-50 min-h-screen">
      <div className="p-6 max-w-[1800px] mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#FFAB00] to-[#FF8C00] flex items-center justify-center shadow-lg">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-gray-900">Total Users</h1>
              <p className="text-sm text-gray-600 mt-1">Comprehensive user management and overview</p>
            </div>
          </div>

          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
            <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-[#FFAB00]/10 flex items-center justify-center">
                  <Users className="w-5 h-5 text-[#FFAB00]" />
                </div>
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total</span>
              </div>
              <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
              <p className="text-xs text-gray-600 mt-1">All registered users</p>
            </div>

            <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
                  <UserCheck className="w-5 h-5 text-green-600" />
                </div>
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Active</span>
              </div>
              <p className="text-3xl font-bold text-green-600">{stats.active}</p>
              <p className="text-xs text-gray-600 mt-1">Active user accounts</p>
            </div>

            <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-blue-600" />
                </div>
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Verified</span>
              </div>
              <p className="text-3xl font-bold text-blue-600">{stats.verified}</p>
              <p className="text-xs text-gray-600 mt-1">ID verified users</p>
            </div>

            <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-yellow-50 flex items-center justify-center">
                  <UserX className="w-5 h-5 text-yellow-600" />
                </div>
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Pending</span>
              </div>
              <p className="text-3xl font-bold text-yellow-600">{stats.pending}</p>
              <p className="text-xs text-gray-600 mt-1">Awaiting verification</p>
            </div>
          </div>
        </div>

        {/* Filter Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-[#FFAB00]" />
              <h2 className="text-lg font-semibold text-gray-900">Filter Users</h2>
            </div>
            {hasActiveFilters && (
              <Button
                variant="outline"
                size="sm"
                onClick={clearAllFilters}
                className="text-[#FFAB00] border-[#FFAB00] hover:bg-[#FFAB00] hover:text-white bg-transparent"
              >
                Clear All Filters
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {/* Name Filter */}
            <div className="space-y-2">
              <label className="block text-xs font-medium text-gray-700">User Name</label>
              <div className="relative group">
                <Search className="w-4 h-4 text-gray-400 group-focus-within:text-[#FFAB00] absolute left-3 top-1/2 -translate-y-1/2 transition-colors" />
                <input
                  placeholder="Search name..."
                  className="border border-gray-300 py-2.5 pl-9 pr-3 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-[#FFAB00] focus:border-transparent transition-all bg-gray-50 focus:bg-white text-sm"
                  value={filterName}
                  onChange={(e) => setFilterName(e.target.value)}
                />
              </div>
            </div>

            {/* ID Filter */}
            <div className="space-y-2">
              <label className="block text-xs font-medium text-gray-700">User ID</label>
              <input
                placeholder="Enter ID..."
                className="border border-gray-300 py-2.5 px-3 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-[#FFAB00] focus:border-transparent transition-all bg-gray-50 focus:bg-white font-mono text-sm"
                value={filterId}
                onChange={(e) => setFilterId(e.target.value)}
              />
            </div>

            {/* Email Filter */}

            {/* Status Filter */}
            <div className="space-y-2">
              <label className="block text-xs font-medium text-gray-700">Account Status</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="border border-gray-300 py-2.5 px-3 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-[#FFAB00] focus:border-transparent transition-all bg-gray-50 focus:bg-white text-sm"
              >
                <option value="all">All Status</option>
                <option value="user">Active</option>
                <option value="unverified">Pending</option>
                <option value="rejected">Rejected</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            {/* Verification Filter */}
            <div className="space-y-2">
              <label className="block text-xs font-medium text-gray-700">Verification Status</label>
              <select
                value={filterVerification}
                onChange={(e) => setFilterVerification(e.target.value)}
                className="border border-gray-300 py-2.5 px-3 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-[#FFAB00] focus:border-transparent transition-all bg-gray-50 focus:bg-white text-sm"
              >
                <option value="all">All</option>
                <option value="verified">Verified</option>
                <option value="unverified">Unverified</option>
              </select>
            </div>

            {/* Date Filter */}
            <div className="space-y-2">
              <label className="block text-xs font-medium text-gray-700">Join Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal border-gray-300 py-2.5 px-3 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-[#FFAB00] focus:border-transparent transition-all bg-gray-50 hover:border-gray-400 text-sm h-auto"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4 text-gray-500" />
                    <span className={filterDate ? "text-gray-900" : "text-gray-500"}>
                      {filterDate ? formatDate(filterDate) : "Select..."}
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
                        className="text-[#FFAB00] hover:text-[#FF8C00] hover:bg-orange-50"
                      >
                        Clear
                      </Button>
                    </div>
                  )}
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-[#FFAB00] rounded-full animate-pulse" />
              <div>
                <h3 className="text-lg font-semibold text-gray-900">User Directory</h3>
                <p className="text-sm text-gray-600 mt-0.5">
                  {loading
                    ? "Loading users..."
                    : `Showing ${filtered.length} of ${users.length} user${users.length !== 1 ? "s" : ""}`}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchUsers}
                disabled={loading}
                className="border-gray-300 hover:border-[#FFAB00] hover:text-[#FFAB00] transition-colors bg-transparent"
              >
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Refresh
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="p-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    <input type="checkbox" disabled className="rounded" />
                  </th>
                  <th className="p-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">User ID</th>
                  <th className="p-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Username</th>
                  <th className="p-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">ID Photo</th>
                  <th className="p-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Account Status</th>
                  <th className="p-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Date Joined</th>
                  <th className="p-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Date of Birth</th>
                  <th className="p-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Verification</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-sm text-gray-500">
                      <div className="flex items-center justify-center gap-3">
                        <Loader2 className="h-5 w-5 animate-spin text-[#FFAB00]" />
                        <span>Loading users...</span>
                      </div>
                    </td>
                  </tr>
                )}
                {!loading && filtered.length === 0 && (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-sm text-gray-500">
                      <div className="flex flex-col items-center gap-2">
                        <Search className="w-8 h-8 text-gray-300" />
                        <p className="font-medium">No users found</p>
                        <p className="text-xs">Try adjusting your filters</p>
                      </div>
                    </td>
                  </tr>
                )}
                {!loading &&
                  filtered.map((user) => {
                    const fullName = `${user.first_name || ""} ${user.last_name || ""}`.trim() || "(No Name)"
                    return (
                      <tr key={user.id} className="border-b hover:bg-orange-50/30 transition-colors">
                        <td className="p-4">
                          <input type="checkbox" className="rounded" />
                        </td>
                        <td className="p-4 text-[#FFAB00] font-semibold font-mono text-xs break-all min-w-[140px]">
                          {user.id}
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#FFAB00] to-[#FF8C00] flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
                              {fullName.charAt(0).toUpperCase()}
                            </div>
                            <span className="text-sm font-medium text-gray-900">{fullName}</span>
                          </div>
                        </td>
                        <td className="p-4">
                          {user.id_image_url ? (
                            <button
                              onClick={() => setPreviewUser(user)}
                              className="text-[#FFAB00] hover:text-[#FF8C00] underline text-sm font-medium cursor-pointer transition-colors flex items-center gap-1.5"
                            >
                              <Eye className="w-4 h-4" />
                              View Photo
                            </button>
                          ) : (
                            <span className="text-gray-400 text-sm">No photo</span>
                          )}
                        </td>
                        <td className="p-4">{getStatusBadge(user.role)}</td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <CalendarIcon className="w-4 h-4 text-gray-400" />
                            <span className="text-sm text-gray-700">{formatDate(user.created_at)}</span>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <CalendarIcon className="w-4 h-4 text-gray-400" />
                            <span className="text-sm text-gray-700">
                              {user.dob ? formatDate(user.dob) : "—"}
                            </span>
                          </div>
                        </td>
                        <td className="p-4">{getVerificationBadge(user.face_verified)}</td>
                      </tr>
                    )
                  })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Preview Modal */}
      {previewUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setPreviewUser(null)} />
          <div className="relative z-10 w-full max-w-3xl max-h-[90vh] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-orange-50 to-amber-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#FFAB00] to-[#FF8C00] flex items-center justify-center">
                  <Users className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">User Profile</h2>
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
            <div className="p-6 overflow-y-auto bg-gradient-to-br from-gray-50 to-white">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* ID Photo */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-[#FFAB00]" />
                    ID Document
                  </h3>
                  {previewUser.id_image_url ? (
                    <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-200">
                      <img
                        src={previewUser.id_image_url || "/placeholder.svg" || "/placeholder.svg"}
                        alt="User ID Document"
                        className="w-full h-auto rounded-lg"
                      />
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 bg-gray-100 rounded-xl border-2 border-dashed border-gray-300">
                      <Shield className="w-12 h-12 mb-2 text-gray-300" />
                      <p className="text-sm text-gray-500">No ID document</p>
                    </div>
                  )}
                </div>

                {/* User Details */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <Users className="w-4 h-4 text-[#FFAB00]" />
                    User Information
                  </h3>
                  <div className="space-y-3">
                    <div className="bg-white p-4 rounded-lg border border-gray-200">
                      <p className="text-xs text-gray-500 mb-1">User ID</p>
                      <p className="text-sm font-mono text-[#FFAB00] font-semibold break-all">{previewUser.id}</p>
                    </div>
                    <div className="bg-white p-4 rounded-lg border border-gray-200">
                      <p className="text-xs text-gray-500 mb-1">Full Name</p>
                      <p className="text-sm font-medium text-gray-900">
                        {(previewUser.first_name || "") + " " + (previewUser.last_name || "")}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-white p-4 rounded-lg border border-gray-200">
                        <p className="text-xs text-gray-500 mb-2">Status</p>
                        {getStatusBadge(previewUser.role)}
                      </div>
                      <div className="bg-white p-4 rounded-lg border border-gray-200">
                        <p className="text-xs text-gray-500 mb-2">Verification</p>
                        {getVerificationBadge(previewUser.face_verified)}
                      </div>
                    </div>
                    <div className="bg-white p-4 rounded-lg border border-gray-200">
                      <p className="text-xs text-gray-500 mb-1">Date Joined</p>
                      <p className="text-sm text-gray-900 flex items-center gap-2">
                        <CalendarIcon className="w-4 h-4 text-gray-400" />
                        {formatDate(previewUser.created_at)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
              <Button variant="outline" onClick={() => setPreviewUser(null)} className="border-gray-300 hover:bg-white">
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
