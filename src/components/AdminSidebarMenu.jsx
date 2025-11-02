import { Button } from "@/components/ui/button";
import { Users, PackageSearch, History, ShieldAlert } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard } from "lucide-react";

export default function AdminSidebarMenu() {
    const location = useLocation();

    const mainItems = [
        { to: "/adminhome", label: "Admin Dashboard", icon: LayoutDashboard },
    ];

    const userManagementItems = [
        { to: "/pending-users", label: "Pending Users", icon: Users },
        { to: "/total-users", label: "Total Users", icon: Users },
    ];

    const itemManagementItems = [
        { to: "/pending-items", label: "Pending Items", icon: PackageSearch },
        { to: "/total-items", label: "Total Items", icon: PackageSearch },
        { to: "/rereview-requests", label: "Re-review Queue", icon: History },
    ];

    const historyItems = [
        {
            to: "/renting-history",
            label: "Transaction Tracking",
            icon: History,
        },
    ];

    const reportItems = [
        { to: "/reported-users", label: "Reported Users", icon: ShieldAlert },
        { to: "/reported-items", label: "Reported Items", icon: ShieldAlert },
    ];

    const linkClass = (to) =>
        `justify-start w-full transition-all duration-200 ${
            location.pathname === to
                ? "bg-[#FFAB00]/10 text-[#FFAB00] font-semibold border-l-4 border-[#FFAB00] hover:bg-[#FFAB00]/15"
                : "hover:bg-gray-100 hover:text-gray-900"
        }`;

    const renderSection = (items, title) => (
        <div className="space-y-1">
            {title && (
                <p className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    {title}
                </p>
            )}
            {items.map(({ to, label, icon: Icon }) => (
                <Button
                    asChild
                    key={to}
                    variant="ghost"
                    className={linkClass(to)}
                >
                    <Link to={to} className="flex items-center gap-3 px-3">
                        <Icon className="w-5 h-5 flex-shrink-0" />
                        <span className="text-sm">{label}</span>
                    </Link>
                </Button>
            ))}
        </div>
    );

    return (
        <div className="flex flex-col h-full">
            <div className="px-4 py-6 border-b border-gray-200">
                <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-lg overflow-hidden flex items-center justify-center bg-gray-100 border border-gray-200">
                        <img
                            src="/logo.png"
                            alt="RentAll Logo"
                            className="w-full h-full object-cover"
                        />
                    </div>
                    <div>
                        <p className="text-xl font-bold text-gray-900">
                            RentAll
                        </p>
                        <p className="text-xs text-gray-500">Admin Panel</p>
                    </div>
                </div>
            </div>

            <nav className="flex-1 px-3 py-4 space-y-6 overflow-y-auto">
                {renderSection(mainItems)}
                {renderSection(userManagementItems, "User Management")}
                {renderSection(itemManagementItems, "Item Management")}
                {renderSection(historyItems, "History")}
                {renderSection(reportItems, "Reports")}
            </nav>

            <div className="px-4 py-4 border-t border-gray-200">
                <p className="text-xs text-gray-500 text-center">
                    Admin v1.0.0
                </p>
            </div>
        </div>
    );
}
