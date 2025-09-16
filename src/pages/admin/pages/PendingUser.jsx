// src/pages/AdminHome.jsx
import React from "react";
import { useUser } from "../../../hooks/useUser";
import AdminLayout from "../../../components/AdminLayout";

export default function PendingUser() {
    const user = useUser();

    return (
        <AdminLayout className="bg-[#FFFBF2] min-h-screen">
            <h1 className="text-2xl font-bold">
                Welcome, {user?.first_name || "Admin"}
            </h1>
            <p className="mt-2 text-gray-600">
                This is where you can manage pending users, items, and view renting history.
            </p>
        </AdminLayout>
    );
}
