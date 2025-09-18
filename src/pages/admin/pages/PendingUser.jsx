import React, { useEffect, useState, useMemo } from "react";
import AdminLayout from "../../../components/AdminLayout";
import { Button } from "@/components/ui/button";
import { supabase } from "../../../../supabaseClient";
import { Calendar } from "@/components/ui/calendar";
import {
    Popover,
    PopoverTrigger,
    PopoverContent,
} from "@/components/ui/popover";
import {
    Loader2,
    Calendar as CalendarIcon,
    Search,
    Check,
    X,
} from "lucide-react";
import { useToastApi } from "@/components/ui/toast";
// Removed sheet imports – using custom centered modal instead

export default function PendingUser() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Filters
    const [filterName, setFilterName] = useState("");
    const [filterId, setFilterId] = useState("");
    const [actionUserId, setActionUserId] = useState(null); // user currently being approved/rejected
    const [filterDate, setFilterDate] = useState(null); // JS Date
    const toast = useToastApi();
    const [previewUser, setPreviewUser] = useState(null); // user object for ID preview

    // Fetch pending users (role = 'unverified')
    const fetchUsers = async () => {
        const MIN_DURATION = 1000; // ms
        const start = performance.now();
        try {
            setLoading(true);
            setError(null);
            const { data, error: fetchErr } = await supabase
                .from("users")
                .select(
                    "id, first_name, last_name, created_at, id_image_url, face_image_url, face_verified, role"
                )
                .eq("role", "unverified")
                .order("created_at", { ascending: false });
            if (fetchErr) throw fetchErr;
            setUsers(data || []);
        } catch (e) {
            console.error("Fetch pending users error", e);
            setError(e.message);
            toast.error("Failed to load pending users: " + e.message);
        } finally {
            const elapsed = performance.now() - start;
            const remaining = MIN_DURATION - elapsed;
            if (remaining > 0) {
                await new Promise((res) => setTimeout(res, remaining));
            }
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const filtered = useMemo(() => {
        return users.filter((u) => {
            const fullName = `${u.first_name || ""} ${u.last_name || ""}`
                .trim()
                .toLowerCase();
            const idMatch = u.id.toLowerCase().includes(filterId.toLowerCase());
            const nameMatch = fullName.includes(filterName.toLowerCase());
            let dateMatch = true;
            if (filterDate) {
                const created = new Date(u.created_at);
                dateMatch =
                    created.toDateString() === filterDate.toDateString();
            }
            return idMatch && nameMatch && dateMatch;
        });
    }, [users, filterName, filterId, filterDate]);

    const handleApprove = async (userId) => {
        try {
            setActionUserId(userId);
            const { error: updErr } = await supabase
                .from("users")
                .update({
                    role: "user",
                    face_verified: true,
                    updated_at: new Date().toISOString(),
                })
                .eq("id", userId);
            if (updErr) throw updErr;
            await supabase.from("activity_log").insert([
                {
                    user_id: userId,
                    action_type: "user_approved",
                    description:
                        "Admin approved user and set face_verified TRUE",
                    target_table: "users",
                    target_id: userId,
                },
            ]);
            toast.success("User approved");
            setUsers((prev) => prev.filter((u) => u.id !== userId));
        } catch (e) {
            console.error("Approve error", e);
            toast.error("Approve failed: " + e.message);
        } finally {
            setActionUserId(null);
        }
    };

    const handleReject = async (userId) => {
        try {
            setActionUserId(userId);
            const { error: updErr } = await supabase
                .from("users")
                .update({
                    role: "rejected",
                    updated_at: new Date().toISOString(),
                })
                .eq("id", userId);
            if (updErr) throw updErr;
            await supabase.from("activity_log").insert([
                {
                    user_id: userId,
                    action_type: "user_rejected",
                    description: "Admin rejected user registration",
                    target_table: "users",
                    target_id: userId,
                },
            ]);
            toast.info("User rejected");
            setUsers((prev) => prev.filter((u) => u.id !== userId));
        } catch (e) {
            console.error("Reject error", e);
            toast.error("Reject failed: " + e.message);
        } finally {
            setActionUserId(null);
        }
    };

    const formatDate = (iso) => {
        try {
            return new Date(iso).toLocaleDateString();
        } catch {
            return "-";
        }
    };

    return (
        <AdminLayout className="bg-[#FFFBF2] min-h-screen">
            <div className="p-6">
                {/* Page Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                        Pending User Accounts 👥
                    </h1>
                    <p className="text-gray-600">
                        Review and approve new user registrations
                    </p>
                </div>

                {/* Filters */}
                <div className="flex flex-col lg:flex-row gap-4 mb-6">
                    <div className="flex items-center gap-2 w-full lg:w-1/3">
                        <div className="relative flex-1">
                            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                                placeholder="Enter User Name"
                                className="border py-3 pl-9 pr-3 rounded w-full focus:outline-none focus:ring-2 focus:ring-orange-300"
                                value={filterName}
                                onChange={(e) => setFilterName(e.target.value)}
                            />
                        </div>
                    </div>
                    <input
                        placeholder="Enter User ID"
                        className="border py-3 px-4 rounded w-full lg:w-1/3 focus:outline-none focus:ring-2 focus:ring-orange-300"
                        value={filterId}
                        onChange={(e) => setFilterId(e.target.value)}
                    />
                    <div className="w-full lg:w-1/3">
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    className="w-full justify-start text-left font-normal"
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {filterDate
                                        ? filterDate.toLocaleDateString()
                                        : "Sign Up Date"}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent
                                className="w-auto p-0"
                                align="start"
                            >
                                <Calendar
                                    mode="single"
                                    selected={filterDate}
                                    onSelect={setFilterDate}
                                    disabled={(d) => d > new Date()}
                                    captionLayout="dropdown"
                                    fromYear={1900}
                                    toYear={new Date().getFullYear()}
                                    initialFocus
                                />
                                {filterDate && (
                                    <div className="p-2 pt-0 text-right">
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => setFilterDate(null)}
                                        >
                                            Clear
                                        </Button>
                                    </div>
                                )}
                            </PopoverContent>
                        </Popover>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mx-6 mb-10">
                <div className="flex justify-between items-center mb-3">
                    <p className="text-sm text-gray-600">
                        {loading
                            ? "Loading pending users..."
                            : `${filtered.length} pending user${
                                  filtered.length !== 1 ? "s" : ""
                              }`}
                    </p>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={fetchUsers}
                            disabled={loading}
                        >
                            {loading && (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            )}
                            Refresh
                        </Button>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b bg-gray-50">
                                <th className="p-2 w-10">
                                    <input type="checkbox" disabled />
                                </th>
                                <th className="p-2">User ID</th>
                                <th className="p-2">Sign Up Date</th>
                                <th className="p-2">User</th>
                                <th className="p-2">Submitted ID</th>
                                <th className="p-2">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {!loading && filtered.length === 0 && (
                                <tr>
                                    <td
                                        colSpan={6}
                                        className="p-4 text-center text-sm text-gray-500"
                                    >
                                        No pending users match the current
                                        filters.
                                    </td>
                                </tr>
                            )}
                            {loading && (
                                <tr>
                                    <td
                                        colSpan={6}
                                        className="p-4 text-center text-sm text-gray-500"
                                    >
                                        <div className="flex items-center justify-center gap-2">
                                            <Loader2 className="h-4 w-4 animate-spin" />{" "}
                                            Fetching...
                                        </div>
                                    </td>
                                </tr>
                            )}
                            {!loading &&
                                filtered.map((u) => {
                                    const fullName =
                                        `${u.first_name || ""} ${
                                            u.last_name || ""
                                        }`.trim() || "(No Name)";
                                    return (
                                        <tr
                                            key={u.id}
                                            className="border-b last:border-b-0"
                                        >
                                            <td className="p-2 align-middle">
                                                <input type="checkbox" />
                                            </td>
                                            <td className="p-2 text-[#FF9900] font-medium align-middle break-all min-w-[200px] md:min-w-[260px] lg:min-w-[300px]">
                                                {u.id}
                                            </td>
                                            <td className="p-2 align-middle">
                                                {formatDate(u.created_at)}
                                            </td>
                                            <td className="p-2 align-middle">
                                                {fullName}
                                            </td>
                                            <td className="p-2 align-middle">
                                                {u.id_image_url ? (
                                                    <button
                                                        onClick={() =>
                                                            setPreviewUser(u)
                                                        }
                                                        className="text-blue-600 underline hover:text-blue-800"
                                                    >
                                                        View ID
                                                    </button>
                                                ) : (
                                                    <span className="text-xs text-gray-400">
                                                        None
                                                    </span>
                                                )}
                                            </td>
                                            <td className="p-2 flex gap-2">
                                                <Button
                                                    className="bg-green-600 text-white hover:bg-green-700 flex items-center gap-1 cursor-pointer"
                                                    size="sm"
                                                    disabled={
                                                        actionUserId === u.id
                                                    }
                                                    onClick={() =>
                                                        handleApprove(u.id)
                                                    }
                                                >
                                                    {actionUserId === u.id ? (
                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                    ) : (
                                                        <Check className="h-4 w-4" />
                                                    )}
                                                    Approve
                                                </Button>
                                                <Button
                                                    className="bg-red-600 text-white hover:bg-red-700 flex items-center gap-1 cursor-pointer"
                                                    size="sm"
                                                    disabled={
                                                        actionUserId === u.id
                                                    }
                                                    onClick={() =>
                                                        handleReject(u.id)
                                                    }
                                                >
                                                    {actionUserId === u.id ? (
                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                    ) : (
                                                        <X className="h-4 w-4" />
                                                    )}
                                                    Reject
                                                </Button>
                                            </td>
                                        </tr>
                                    );
                                })}
                        </tbody>
                    </table>
                </div>
            </div>
            {/* ID Preview Centered Modal */}
            {previewUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                        onClick={() => setPreviewUser(null)}
                    />
                    <div className="relative z-10 w-full max-w-lg max-h-[90vh] bg-white rounded-xl shadow-xl border flex flex-col">
                        <div className="flex items-center justify-between px-4 py-3 border-b">
                            <div>
                                <h2 className="text-lg font-semibold">
                                    ID Document
                                </h2>
                                <p className="text-xs text-gray-500">
                                    User:{" "}
                                    {(previewUser.first_name || "") +
                                        " " +
                                        (previewUser.last_name || "")}
                                </p>
                            </div>
                            <button
                                onClick={() => setPreviewUser(null)}
                                className="text-gray-500 hover:text-gray-800 transition"
                                aria-label="Close"
                            >
                                ✕
                            </button>
                        </div>
                        <div className="p-4 overflow-y-auto">
                            {previewUser.id_image_url ? (
                                <img
                                    src={previewUser.id_image_url}
                                    alt="User ID"
                                    className="w-full h-auto rounded border"
                                />
                            ) : (
                                <p className="text-sm text-gray-500">
                                    No ID image available.
                                </p>
                            )}
                        </div>
                        <div className="flex justify-end gap-2 px-4 pb-4 border-t bg-white/60 backdrop-blur supports-[backdrop-filter]:bg-white/40 mt-auto">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setPreviewUser(null)}
                            >
                                Close
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}
