import React from "react";
import AdminLayout from "../../../components/AdminLayout";
import { useUser } from "../../../hooks/useUser";

function ViewRentingHistory() {
    const user = useUser();

    return (
        <AdminLayout className="bg-[#FFFBF2] min-h-screen">
            <h1 className="text-2xl font-bold">
                Welcome, {user?.first_name || "Admin"}
            </h1>
            <p className="mt-2 text-gray-600">Renting History</p>
        </AdminLayout>
    );
}

export default ViewRentingHistory;