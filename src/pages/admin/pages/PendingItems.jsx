import React from "react";
import AdminLayout from "../../../components/AdminLayout";
import { useUser } from "../../../hooks/useUser"; // ✅ import your hook

function PendingItems() {
    const user = useUser(); // ✅ get the user

    return (
        <AdminLayout className="bg-[#FFFBF2] min-h-screen">
            <h1 className="text-2xl font-bold">
                Welcome, {user?.first_name || "Admin"}
            </h1>
            <p className="mt-2 text-gray-600">Pending Items</p>
        </AdminLayout>
    );
}

export default PendingItems;