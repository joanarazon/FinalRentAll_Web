"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import AdminLayout from "../../../components/AdminLayout"
import { Button } from "@/components/ui/button"
import { supabase } from "../../../../supabaseClient"
import { Loader2, Search, ImageIcon, CalendarIcon } from "lucide-react"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import { useToastApi } from "@/components/ui/toast"

export default function PendingItems() {
  const toast = useToastApi()
  const [items, setItems] = useState([]) // raw items pending approval
  const [loading, setLoading] = useState(false)
  const [actionId, setActionId] = useState(null)
  const [filterName, setFilterName] = useState("")
  const [filterId, setFilterId] = useState("")
  const [filterDate, setFilterDate] = useState(null) // JS Date object
  const [previewItem, setPreviewItem] = useState(null)

  // Assuming a new column item_status (pending/approved/rejected). If not yet added, this will fallback.
  const inFlightRef = useRef(false)

  const fetchPending = useCallback(async () => {
    if (inFlightRef.current) return // prevent overlapping calls
    inFlightRef.current = true
    const MIN = 800
    const start = performance.now()
    try {
      setLoading(true)
      let query = supabase
        .from("items")
        .select(
          "item_id,user_id,category_id,title,description,price_per_day,deposit_fee,location,created_at,main_image_url,item_status,quantity",
        )
        .order("created_at", { ascending: false })

      // Filter server-side by status if column exists
      query = query.eq("item_status", "pending")
      let { data, error } = await query

      // Fallback: if column missing, treat all as pending (client filter later)
      if (error && (error.code === "42703" || /item_status/i.test(error.message))) {
        console.warn("item_status column missing. Showing all items as pending candidate.")
        const fb = await supabase
          .from("items")
          .select(
            "item_id,user_id,category_id,title,description,price_per_day,deposit_fee,location,created_at,main_image_url,quantity",
          )
          .order("created_at", { ascending: false })
        data = fb.data
        error = fb.error
      }
      if (error) throw error
      setItems(data || [])
    } catch (e) {
      toast.error("Failed to load pending items: " + e.message)
    } finally {
      const elapsed = performance.now() - start
      const rem = MIN - elapsed
      if (rem > 0) await new Promise((r) => setTimeout(r, rem))
      setLoading(false)
      inFlightRef.current = false
    }
  }, []) // toast removed to keep stable; using direct call inside catch

  useEffect(() => {
    fetchPending()
  }, [fetchPending])

  const filtered = useMemo(() => {
    return items.filter((it) => {
      const nameMatch = !filterName || it.title.toLowerCase().includes(filterName.toLowerCase())
      const idMatch = !filterId || it.item_id.toLowerCase().includes(filterId.toLowerCase())
      let dateMatch = true
      if (filterDate) {
        try {
          const created = new Date(it.created_at)
          dateMatch = created.toDateString() === filterDate.toDateString()
        } catch {
          dateMatch = false
        }
      }
      return nameMatch && idMatch && dateMatch
    })
  }, [items, filterName, filterId, filterDate])

  const approve = async (id) => {
    setActionId(id)
    try {
      // Only approve if current status is pending (or legacy null)
      const { error } = await supabase
        .from("items")
        .update({ item_status: "approved" })
        .eq("item_id", id)
        .or("item_status.eq.pending,item_status.is.null")
      if (error) throw error
      await supabase.from("activity_log").insert([
        {
          action_type: "item_approve",
          description: `Approved item ${id}`,
          target_table: "items",
          target_id: id,
        },
      ])
      toast.success("Item approved")
      fetchPending()
    } catch (e) {
      toast.error("Approve failed: " + e.message)
    } finally {
      setActionId(null)
    }
  }

  const reject = async (id) => {
    setActionId(id)
    try {
      // Only reject if current status is pending (or legacy null)
      const { error } = await supabase
        .from("items")
        .update({ item_status: "rejected" })
        .eq("item_id", id)
        .or("item_status.eq.pending,item_status.is.null")
      if (error) throw error
      await supabase.from("activity_log").insert([
        {
          action_type: "item_reject",
          description: `Rejected item ${id}`,
          target_table: "items",
          target_id: id,
        },
      ])
      toast.success("Item rejected")
      fetchPending()
    } catch (e) {
      toast.error("Reject failed: " + e.message)
    } finally {
      setActionId(null)
    }
  }

  const openPreview = (it) => setPreviewItem(it)

  return (
    <AdminLayout className="bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen">
      <div className="max-w-[1600px] mx-auto p-6 lg:p-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-1.5 h-8 bg-[#FFAB00] rounded-full" />
            <h1 className="text-4xl font-bold text-gray-900">Pending Items</h1>
          </div>
          <p className="text-gray-600 text-lg ml-6">Review and approve items submitted by users</p>
        </div>

        {/* Enhanced Filter Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center gap-2 mb-5">
            <Search className="w-5 h-5 text-[#FFAB00]" />
            <h2 className="text-lg font-semibold text-gray-900">Filter Items</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Item Name Filter */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Item Name</label>
              <div className="relative group">
                <Search className="w-4 h-4 text-gray-400 group-focus-within:text-[#FFAB00] absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors" />
                <input
                  placeholder="Search by name..."
                  className="border border-gray-300 py-3 pl-10 pr-4 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-[#FFAB00] focus:border-transparent transition-all bg-gray-50 focus:bg-white"
                  value={filterName}
                  onChange={(e) => setFilterName(e.target.value)}
                />
              </div>
            </div>

            {/* Item ID Filter */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Item ID</label>
              <input
                placeholder="Enter item ID..."
                className="border border-gray-300 py-3 px-4 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-[#FFAB00] focus:border-transparent transition-all bg-gray-50 focus:bg-white font-mono text-sm"
                value={filterId}
                onChange={(e) => setFilterId(e.target.value)}
              />
            </div>

            {/* Date Filter */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Request Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal border-gray-300 py-3 px-4 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-[#FFAB00] focus:border-transparent transition-all bg-gray-50 hover:border-gray-400"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4 text-gray-500" />
                    <span className={filterDate ? "text-gray-900" : "text-gray-500"}>
                      {filterDate
                        ? filterDate.toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })
                        : "Select date..."}
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
                        className="text-[#FFAB00] hover:text-[#FF9900] hover:bg-orange-50"
                      >
                        Clear Date
                      </Button>
                    </div>
                  )}
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Active Filters Summary */}
          {(filterName || filterId || filterDate) && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm text-gray-600">Active filters:</span>
                {filterName && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#FFAB00]/10 text-[#FFAB00] rounded-full text-sm font-medium">
                    Name: {filterName}
                    <button onClick={() => setFilterName("")} className="hover:bg-[#FFAB00]/20 rounded-full p-0.5">
                      ✕
                    </button>
                  </span>
                )}
                {filterId && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#FFAB00]/10 text-[#FFAB00] rounded-full text-sm font-medium font-mono">
                    ID: {filterId}
                    <button onClick={() => setFilterId("")} className="hover:bg-[#FFAB00]/20 rounded-full p-0.5">
                      ✕
                    </button>
                  </span>
                )}
                {filterDate && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#FFAB00]/10 text-[#FFAB00] rounded-full text-sm font-medium">
                    Date: {filterDate.toLocaleDateString()}
                    <button onClick={() => setFilterDate(null)} className="hover:bg-[#FFAB00]/20 rounded-full p-0.5">
                      ✕
                    </button>
                  </span>
                )}
                <button
                  onClick={() => {
                    setFilterName("")
                    setFilterId("")
                    setFilterDate(null)
                  }}
                  className="text-sm text-gray-500 hover:text-gray-700 underline ml-2"
                >
                  Clear all
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-[#FFAB00] rounded-full animate-pulse" />
              <p className="text-sm font-medium text-gray-700">
                {loading
                  ? "Loading pending items..."
                  : `${filtered.length} pending item${filtered.length !== 1 ? "s" : ""}`}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchPending}
              disabled={loading}
              className="border-gray-300 hover:border-[#FFAB00] hover:text-[#FFAB00] transition-colors bg-transparent"
            >
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Refresh
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="p-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    <input type="checkbox" disabled className="rounded" />
                  </th>
                  <th className="p-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Item ID</th>
                  <th className="p-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Request Date</th>
                  <th className="p-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Item Name</th>
                  <th className="p-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Quantity</th>
                  <th className="p-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Photo</th>
                  <th className="p-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Description</th>
                  <th className="p-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-sm text-gray-500">
                      <div className="flex items-center justify-center gap-3">
                        <Loader2 className="h-5 w-5 animate-spin text-[#FFAB00]" />
                        <span>Fetching pending items...</span>
                      </div>
                    </td>
                  </tr>
                )}
                {!loading && filtered.length === 0 && (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-sm text-gray-500">
                      <div className="flex flex-col items-center gap-2">
                        <Search className="w-8 h-8 text-gray-300" />
                        <p className="font-medium">No pending items found</p>
                        <p className="text-xs">Try adjusting your filters</p>
                      </div>
                    </td>
                  </tr>
                )}
                {!loading &&
                  filtered.map((it) => {
                    return (
                      <tr key={it.item_id} className="border-b hover:bg-orange-50/30 transition-colors">
                        <td className="p-4">
                          <input type="checkbox" disabled className="rounded" />
                        </td>
                        <td className="p-4 text-[#FFAB00] font-semibold font-mono text-xs break-all min-w-[140px]">
                          {it.item_id}
                        </td>
                        <td className="p-4 text-sm text-gray-700">
                          {new Date(it.created_at).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </td>
                        <td className="p-4 text-sm font-medium text-gray-900">{it.title}</td>
                        <td className="p-4 text-sm text-gray-700">
                          <span className="inline-flex items-center px-2.5 py-1 bg-gray-100 rounded-full text-xs font-medium">
                            {Number(it.quantity) || 1}
                          </span>
                        </td>
                        <td className="p-4">
                          {it.main_image_url ? (
                            <button
                              onClick={() => openPreview(it)}
                              className="text-[#FFAB00] hover:text-[#FF9900] underline text-sm font-medium cursor-pointer transition-colors"
                            >
                              View Photo
                            </button>
                          ) : (
                            <span className="text-gray-400 text-sm flex items-center gap-1.5">
                              <ImageIcon className="w-4 h-4" />
                              No photo
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-gray-600 text-sm max-w-[250px] truncate" title={it.description || ""}>
                          {it.description || "—"}
                        </td>
                        <td className="p-4">
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              className="bg-green-600 text-white hover:bg-green-700 cursor-pointer shadow-sm"
                              disabled={actionId === it.item_id}
                              onClick={() => approve(it.item_id)}
                            >
                              {actionId === it.item_id ? <Loader2 className="w-4 h-4 animate-spin" /> : "Approve"}
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              className="cursor-pointer shadow-sm"
                              disabled={actionId === it.item_id}
                              onClick={() => reject(it.item_id)}
                            >
                              {actionId === it.item_id ? <Loader2 className="w-4 h-4 animate-spin" /> : "Reject"}
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

      {/* Enhanced Preview Modal */}
      {previewItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setPreviewItem(null)} />
          <div className="relative z-10 w-full max-w-2xl max-h-[90vh] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Item Preview</h2>
                <p className="text-sm text-gray-600 mt-0.5">{previewItem.title}</p>
              </div>
              <button
                onClick={() => setPreviewItem(null)}
                className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-gray-100 rounded-lg"
                aria-label="Close"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 space-y-6 overflow-y-auto">
              {previewItem.main_image_url ? (
                <div className="relative rounded-xl overflow-hidden border border-gray-200 bg-gray-50">
                  <img
                    src={previewItem.main_image_url || "/placeholder.svg"}
                    alt={previewItem.title}
                    className="w-full h-auto"
                  />
                </div>
              ) : (
                <div className="flex items-center justify-center h-64 bg-gray-100 rounded-xl border-2 border-dashed border-gray-300">
                  <div className="text-center">
                    <ImageIcon className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">No image uploaded</p>
                  </div>
                </div>
              )}
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-2">Description</p>
                <p className="text-sm text-gray-600 leading-relaxed bg-gray-50 p-4 rounded-lg">
                  {previewItem.description || "No description provided"}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <p className="text-xs font-semibold text-green-700 mb-1">Price per day</p>
                  <p className="text-lg font-bold text-green-900">
                    ₱{Number(previewItem.price_per_day || 0).toFixed(2)}
                  </p>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <p className="text-xs font-semibold text-blue-700 mb-1">Deposit fee</p>
                  <p className="text-lg font-bold text-blue-900">₱{Number(previewItem.deposit_fee || 0).toFixed(2)}</p>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                  <p className="text-xs font-semibold text-purple-700 mb-1">Quantity</p>
                  <p className="text-lg font-bold text-purple-900">{Number(previewItem.quantity) || 1}</p>
                </div>
                {previewItem.location && (
                  <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                    <p className="text-xs font-semibold text-orange-700 mb-1">Location</p>
                    <p className="text-sm font-medium text-orange-900">{previewItem.location}</p>
                  </div>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
              <Button variant="outline" onClick={() => setPreviewItem(null)} className="border-gray-300 hover:bg-white">
                Close Preview
              </Button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
