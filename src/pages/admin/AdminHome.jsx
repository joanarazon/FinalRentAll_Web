"use client";
import { useUser } from "../../hooks/useUser";
import AdminLayout from "../../components/AdminLayout";
import { Users, Package, TrendingUp, ArrowRight, Clock } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../supabaseClient";
import { useNavigate } from "react-router-dom";

export default function AdminHome() {
    const user = useUser();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [counts, setCounts] = useState({
        pendingUsers: 0,
        pendingItems: 0,
        rentingHistory: 0,
        totalUsers: 0,
        activeRentals: 0,
        itemsListed: 0,
    });

    const [deltas, setDeltas] = useState({
        usersChange: null,
        activeRentalsChange: null,
        itemsListedChange: null,
    });

    useEffect(() => {
        let cancelled = false;
        const fetchAll = async () => {
            setLoading(true);
            try {
                // Time ranges for trend deltas (last 7 days vs previous 7 days)
                const now = new Date();
                const start = new Date(now);
                start.setDate(start.getDate() - 7);
                const prevStart = new Date(start);
                prevStart.setDate(prevStart.getDate() - 7);

                // For dashboard, treat "Active" as strictly ongoing rentals

                const parallel = await Promise.allSettled([
                    // Pending users
                    supabase
                        .from("users")
                        .select("id", { count: "exact", head: true })
                        .eq("role", "unverified"),
                    // Pending items (if item_status exists)
                    supabase
                        .from("items")
                        .select("item_id", { count: "exact", head: true })
                        .eq("item_status", "pending"),
                    // Renting history total transactions
                    supabase
                        .from("rental_transactions")
                        .select("rental_id", { count: "exact", head: true }),
                    // Total users
                    supabase
                        .from("users")
                        .select("id", { count: "exact", head: true }),
                    // Ongoing rentals (strict status = 'ongoing')
                    supabase
                        .from("rental_transactions")
                        .select("rental_id", { count: "exact", head: true })
                        .eq("status", "ongoing"),
                    // Items listed (approved)
                    supabase
                        .from("items")
                        .select("item_id", { count: "exact", head: true })
                        .eq("item_status", "approved"),
                    // Trends: users
                    supabase
                        .from("users")
                        .select("id", { count: "exact", head: true })
                        .gte("created_at", start.toISOString()),
                    supabase
                        .from("users")
                        .select("id", { count: "exact", head: true })
                        .gte("created_at", prevStart.toISOString())
                        .lt("created_at", start.toISOString()),
                    // Trends: ongoing rentals started in window (approximation)
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
                    // Trends: items listed (approved created in window)
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
                ]);

                const safeCount = (r, fallback = 0) =>
                    r.status === "fulfilled" &&
                    typeof r.value?.count === "number"
                        ? r.value.count
                        : fallback;

                const pendingUsers = safeCount(parallel[0]);
                // Pending items: if query failed (e.g., missing column), fallback to 0
                const pendingItems = safeCount(parallel[1], 0);
                const rentingHistory = safeCount(parallel[2]);
                const totalUsers = safeCount(parallel[3]);
                const activeRentals = safeCount(parallel[4]);
                // Items listed approved; fallback to total items if failed
                const itemsListed = safeCount(parallel[5], 0);

                const usersCurr = safeCount(parallel[6]);
                const usersPrev = safeCount(parallel[7]);
                const rentalsCurr = safeCount(parallel[8]);
                const rentalsPrev = safeCount(parallel[9]);
                const itemsCurr = safeCount(parallel[10]);
                const itemsPrev = safeCount(parallel[11]);

                const pct = (curr, prev) => {
                    if (!Number.isFinite(curr) || !Number.isFinite(prev))
                        return null;
                    if (prev === 0) return curr > 0 ? 100 : 0;
                    return Math.round(((curr - prev) / prev) * 100);
                };

                const usersChangePct = pct(usersCurr, usersPrev);
                const rentalsChangePct = pct(rentalsCurr, rentalsPrev);
                const itemsChangePct = pct(itemsCurr, itemsPrev);

                if (!cancelled) {
                    setCounts({
                        pendingUsers,
                        pendingItems,
                        rentingHistory,
                        totalUsers,
                        activeRentals,
                        itemsListed,
                    });
                    setDeltas({
                        usersChange: usersChangePct,
                        activeRentalsChange: rentalsChangePct,
                        itemsListedChange: itemsChangePct,
                    });
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        fetchAll();
        return () => {
            cancelled = true;
        };
    }, []);

    const dashboardCards = useMemo(
        () => [
            {
                title: "Pending Users",
                description: "Review and approve new user registrations",
                count: String(counts.pendingUsers ?? "—"),
                icon: Users,
                bgColor: "bg-blue-50",
                borderColor: "border-blue-100",
                textColor: "text-blue-900",
                countColor: "text-blue-600",
                iconBg: "bg-blue-100",
                iconColor: "text-blue-600",
                link: "/admin/pending-users",
                sub: "pending",
            },
            {
                title: "Pending Items",
                description: "Approve new items for rental listing",
                count: String(counts.pendingItems ?? "—"),
                icon: Package,
                bgColor: "bg-amber-50",
                borderColor: "border-amber-100",
                textColor: "text-amber-900",
                countColor: "text-amber-600",
                iconBg: "bg-amber-100",
                iconColor: "text-amber-600",
                link: "/admin/pending-items",
                sub: "pending",
            },
            {
                title: "Renting History",
                description: "View complete rental transaction history",
                count: String(counts.rentingHistory ?? "—"),
                icon: TrendingUp,
                bgColor: "bg-emerald-50",
                borderColor: "border-emerald-100",
                textColor: "text-emerald-900",
                countColor: "text-emerald-600",
                iconBg: "bg-emerald-100",
                iconColor: "text-emerald-600",
                link: "/admin/renting-history",
                sub: "total",
            },
        ],
        [counts]
    );

    const recentStats = useMemo(
        () => [
            {
                label: "Total Users",
                value: new Intl.NumberFormat().format(counts.totalUsers || 0),
                change:
                    deltas.usersChange == null
                        ? "—"
                        : `${deltas.usersChange >= 0 ? "+" : ""}${
                              deltas.usersChange
                          }%`,
                icon: Users,
                positive: (deltas.usersChange ?? 0) >= 0,
            },
            {
                label: "Ongoing Rentals",
                value: new Intl.NumberFormat().format(
                    counts.activeRentals || 0
                ),
                change:
                    deltas.activeRentalsChange == null
                        ? "—"
                        : `${deltas.activeRentalsChange >= 0 ? "+" : ""}${
                              deltas.activeRentalsChange
                          }%`,
                icon: Clock,
                positive: (deltas.activeRentalsChange ?? 0) >= 0,
            },
            {
                label: "Items Listed",
                value: new Intl.NumberFormat().format(counts.itemsListed || 0),
                change:
                    deltas.itemsListedChange == null
                        ? "—"
                        : `${deltas.itemsListedChange >= 0 ? "+" : ""}${
                              deltas.itemsListedChange
                          }%`,
                icon: Package,
                positive: (deltas.itemsListedChange ?? 0) >= 0,
            },
        ],
        [counts, deltas]
    );

    return (
        <AdminLayout className="bg-gradient-to-br from-slate-50 to-slate-100">
            <div className="max-w-7xl mx-auto p-6 lg:p-8">
                <div className="mb-10">
                    <h1 className="text-4xl font-bold text-slate-900 mb-3 tracking-tight">
                        Welcome back, {user?.first_name || "Admin"}
                    </h1>
                    <p className="text-lg text-slate-600 leading-relaxed">
                        Here's what's happening with RentAll today
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                    {recentStats.map((stat, index) => {
                        const IconComponent = stat.icon;
                        return (
                            <div
                                key={index}
                                className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition-all duration-300"
                            >
                                <div className="flex items-start justify-between mb-4">
                                    <div className="p-3 bg-slate-100 rounded-xl">
                                        <IconComponent className="w-6 h-6 text-slate-700" />
                                    </div>
                                    <span
                                        className={`text-sm font-semibold px-3 py-1 rounded-full ${
                                            stat.positive
                                                ? "bg-emerald-100 text-emerald-700"
                                                : "bg-red-100 text-red-700"
                                        }`}
                                    >
                                        {stat.change}
                                    </span>
                                </div>
                                <p className="text-sm text-slate-600 mb-2 font-medium">
                                    {stat.label}
                                </p>
                                <p className="text-3xl font-bold text-slate-900">
                                    {stat.value}
                                </p>
                            </div>
                        );
                    })}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {dashboardCards.map((card, index) => {
                        const IconComponent = card.icon;
                        return (
                            <div
                                key={index}
                                className={`${card.bgColor} ${card.borderColor} border-2 rounded-2xl p-7 hover:shadow-xl hover:scale-[1.02] transition-all duration-300 cursor-pointer group relative overflow-hidden`}
                                onClick={() => navigate(card.link)}
                            >
                                <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-5 rounded-full -mr-16 -mt-16" />

                                <div className="relative">
                                    <div className="flex items-start justify-between mb-6">
                                        <div
                                            className={`${card.iconBg} p-4 rounded-xl group-hover:scale-110 transition-transform duration-300`}
                                        >
                                            <IconComponent
                                                className={`w-7 h-7 ${card.iconColor}`}
                                            />
                                        </div>
                                        <div
                                            className={`${card.countColor} text-right`}
                                        >
                                            <p className="text-3xl font-bold leading-none mb-1">
                                                {card.count}
                                            </p>
                                            <p className="text-sm font-medium opacity-75">
                                                {card.sub}
                                            </p>
                                        </div>
                                    </div>

                                    <h3
                                        className={`${card.textColor} font-bold text-xl mb-3 leading-tight`}
                                    >
                                        {card.title}
                                    </h3>

                                    <p className="text-slate-700 text-sm leading-relaxed mb-6">
                                        {card.description}
                                    </p>

                                    <div className="flex items-center gap-2 pt-4 border-t border-slate-200">
                                        <span
                                            className={`${card.textColor} text-sm font-semibold group-hover:gap-3 transition-all`}
                                        >
                                            View Details
                                        </span>
                                        <ArrowRight
                                            className={`w-4 h-4 ${card.iconColor} group-hover:translate-x-1 transition-transform duration-300`}
                                        />
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </AdminLayout>
    );
}
