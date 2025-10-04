"use client"
import { useUser } from "../../hooks/useUser"
import AdminLayout from "../../components/AdminLayout"
import { Users, Package, TrendingUp, ArrowRight, Clock } from "lucide-react"

export default function AdminHome() {
  const user = useUser()

  const dashboardCards = [
    {
      title: "Pending Users",
      description: "Review and approve new user registrations",
      count: "12",
      icon: Users,
      bgColor: "bg-blue-50",
      borderColor: "border-blue-100",
      textColor: "text-blue-900",
      countColor: "text-blue-600",
      iconBg: "bg-blue-100",
      iconColor: "text-blue-600",
      link: "/admin/pending-users",
    },
    {
      title: "Pending Items",
      description: "Approve new items for rental listing",
      count: "8",
      icon: Package,
      bgColor: "bg-amber-50",
      borderColor: "border-amber-100",
      textColor: "text-amber-900",
      countColor: "text-amber-600",
      iconBg: "bg-amber-100",
      iconColor: "text-amber-600",
      link: "/admin/pending-items",
    },
    {
      title: "Renting History",
      description: "View complete rental transaction history",
      count: "156",
      icon: TrendingUp,
      bgColor: "bg-emerald-50",
      borderColor: "border-emerald-100",
      textColor: "text-emerald-900",
      countColor: "text-emerald-600",
      iconBg: "bg-emerald-100",
      iconColor: "text-emerald-600",
      link: "/admin/renting-history",
    },
  ]

  const recentStats = [
    { label: "Total Users", value: "1,247", change: "+12%", icon: Users, positive: true },
    { label: "Active Rentals", value: "89", change: "+5%", icon: Clock, positive: true },
    { label: "Items Listed", value: "342", change: "+8%", icon: Package, positive: true },
  ]

  return (
    <AdminLayout className="bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-7xl mx-auto p-6 lg:p-8">
        <div className="mb-10">
          <h1 className="text-4xl font-bold text-slate-900 mb-3 tracking-tight">
            Welcome back, {user?.first_name || "Admin"}
          </h1>
          <p className="text-lg text-slate-600 leading-relaxed">Here's what's happening with RentAll today</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          {recentStats.map((stat, index) => {
            const IconComponent = stat.icon
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
                      stat.positive ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                    }`}
                  >
                    {stat.change}
                  </span>
                </div>
                <p className="text-sm text-slate-600 mb-2 font-medium">{stat.label}</p>
                <p className="text-3xl font-bold text-slate-900">{stat.value}</p>
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
                className={`${card.bgColor} ${card.borderColor} border-2 rounded-2xl p-7 hover:shadow-xl hover:scale-[1.02] transition-all duration-300 cursor-pointer group relative overflow-hidden`}
                onClick={() => {
                  console.log(`Navigate to ${card.link}`)
                }}
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-5 rounded-full -mr-16 -mt-16" />

                <div className="relative">
                  <div className="flex items-start justify-between mb-6">
                    <div
                      className={`${card.iconBg} p-4 rounded-xl group-hover:scale-110 transition-transform duration-300`}
                    >
                      <IconComponent className={`w-7 h-7 ${card.iconColor}`} />
                    </div>
                    <div className={`${card.countColor} text-right`}>
                      <p className="text-3xl font-bold leading-none mb-1">{card.count}</p>
                      <p className="text-sm font-medium opacity-75">pending</p>
                    </div>
                  </div>

                  <h3 className={`${card.textColor} font-bold text-xl mb-3 leading-tight`}>{card.title}</h3>

                  <p className="text-slate-700 text-sm leading-relaxed mb-6">{card.description}</p>

                  <div className="flex items-center gap-2 pt-4 border-t border-slate-200">
                    <span className={`${card.textColor} text-sm font-semibold group-hover:gap-3 transition-all`}>
                      View Details
                    </span>
                    <ArrowRight
                      className={`w-4 h-4 ${card.iconColor} group-hover:translate-x-1 transition-transform duration-300`}
                    />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </AdminLayout>
  )
}
