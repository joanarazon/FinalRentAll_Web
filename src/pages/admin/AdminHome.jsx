// src/pages/AdminHome.jsx
import React from "react";
import { useUser } from "../../hooks/useUser";
import AdminLayout from "../../components/AdminLayout";

export default function AdminHome() {
    const user = useUser();

    return (
        <>
            <AdminLayout>
                <p>{user?.first_name} Dashboard</p>
            </AdminLayout>
        </>
    );
}
