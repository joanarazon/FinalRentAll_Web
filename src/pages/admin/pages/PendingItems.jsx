import React, {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import AdminLayout from "../../../components/AdminLayout";
import { Button } from "@/components/ui/button";
import { supabase } from "../../../../supabaseClient";
import {
    Loader2,
    Search,
    Image as ImageIcon,
    Calendar as CalendarIcon,
} from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import {
    Popover,
    PopoverTrigger,
    PopoverContent,
} from "@/components/ui/popover";
import { useToastApi } from "@/components/ui/toast";

export default function PendingItems() {
    const toast = useToastApi();
    const [items, setItems] = useState([]); // raw items pending approval
    const [loading, setLoading] = useState(false);
    const [actionId, setActionId] = useState(null);
    const [filterName, setFilterName] = useState("");
    const [filterId, setFilterId] = useState("");
    const [filterDate, setFilterDate] = useState(null); // JS Date object
    const [previewItem, setPreviewItem] = useState(null);

    // Assuming a new column item_status (pending/approved/rejected). If not yet added, this will fallback.
    const inFlightRef = useRef(false);

    const fetchPending = useCallback(async () => {
        if (inFlightRef.current) return; // prevent overlapping calls
        inFlightRef.current = true;
        const MIN = 800;
        const start = performance.now();
        try {
            setLoading(true);
            let query = supabase
                .from("items")
                .select(
                    "item_id,user_id,category_id,title,description,price_per_day,deposit_fee,location,created_at,main_image_url,item_status,quantity"
                )
                .order("created_at", { ascending: false });

            // Filter server-side by status if column exists
            query = query.eq("item_status", "pending");
            let { data, error } = await query;

            // Fallback: if column missing, treat all as pending (client filter later)
            if (
                error &&
                (error.code === "42703" || /item_status/i.test(error.message))
            ) {
                console.warn(
                    "item_status column missing. Showing all items as pending candidate."
                );
                const fb = await supabase
                    .from("items")
                    .select(
                        "item_id,user_id,category_id,title,description,price_per_day,deposit_fee,location,created_at,main_image_url,quantity"
                    )
                    .order("created_at", { ascending: false });
                data = fb.data;
                error = fb.error;
            }
            if (error) throw error;
            setItems(data || []);
        } catch (e) {
            toast.error("Failed to load pending items: " + e.message);
        } finally {
            const elapsed = performance.now() - start;
            const rem = MIN - elapsed;
            if (rem > 0) await new Promise((r) => setTimeout(r, rem));
            setLoading(false);
            inFlightRef.current = false;
        }
    }, []); // toast removed to keep stable; using direct call inside catch

    useEffect(() => {
        fetchPending();
    }, [fetchPending]);

    const filtered = useMemo(() => {
        return items.filter((it) => {
            const nameMatch =
                !filterName ||
                it.title.toLowerCase().includes(filterName.toLowerCase());
            const idMatch =
                !filterId ||
                it.item_id.toLowerCase().includes(filterId.toLowerCase());
            let dateMatch = true;
            if (filterDate) {
                try {
                    const created = new Date(it.created_at);
                    dateMatch =
                        created.toDateString() === filterDate.toDateString();
                } catch {
                    dateMatch = false;
                }
            }
            return nameMatch && idMatch && dateMatch;
        });
    }, [items, filterName, filterId, filterDate]);

    const approve = async (id) => {
        setActionId(id);
        try {
            // Only approve if current status is pending (or legacy null)
            const { error } = await supabase
                .from("items")
                .update({ item_status: "approved" })
                .eq("item_id", id)
                .or("item_status.eq.pending,item_status.is.null");
            if (error) throw error;
            await supabase.from("activity_log").insert([
                {
                    action_type: "item_approve",
                    description: `Approved item ${id}`,
                    target_table: "items",
                    target_id: id,
                },
            ]);
            toast.success("Item approved");
            fetchPending();
        } catch (e) {
            toast.error("Approve failed: " + e.message);
        } finally {
            setActionId(null);
        }
    };

    const reject = async (id) => {
        setActionId(id);
        try {
            // Only reject if current status is pending (or legacy null)
            const { error } = await supabase
                .from("items")
                .update({ item_status: "rejected" })
                .eq("item_id", id)
                .or("item_status.eq.pending,item_status.is.null");
            if (error) throw error;
            await supabase.from("activity_log").insert([
                {
                    action_type: "item_reject",
                    description: `Rejected item ${id}`,
                    target_table: "items",
                    target_id: id,
                },
            ]);
            toast.success("Item rejected");
            fetchPending();
        } catch (e) {
            toast.error("Reject failed: " + e.message);
        } finally {
            setActionId(null);
        }
    };

    const openPreview = (it) => setPreviewItem(it);

    return (
        <AdminLayout className="bg-[#FFFBF2] min-h-screen">
            <div className="p-6">
                {/* Page Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                        Pending Items 📦
                    </h1>
                    <p className="text-gray-600">
                        Review and approve items submitted by users
                    </p>
                </div>

                <div className="flex gap-6 mb-6 flex-col md:flex-row">
                    <div className="relative md:w-1/3 w-full">
                        <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                            placeholder="Enter Item Name"
                            className="border py-3 pl-9 pr-3 rounded w-full focus:outline-none focus:ring-2 focus:ring-orange-300"
                            value={filterName}
                            onChange={(e) => setFilterName(e.target.value)}
                        />
                    </div>
                    <input
                        placeholder="Enter Item ID"
                        className="border py-3 px-4 rounded md:w-1/3 w-full focus:outline-none focus:ring-2 focus:ring-orange-300"
                        value={filterId}
                        onChange={(e) => setFilterId(e.target.value)}
                    />
                    <div className="md:w-1/3 w-full">
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    className="w-full justify-start text-left font-normal"
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {filterDate
                                        ? filterDate.toLocaleDateString()
                                        : "Request Date"}
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
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 overflow-x-auto mx-6 mb-10">
                <div className="flex justify-between items-center mb-3">
                    <p className="text-sm text-gray-600">
                        {loading
                            ? "Loading pending items..."
                            : `${filtered.length} pending item${
                                  filtered.length !== 1 ? "s" : ""
                              }`}
                    </p>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={fetchPending}
                            disabled={loading}
                        >
                            {loading && (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            )}
                            Refresh
                        </Button>
                    </div>
                </div>
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b bg-gray-50">
                            <th className="p-2">
                                <input type="checkbox" disabled />
                            </th>
                            <th className="p-2">Item ID</th>
                            <th className="p-2">Request Date</th>
                            <th className="p-2">Item Name</th>
                            <th className="p-2">Quantity</th>
                            <th className="p-2">Submitted Photo</th>
                            <th className="p-2">Description</th>
                            <th className="p-2">Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading && (
                            <tr>
                                <td
                                    colSpan={7}
                                    className="p-4 text-center text-sm text-gray-500"
                                >
                                    <div className="flex items-center justify-center gap-2">
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Fetching...
                                    </div>
                                </td>
                            </tr>
                        )}
                        {!loading && filtered.length === 0 && (
                            <tr>
                                <td
                                    colSpan={7}
                                    className="p-4 text-center text-sm text-gray-500"
                                >
                                    No pending items match current filters.
                                </td>
                            </tr>
                        )}
                        {!loading &&
                            filtered.map((it) => {
                                return (
                                    <tr
                                        key={it.item_id}
                                        className="border-b hover:bg-gray-50 transition"
                                    >
                                        <td className="p-2">
                                            <input type="checkbox" disabled />
                                        </td>
                                        <td className="p-2 text-[#FF9900] font-medium font-mono text-xs break-all min-w-[140px]">
                                            {it.item_id}
                                        </td>
                                        <td className="p-2 text-sm">
                                            {new Date(
                                                it.created_at
                                            ).toLocaleDateString()}
                                        </td>
                                        <td className="p-2 text-sm">
                                            {it.title}
                                        </td>
                                        <td className="p-2">
                                            {it.main_image_url ? (
                                                <button
                                                    onClick={() =>
                                                        openPreview(it)
                                                    }
                                                    className="text-blue-600 underline text-sm cursor-pointer"
                                                >
                                                    View
                                                </button>
                                            ) : (
                                                <span className="text-gray-400 text-sm flex items-center gap-1">
                                                    <ImageIcon className="w-4 h-4" />
                                                    None
                                                </span>
                                            )}
                                        </td>
                                        <td className="p-2 text-sm">
                                            {Number(it.quantity) || 1}
                                        </td>
                                        <td
                                            className="p-2 text-gray-700 text-sm max-w-[250px] truncate"
                                            title={it.description || ""}
                                        >
                                            {it.description || "—"}
                                        </td>
                                        <td className="p-2 flex gap-2">
                                            <Button
                                                size="sm"
                                                className="bg-green-600 text-white hover:bg-green-700 cursor-pointer"
                                                disabled={
                                                    actionId === it.item_id
                                                }
                                                onClick={() =>
                                                    approve(it.item_id)
                                                }
                                            >
                                                {actionId === it.item_id ? (
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                ) : (
                                                    "Accept"
                                                )}
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="destructive"
                                                className="cursor-pointer"
                                                disabled={
                                                    actionId === it.item_id
                                                }
                                                onClick={() =>
                                                    reject(it.item_id)
                                                }
                                            >
                                                {actionId === it.item_id ? (
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                ) : (
                                                    "Reject"
                                                )}
                                            </Button>
                                        </td>
                                    </tr>
                                );
                            })}
                    </tbody>
                </table>
            </div>

            {previewItem && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                        onClick={() => setPreviewItem(null)}
                    />
                    <div className="relative z-10 w-full max-w-xl max-h-[90vh] bg-white rounded-xl shadow-xl border flex flex-col">
                        <div className="flex items-center justify-between px-4 py-3 border-b">
                            <div>
                                <h2 className="text-lg font-semibold">
                                    Item Preview
                                </h2>
                                <p className="text-xs text-gray-500">
                                    {previewItem.title}
                                </p>
                            </div>
                            <button
                                onClick={() => setPreviewItem(null)}
                                className="text-gray-500 hover:text-gray-800 transition"
                                aria-label="Close"
                            >
                                ✕
                            </button>
                        </div>
                        <div className="p-4 space-y-4 overflow-y-auto">
                            {previewItem.main_image_url ? (
                                <img
                                    src={previewItem.main_image_url}
                                    alt={previewItem.title}
                                    className="w-full h-auto rounded border"
                                />
                            ) : (
                                <p className="text-sm text-gray-500">
                                    No image uploaded.
                                </p>
                            )}
                            <div>
                                <p className="text-sm text-gray-600 mb-1">
                                    Description
                                </p>
                                <p className="text-sm">
                                    {previewItem.description || "—"}
                                </p>
                            </div>
                            <div className="grid grid-cols-2 gap-4 text-xs">
                                <div>
                                    <p className="font-medium">Price / day</p>
                                    <p>
                                        ₱
                                        {Number(
                                            previewItem.price_per_day || 0
                                        ).toFixed(2)}
                                    </p>
                                </div>
                                <div>
                                    <p className="font-medium">Deposit fee</p>
                                    <p>
                                        ₱
                                        {Number(
                                            previewItem.deposit_fee || 0
                                        ).toFixed(2)}
                                    </p>
                                </div>
                                <div>
                                    <p className="font-medium">Quantity</p>
                                    <p>{Number(previewItem.quantity) || 1}</p>
                                </div>
                                {previewItem.location && (
                                    <div className="col-span-2">
                                        <p className="font-medium">Location</p>
                                        <p>{previewItem.location}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 px-4 pb-4 border-t bg-white/60 backdrop-blur supports-[backdrop-filter]:bg-white/40 mt-auto">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setPreviewItem(null)}
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
