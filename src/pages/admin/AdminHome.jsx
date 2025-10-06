"use client"
import { useUser } from "../../hooks/useUser"
import AdminLayout from "../../components/AdminLayout"
import { Users, Package, TrendingUp, ArrowRight, Clock, AlertTriangle, Sparkles } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { supabase } from "../../../supabaseClient"
import { useNavigate } from "react-router-dom"

export default function AdminHome() {
  const user = useUser()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [counts, setCounts] = useState({
    pendingUsers: 0,
    pendingItems: 0,
    rentingHistory: 0,
    totalUsers: 0,
    activeRentals: 0,
    itemsListed: 0,
    reportedUsers: 0,
    reportedItems: 0,
  })

  const [deltas, setDeltas] = useState({
    usersChange: null,
    activeRentalsChange: null,
    itemsListedChange: null,
  })

  useEffect(() => {
    let cancelled = false
    const fetchAll = async () => {
      setLoading(true)
      try {
        const now = new Date()
        const start = new Date(now)
        start.setDate(start.getDate() - 7)
        const prevStart = new Date(start)
        prevStart.setDate(prevStart.getDate() - 7)

        const parallel = await Promise.allSettled([
          supabase.from("users").select("id", { count: "exact", head: true }).eq("role", "unverified"),
          supabase.from("items").select("item_id", { count: "exact", head: true }).eq("item_status", "pending"),
          supabase.from("rental_transactions").select("rental_id", { count: "exact", head: true }),
          supabase.from("users").select("id", { count: "exact", head: true }),
          supabase
            .from("rental_transactions")
            .select("rental_id", { count: "exact", head: true })
            .eq("status", "ongoing"),
          supabase.from("items").select("item_id", { count: "exact", head: true }).eq("item_status", "approved"),
          supabase.from("users").select("id", { count: "exact", head: true }).gte("created_at", start.toISOString()),
          supabase
            .from("users")
            .select("id", { count: "exact", head: true })
            .gte("created_at", prevStart.toISOString())
            .lt("created_at", start.toISOString()),
          supabase
            .from("rental_transactions")
            .select("rental_id", { count: "exact", head: true })
            .eq("status", "ongoing")
            .gte("created_at", start.toISOString()),
          supabase
            .from("rental_transactions")
            .select("rental_id", { count: "exact", head: true })
            .eq("status", "ongoing")
            .gte("created_at", prevStart.toISOString())
            .lt("created_at", start.toISOString()),
          supabase
            .from("items")
            .select("item_id", { count: "exact", head: true })
            .eq("item_status", "approved")
            .gte("created_at", start.toISOString()),
          supabase
            .from("items")
            .select("item_id", { count: "exact", head: true })
            .eq("item_status", "approved")
            .gte("created_at", prevStart.toISOString())
            .lt("created_at", start.toISOString()),
          supabase
            .from("user_complaints")
            .select("complaint_id", { count: "exact", head: true })
            .eq("status", "pending"),
          supabase
            .from("complaints")
            .select("complaint_id", { count: "exact", head: true })
            .eq("status", "pending")
            .not("target_item_id", "is", null),
        ])

        const safeCount = (r, fallback = 0) =>
          r.status === "fulfilled" && typeof r.value?.count === "number" ? r.value.count : fallback

        const pendingUsers = safeCount(parallel[0])
        const pendingItems = safeCount(parallel[1], 0)
        const rentingHistory = safeCount(parallel[2])
        const totalUsers = safeCount(parallel[3])
        const activeRentals = safeCount(parallel[4])
        const itemsListed = safeCount(parallel[5], 0)

        const usersCurr = safeCount(parallel[6])
        const usersPrev = safeCount(parallel[7])
        const rentalsCurr = safeCount(parallel[8])
        const rentalsPrev = safeCount(parallel[9])
        const itemsCurr = safeCount(parallel[10])
        const itemsPrev = safeCount(parallel[11])
        const reportedUsers = safeCount(parallel[12], 0)
        const reportedItems = safeCount(parallel[13], 0)

        const pct = (curr, prev) => {
          if (!Number.isFinite(curr) || !Number.isFinite(prev)) return null
          if (prev === 0) return curr > 0 ? 100 : 0
          return Math.round(((curr - prev) / prev) * 100)
        }

        const usersChangePct = pct(usersCurr, usersPrev)
        const rentalsChangePct = pct(rentalsCurr, rentalsPrev)
        const itemsChangePct = pct(itemsCurr, itemsPrev)

        if (!cancelled) {
          setCounts({
            pendingUsers,
            pendingItems,
            rentingHistory,
            totalUsers,
            activeRentals,
            itemsListed,
            reportedUsers,
            reportedItems,
          })
          setDeltas({
            usersChange: usersChangePct,
            activeRentalsChange: rentalsChangePct,
            itemsListedChange: itemsChangePct,
          })
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchAll()
    return () => {
      cancelled = true
    }
  }, [])

  const dashboardCards = useMemo(
    () => [
      {
        title: "Pending Users",
        description: "Review and approve new user registrations",
        count: String(counts.pendingUsers ?? "—"),
        icon: Users,
        gradient: "from-blue-500 to-indigo-600",
        bgOverlay: "bg-blue-500/10",
        textColor: "text-white",
        countColor: "text-white",
        iconBg: "bg-white/20 backdrop-blur-sm",
        iconColor: "text-white",
        link: "/admin/pending-users",
        sub: "pending",
        accentColor: "bg-blue-400",
      },
      {
        title: "Pending Items",
        description: "Approve new items for rental listing",
        count: String(counts.pendingItems ?? "—"),
        icon: Package,
        gradient: "from-amber-500 to-orange-500",
        bgOverlay: "bg-[#FFAB00]/10",
        textColor: "text-white",
        countColor: "text-white",
        iconBg: "bg-white/20 backdrop-blur-sm",
        iconColor: "text-white",
        link: "/admin/pending-items",
        sub: "pending",
        accentColor: "bg-[#FFAB00]",
      },
      {
        title: "Renting History",
        description: "View complete rental transaction history",
        count: String(counts.rentingHistory ?? "—"),
        icon: TrendingUp,
        gradient: "from-emerald-500 to-teal-600",
        bgOverlay: "bg-emerald-500/10",
        textColor: "text-white",
        countColor: "text-white",
        iconBg: "bg-white/20 backdrop-blur-sm",
        iconColor: "text-white",
        link: "/admin/renting-history",
        sub: "total",
        accentColor: "bg-emerald-400",
      },
      {
        title: "Reported Users",
        description: "Review and resolve user complaint reports",
        count: String(counts.reportedUsers ?? "—"),
        icon: AlertTriangle,
        gradient: "from-rose-500 to-pink-600",
        bgOverlay: "bg-rose-500/10",
        textColor: "text-white",
        countColor: "text-white",
        iconBg: "bg-white/20 backdrop-blur-sm",
        iconColor: "text-white",
        link: "/admin/reported-users",
        sub: "pending",
        accentColor: "bg-rose-400",
      },
      {
        title: "Reported Items",
        description: "Review and resolve item complaint reports",
        count: String(counts.reportedItems ?? "—"),
        icon: AlertTriangle,
        gradient: "from-orange-500 to-red-600",
        bgOverlay: "bg-orange-500/10",
        textColor: "text-white",
        countColor: "text-white",
        iconBg: "bg-white/20 backdrop-blur-sm",
        iconColor: "text-white",
        link: "/admin/reported-items",
        sub: "pending",
        accentColor: "bg-orange-400",
      },
    ],
    [counts],
  )

  const recentStats = useMemo(
    () => [
      {
        label: "Total Users",
        value: new Intl.NumberFormat().format(counts.totalUsers || 0),
        change: deltas.usersChange == null ? "—" : `${deltas.usersChange >= 0 ? "+" : ""}${deltas.usersChange}%`,
        icon: Users,
        positive: (deltas.usersChange ?? 0) >= 0,
        gradient: "from-violet-500 to-purple-600",
        accentColor: "bg-violet-100",
        iconColor: "text-violet-600",
      },
      {
        label: "Ongoing Rentals",
        value: new Intl.NumberFormat().format(counts.activeRentals || 0),
        change:
          deltas.activeRentalsChange == null
            ? "—"
            : `${deltas.activeRentalsChange >= 0 ? "+" : ""}${deltas.activeRentalsChange}%`,
        icon: Clock,
        positive: (deltas.activeRentalsChange ?? 0) >= 0,
        gradient: "from-cyan-500 to-blue-600",
        accentColor: "bg-cyan-100",
        iconColor: "text-cyan-600",
      },
      {
        label: "Items Listed",
        value: new Intl.NumberFormat().format(counts.itemsListed || 0),
        change:
          deltas.itemsListedChange == null
            ? "—"
            : `${deltas.itemsListedChange >= 0 ? "+" : ""}${deltas.itemsListedChange}%`,
        icon: Package,
        positive: (deltas.itemsListedChange ?? 0) >= 0,
        gradient: "from-amber-500 to-[#FFAB00]",
        accentColor: "bg-amber-100",
        iconColor: "text-[#FFAB00]",
      },
    ],
    [counts, deltas],
  )

  return (
    <AdminLayout className="bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200 min-h-screen">
      <div className="max-w-7xl mx-auto p-6 lg:p-8">
        <div className="mb-12 relative">
          <div className="absolute -top-4 -left-4 w-24 h-24 bg-gradient-to-br from-[#FFAB00]/20 to-purple-500/20 rounded-full blur-3xl" />
          <div className="relative">
            <div className="flex items-center gap-3 mb-3">
              <h1 className="text-5xl font-bold bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 bg-clip-text text-transparent tracking-tight">
                Welcome back, {user?.first_name || "Admin"}
              </h1>
              <Sparkles className="w-8 h-8 text-[#FFAB00] animate-pulse" />
            </div>
            <p className="text-lg text-slate-600 leading-relaxed font-medium">
              Here's what's happening with RentAll today
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {recentStats.map((stat, index) => {
            const IconComponent = stat.icon
            return (
              <div
                key={index}
                className="group relative bg-white rounded-3xl shadow-lg hover:shadow-2xl transition-all duration-500 overflow-hidden border border-slate-200/50"
              >
                <div
                  className={`absolute inset-0 bg-gradient-to-br ${stat.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-500`}
                />
                <div
                  className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${stat.gradient} opacity-10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700`}
                />
                <div className="relative p-7">
                  <div className="flex items-start justify-between mb-6">
                    <div
                      className={`p-4 ${stat.accentColor} rounded-2xl group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-md`}
                    >
                      <IconComponent className={`w-7 h-7 ${stat.iconColor}`} />
                    </div>
                    <div className="text-right">
                      <span
                        className={`inline-flex items-center text-sm font-bold px-4 py-2 rounded-full shadow-sm ${
                          stat.positive
                            ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white"
                            : "bg-gradient-to-r from-rose-500 to-red-500 text-white"
                        }`}
                      >
                        {stat.change}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-slate-600 mb-3 font-semibold uppercase tracking-wide">{stat.label}</p>
                  <p className={`text-4xl font-bold bg-gradient-to-r ${stat.gradient} bg-clip-text text-transparent`}>
                    {stat.value}
                  </p>
                  <div
                    className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${stat.gradient} transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500`}
                  />
                </div>
              </div>
            )
          })}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {dashboardCards.map((card, index) => {
            const IconComponent = card.icon
            return (
              <div
                key={index}
                className="group relative rounded-3xl overflow-hidden cursor-pointer transform hover:scale-[1.03] transition-all duration-500 shadow-xl hover:shadow-2xl"
                onClick={() => navigate(card.link)}
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${card.gradient}`} />
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjA1IiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-30" />
                <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -mr-20 -mt-20 group-hover:scale-150 transition-transform duration-700" />
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/10 rounded-full -ml-16 -mb-16 group-hover:scale-150 transition-transform duration-700" />
                <div className="relative p-8">
                  <div className="flex items-start justify-between mb-8">
                    <div
                      className={`${card.iconBg} p-5 rounded-2xl group-hover:scale-110 group-hover:rotate-6 transition-all duration-300 shadow-lg`}
                    >
                      <IconComponent className={`w-8 h-8 ${card.iconColor} drop-shadow-sm`} />
                    </div>
                    <div className="text-right">
                      <p className={`text-5xl font-black ${card.countColor} leading-none mb-2 drop-shadow-md`}>
                        {card.count}
                      </p>
                      <p className="text-sm font-bold text-white/80 uppercase tracking-wider">{card.sub}</p>
                    </div>
                  </div>
                  <h3 className={`${card.textColor} font-bold text-2xl mb-3 leading-tight drop-shadow-sm`}>
                    {card.title}
                  </h3>
                  <p className="text-white/90 text-sm leading-relaxed mb-8 font-medium">{card.description}</p>
                  <div className="flex items-center justify-between pt-6 border-t border-white/20">
                    <span className="text-white text-sm font-bold uppercase tracking-wide">View Details</span>
                    <div className="flex items-center justify-center w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full group-hover:bg-white/30 transition-all duration-300">
                      <ArrowRight className="w-5 h-5 text-white group-hover:translate-x-1 transition-transform duration-300" />
                    </div>
                  </div>
                </div>
                <div
                  className={`absolute bottom-0 left-0 right-0 h-2 ${card.accentColor} transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500`}
                />
              </div>
            )
          })}
        </div>
      </div>
    </AdminLayout>
  )
}
