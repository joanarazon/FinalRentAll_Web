// src/components/AdminSidebarMenu.jsx
import React from "react";
import { Button } from "@/components/ui/button";
import { Users, PackageSearch, History, ShieldAlert } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard } from "lucide-react";

export default function AdminSidebarMenu() {
    const location = useLocation();

    const items = [
        { to: "/adminhome", label: "Admin Dashboard", icon: LayoutDashboard },
        { to: "/pending-users", label: "Pending Users", icon: Users },
        { to: "/pending-items", label: "Pending Items", icon: PackageSearch },
        // Pending Bookings hidden: handled by lessors in their own view
        {
            to: "/renting-history",
            label: "View Renting History",
            icon: History,
        },
        { to: "/reported-users", label: "Reported Users", icon: ShieldAlert },
        { to: "/reported-items", label: "Reported Items", icon: ShieldAlert },
    ];

    const linkClass = (to) =>
        `justify-start w-full ${
            location.pathname === to ? "bg-gray-200 font-bold" : ""
        }`;

    return (
        <>
            <p className="text-2xl font-bold mb-3">RentAll</p>
            {items.map(({ to, label, icon: Icon }) => (
                <Button
                    asChild
                    key={to}
                    variant="ghost"
                    className={linkClass(to)}
                >
                    <Link to={to} className="flex items-center gap-2">
                        <Icon className="w-4 h-4" />
                        {label}
                    </Link>
                </Button>
            ))}
        </>
    );
}
