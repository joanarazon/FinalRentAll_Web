"use client"

import { useEffect, useMemo, useState } from "react"
import { useUser } from "../../../hooks/useUser"
import AdminLayout from "../../../components/AdminLayout"
import { supabase } from "../../../../supabaseClient"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import { Search, Filter, CalendarIcon, Package, RefreshCw, X } from "lucide-react"

function ViewRentingHistory() {
  const user = useUser()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [categories, setCategories] = useState([])

  // Filters
  const [itemName, setItemName] = useState("")
  const [status, setStatus] = useState("")
  const [categoryId, setCategoryId] = useState("")
  const [dateRange, setDateRange] = useState({ from: null, to: null })

  const [selectedImage, setSelectedImage] = useState(null)
  const [isImageModalOpen, setIsImageModalOpen] = useState(false)

  // Fetch categories for dropdown
  useEffect(() => {
    ;(async () => {
      try {
        const { data, error } = await supabase.from("categories").select("category_id,name").order("name")
        if (error) throw error
        setCategories(data || [])
      } catch {
        setCategories([])
      }
    })()
  }, [])

  const fetchHistory = async () => {
    setLoading(true)
    try {
      // Base query with joins
      let query = supabase
        .from("rental_transactions")
        .select(
          `rental_id, start_date, end_date, status, total_cost, quantity, created_at,
           items:items ( item_id, title, category_id, main_image_url )`,
        )
        .order("created_at", { ascending: false })

      // Server-side filters
      if (status) query = query.eq("status", status)
      if (itemName) query = query.ilike("items.title", `%${itemName}%`)
      if (categoryId) query = query.eq("items.category_id", Number(categoryId))
      if (dateRange?.from) query = query.gte("start_date", dateRange.from.toISOString())
      if (dateRange?.to) query = query.lte("start_date", dateRange.to.toISOString())

      const { data, error } = await query
      if (error) throw error
      setRows(data || [])
    } catch (e) {
      console.error("Fetch renting history failed:", e.message || e)
      setRows([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchHistory()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemName, status, categoryId, dateRange?.from, dateRange?.to])

  const filtered = useMemo(() => rows, [rows])

  const statusBadge = (s) => {
    const st = String(s || "").toLowerCase()
    const map = {
      completed: "bg-gradient-to-r from-emerald-500 to-green-500 text-white shadow-lg shadow-emerald-500/30",
      pending: "bg-gradient-to-r from-yellow-400 to-amber-500 text-white shadow-lg shadow-yellow-500/30",
      ongoing: "bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg shadow-blue-500/30",
      cancelled: "bg-gradient-to-r from-red-500 to-rose-500 text-white shadow-lg shadow-red-500/30",
      rejected: "bg-gradient-to-r from-red-600 to-pink-600 text-white shadow-lg shadow-red-600/30",
      confirmed: "bg-gradient-to-r from-emerald-400 to-teal-500 text-white shadow-lg shadow-emerald-400/30",
      deposit_submitted: "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/30",
      on_the_way: "bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg shadow-indigo-500/30",
      awaiting_owner_confirmation:
        "bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg shadow-orange-500/30",
      expired: "bg-gradient-to-r from-gray-400 to-gray-500 text-white shadow-lg shadow-gray-400/30",
      disputed: "bg-gradient-to-r from-fuchsia-500 to-pink-500 text-white shadow-lg shadow-fuchsia-500/30",
    }
    return map[st] || "bg-gradient-to-r from-gray-400 to-gray-500 text-white shadow-lg shadow-gray-400/30"
  }

  return (
    <AdminLayout className="bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 min-h-screen">
      {/* Page Title */}
      <div className="mb-8">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#FFAB00] to-orange-500 flex items-center justify-center shadow-xl shadow-[#FFAB00]/30">
            <Package className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
              Renting History
            </h1>
            <p className="mt-1 text-gray-600 font-medium">Search and filter all rental transactions</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-xl mb-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-[#FFAB00]/10 to-transparent rounded-full blur-3xl"></div>

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FFAB00] to-orange-500 flex items-center justify-center shadow-lg shadow-[#FFAB00]/30">
              <Filter className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Advanced Filters</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* Item Name */}
            <div>
              <label className="text-sm font-semibold text-gray-700 mb-2 block">Item Name</label>
              <div className="relative group">
                <Search className="w-5 h-5 text-gray-400 group-focus-within:text-[#FFAB00] absolute left-3 top-1/2 -translate-y-1/2 transition-colors" />
                <input
                  placeholder="Search by title..."
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  className="border-2 border-gray-200 py-3 pl-11 pr-4 rounded-xl w-full focus:outline-none focus:ring-2 focus:ring-[#FFAB00]/50 focus:border-[#FFAB00] transition-all bg-gray-50 hover:bg-white"
                />
              </div>
            </div>

            {/* Category */}
            <div>
              <label className="text-sm font-semibold text-gray-700 mb-2 block">Category</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="border-2 border-gray-200 py-3 px-4 rounded-xl w-full focus:outline-none focus:ring-2 focus:ring-[#FFAB00]/50 focus:border-[#FFAB00] bg-gray-50 hover:bg-white transition-all"
              >
                <option value="">All Categories</option>
                {categories.map((c) => (
                  <option key={c.category_id} value={String(c.category_id)}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Status */}
            <div>
              <label className="text-sm font-semibold text-gray-700 mb-2 block">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="border-2 border-gray-200 py-3 px-4 rounded-xl w-full focus:outline-none focus:ring-2 focus:ring-[#FFAB00]/50 focus:border-[#FFAB00] bg-gray-50 hover:bg-white transition-all"
              >
                <option value="">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="deposit_submitted">Deposit submitted</option>
                <option value="on_the_way">On the way</option>
                <option value="ongoing">Ongoing</option>
                <option value="awaiting_owner_confirmation">Returned</option>
                <option value="completed">Completed</option>
                <option value="disputed">Disputed</option>
                <option value="cancelled">Cancelled</option>
                <option value="rejected">Rejected</option>
                <option value="expired">Expired</option>
              </select>
            </div>

            {/* Date Range */}
            <div>
              <label className="text-sm font-semibold text-gray-700 mb-2 block">Start Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <button className="w-full justify-start text-left font-normal border-2 border-gray-200 hover:border-[#FFAB00] transition-all bg-gray-50 hover:bg-white rounded-xl py-3 px-4 flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-[#FFAB00]/50">
                    <CalendarIcon className="w-5 h-5 text-gray-500" />
                    <span className={dateRange.from ? "text-gray-900 font-medium" : "text-gray-500"}>
                      {dateRange.from ? new Date(dateRange.from).toLocaleDateString() : "Select start..."}
                    </span>
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateRange.from}
                    onSelect={(d) => setDateRange((r) => ({ ...r, from: d }))}
                    disabled={(d) => d > new Date()}
                    captionLayout="dropdown"
                    fromYear={1900}
                    toYear={new Date().getFullYear()}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <div className="mt-3">
                <label className="text-sm font-semibold text-gray-700 mb-2 block">End Date</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <button className="w-full justify-start text-left font-normal border-2 border-gray-200 hover:border-[#FFAB00] transition-all bg-gray-50 hover:bg-white rounded-xl py-3 px-4 flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-[#FFAB00]/50">
                      <CalendarIcon className="w-5 h-5 text-gray-500" />
                      <span className={dateRange.to ? "text-gray-900 font-medium" : "text-gray-500"}>
                        {dateRange.to ? new Date(dateRange.to).toLocaleDateString() : "Select end..."}
                      </span>
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
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
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-5 bg-gradient-to-r from-gray-50 to-orange-50 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-gray-900">Transaction Records</h3>
            <p className="text-sm text-gray-600 mt-1">
              Showing <span className="font-semibold text-[#FFAB00]">{filtered.length}</span> result
              {filtered.length === 1 ? "" : "s"}
            </p>
          </div>
          <button
            className="text-sm font-semibold bg-gradient-to-r from-[#FFAB00] to-orange-500 text-white px-5 py-2.5 rounded-xl hover:shadow-lg hover:shadow-[#FFAB00]/30 transition-all flex items-center gap-2 disabled:opacity-50"
            onClick={fetchHistory}
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            {loading ? "Refreshing…" : "Refresh"}
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gradient-to-r from-gray-100 to-orange-50">
              <tr>
                <th className="p-4 text-sm font-bold text-gray-700 uppercase tracking-wider">Rental ID</th>
                <th className="p-4 text-sm font-bold text-gray-700 uppercase tracking-wider">Start Date</th>
                <th className="p-4 text-sm font-bold text-gray-700 uppercase tracking-wider">End Date</th>
                <th className="p-4 text-sm font-bold text-gray-700 uppercase tracking-wider">Item Name</th>
                <th className="p-4 text-sm font-bold text-gray-700 uppercase tracking-wider">Category</th>
                <th className="p-4 text-sm font-bold text-gray-700 uppercase tracking-wider">Status</th>
                <th className="p-4 text-sm font-bold text-gray-700 uppercase tracking-wider">Item Picture</th>
              </tr>
            </thead>
            <tbody className="text-gray-700">
              {filtered.map((r, idx) => (
                <tr
                  key={r.rental_id}
                  className={`border-b border-gray-100 hover:bg-gradient-to-r hover:from-orange-50 hover:to-amber-50 transition-all ${
                    idx % 2 === 0 ? "bg-white" : "bg-gray-50/50"
                  }`}
                >
                  <td className="p-4 font-mono text-sm font-semibold text-[#FFAB00]">#{r.rental_id}</td>
                  <td className="p-4 font-medium">{new Date(r.start_date).toLocaleDateString()}</td>
                  <td className="p-4 font-medium">{new Date(r.end_date).toLocaleDateString()}</td>
                  <td className="p-4 font-semibold text-gray-900">{r.items?.title || "—"}</td>
                  <td className="p-4">
                    <span className="px-3 py-1.5 bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 rounded-lg text-sm font-medium shadow-sm">
                      {(() => {
                        const c = categories.find((c) => String(c.category_id) === String(r.items?.category_id))
                        return c?.name || "—"
                      })()}
                    </span>
                  </td>
                  <td className="p-4">
                    <span
                      className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wide ${statusBadge(
                        r.status,
                      )}`}
                    >
                      {r.status}
                    </span>
                  </td>
                  <td className="p-4">
                    {r.items?.main_image_url ? (
                      <img
                        src={r.items.main_image_url || "/placeholder.svg"}
                        alt={r.items?.title || "Item image"}
                        className="w-20 h-20 object-cover rounded-xl border-2 border-gray-200 cursor-pointer hover:scale-105 hover:shadow-xl transition-all shadow-md"
                        onClick={() => {
                          setSelectedImage(r.items.main_image_url)
                          setIsImageModalOpen(true)
                        }}
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                        <Package className="w-8 h-8 text-gray-400" />
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan="7" className="p-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                        <Package className="w-8 h-8 text-gray-400" />
                      </div>
                      <p className="text-gray-500 font-medium">No results match your filters.</p>
                      <p className="text-sm text-gray-400">Try adjusting your search criteria</p>
                    </div>
                  </td>
                </tr>
              )}
              {loading && (
                <tr>
                  <td colSpan="7" className="p-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <RefreshCw className="w-8 h-8 text-[#FFAB00] animate-spin" />
                      <p className="text-gray-500 font-medium">Loading transactions...</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isImageModalOpen && selectedImage && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setIsImageModalOpen(false)}
        >
          <div className="relative max-w-5xl w-full">
            <img
              src={selectedImage || "/placeholder.svg"}
              alt="Full view"
              className="w-full h-auto max-h-[85vh] object-contain rounded-2xl shadow-2xl border-4 border-white"
              onClick={(e) => e.stopPropagation()}
            />
            <button
              className="absolute -top-4 -right-4 bg-white text-gray-800 w-12 h-12 rounded-full shadow-2xl hover:bg-gray-100 transition-all flex items-center justify-center group"
              onClick={() => setIsImageModalOpen(false)}
            >
              <X className="w-6 h-6 group-hover:rotate-90 transition-transform" />
            </button>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}

export default ViewRentingHistory
