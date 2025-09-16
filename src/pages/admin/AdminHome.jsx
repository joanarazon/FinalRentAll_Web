// src/pages/AdminHome.jsx
import React from "react";
import { useUser } from "../../hooks/useUser";
import AdminLayout from "../../components/AdminLayout";

export default function AdminHome() {
    const user = useUser();

    const dashboardCards = [
        {
            title: "Pending Users",
            description: "Review and approve new user registrations",
            count: "12", // You can replace with actual data
            icon: "👥",
            bgColor: "bg-blue-50",
            borderColor: "border-blue-200",
            textColor: "text-blue-800",
            countColor: "text-blue-600",
            link: "/admin/pending-users" // Add your actual route
        },
        {
            title: "Pending Items",
            description: "Approve new items for rental listing",
            count: "8", // You can replace with actual data
            icon: "📦",
            bgColor: "bg-orange-50",
            borderColor: "border-orange-200",
            textColor: "text-orange-800",
            countColor: "text-orange-600",
            link: "/admin/pending-items" // Add your actual route
        },
        {
            title: "Renting History",
            description: "View complete rental transaction history",
            count: "156", // You can replace with actual data
            icon: "📊",
            bgColor: "bg-green-50",
            borderColor: "border-green-200",
            textColor: "text-green-800",
            countColor: "text-green-600",
            link: "/admin/renting-history" // Add your actual route
        }
    ];

    const recentStats = [
        { label: "Total Users", value: "1,247", change: "+12%" },
        { label: "Active Rentals", value: "89", change: "+5%" },
        { label: "Items Listed", value: "342", change: "+8%" }
    ];

    return (
        <AdminLayout className="bg-[#FFFBF2] min-h-screen">
            <div className="p-6">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                        Welcome back, {user?.first_name || "Admin"}! 👋
                    </h1>
                    <p className="text-gray-600">
                        Here's what's happening with RentAll today
                    </p>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                    {recentStats.map((stat, index) => (
                        <div key={index} className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-sm text-gray-600 mb-1">{stat.label}</p>
                                    <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                                </div>
                                <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                                    {stat.change}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Main Dashboard Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                    {dashboardCards.map((card, index) => (
                        <div
                            key={index}
                            className={`${card.bgColor} ${card.borderColor} border rounded-xl p-6 hover:shadow-lg transition-all duration-200 cursor-pointer group`}
                            onClick={() => {
                                // You can add navigation logic here
                                console.log(`Navigate to ${card.link}`);
                            }}
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div className="text-4xl">{card.icon}</div>
                                <div className={`${card.countColor} text-right`}>
                                    <p className="text-2xl font-bold">{card.count}</p>
                                    <p className="text-sm opacity-75">pending</p>
                                </div>
                            </div>
                            <h3 className={`${card.textColor} font-semibold text-lg mb-2 group-hover:text-opacity-80`}>
                                {card.title}
                            </h3>
                            <p className="text-gray-600 text-sm leading-relaxed">
                                {card.description}
                            </p>
                            <div className="mt-4 pt-4 border-t border-gray-200 border-opacity-50">
                                <span className={`${card.textColor} text-sm font-medium group-hover:underline`}>
                                    View Details →
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </AdminLayout>
    );
}