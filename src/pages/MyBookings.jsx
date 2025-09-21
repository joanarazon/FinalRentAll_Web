import { useEffect, useMemo, useState } from "react";
import TopMenu from "@/components/topMenu";
import { useUser } from "@/hooks/useUser";
import { supabase } from "../../supabaseClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToastApi } from "@/components/ui/toast";
import { Separator } from "@/components/ui/separator";
import Loading from "@/components/Loading";

export default function MyBookings() {
    const user = useUser();
    const [loading, setLoading] = useState(true);
    const [rows, setRows] = useState([]);
    const [search, setSearch] = useState("");
    const toast = useToastApi();

    useEffect(() => {
        if (!user?.id) return;
        (async () => {
            try {
                setLoading(true);
                const { data, error } = await supabase
                    .from("rental_transactions")
                    .select(
                        "rental_id,item_id,start_date,end_date,total_cost,status,items(title)"
                    )
                    .eq("renter_id", user.id)
                    .order("created_at", { ascending: false });
                if (error) throw error;
                setRows(data || []);
            } finally {
                setLoading(false);
            }
        })();
    }, [user?.id]);

    const grouped = useMemo(() => {
        const by = { pending: [], ongoing: [], completed: [] };
        for (const r of rows) {
            if (r.status === "completed") by.completed.push(r);
            else if (r.status === "pending") by.pending.push(r);
            else by.ongoing.push(r); // includes confirmed, ongoing, cancelled? keep it simple
        }
        const term = search.trim().toLowerCase();
        if (!term) return by;
        const filter = (arr) =>
            arr.filter((r) => r.items?.title?.toLowerCase().includes(term));
        return {
            pending: filter(by.pending),
            ongoing: filter(by.ongoing),
            completed: filter(by.completed),
        };
    }, [rows, search]);

    if (!user) return null;

    return (
        <div className="min-h-screen bg-[#FFFBF2]">
            <TopMenu
                activePage="my-bookings"
                searchTerm={search}
                setSearchTerm={setSearch}
            />
            <div className="max-w-5xl mx-auto p-4 space-y-6">
                <h2 className="text-2xl font-semibold">My Bookings</h2>
                {loading ? (
                    <Loading />
                ) : (
                    <div className="space-y-6">
                        <Section title="Pending" data={grouped.pending} />
                        <Separator />
                        <Section
                            title="Ongoing"
                            data={grouped.ongoing}
                            onChanged={() => {
                                // refetch to reflect updates
                                (async () => {
                                    try {
                                        setLoading(true);
                                        const { data, error } = await supabase
                                            .from("rental_transactions")
                                            .select(
                                                "rental_id,item_id,start_date,end_date,total_cost,status,items(title)"
                                            )
                                            .eq("renter_id", user.id)
                                            .order("created_at", {
                                                ascending: false,
                                            });
                                        if (error) throw error;
                                        setRows(data || []);
                                    } finally {
                                        setLoading(false);
                                    }
                                })();
                            }}
                        />
                        <Separator />
                        <Section title="Completed" data={grouped.completed} />
                    </div>
                )}
            </div>
        </div>
    );
}

function Section({ title, data, onChanged }) {
    return (
        <div>
            <h3 className="text-xl font-medium mb-3">{title}</h3>
            {!data || data.length === 0 ? (
                <p className="text-sm text-gray-600">
                    No {title.toLowerCase()} bookings.
                </p>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {data.map((r) => (
                        <Card key={r.rental_id}>
                            <CardHeader>
                                <CardTitle className="text-base">
                                    {r.items?.title || "Item"}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="text-sm space-y-1">
                                <div className="flex justify-between">
                                    <span>Start</span>
                                    <span>
                                        {new Date(
                                            r.start_date
                                        ).toLocaleDateString()}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span>End</span>
                                    <span>
                                        {new Date(
                                            r.end_date
                                        ).toLocaleDateString()}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Status</span>
                                    <span className="capitalize">
                                        {r.status}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Total</span>
                                    <span>
                                        ₱{Number(r.total_cost || 0).toFixed(2)}
                                    </span>
                                </div>
                                {title === "Ongoing" && isEligibleReturn(r) && (
                                    <div className="pt-2">
                                        <MarkReturned
                                            rental={r}
                                            onChanged={onChanged}
                                        />
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}

function isEligibleReturn(rental) {
    if (!rental) return false;
    const now = new Date();
    const end = new Date(rental.end_date);
    // Allow renter to mark returned on or after end_date and only for confirmed/ongoing
    return (
        end <= now &&
        ["confirmed", "ongoing"].includes(
            String(rental.status || "").toLowerCase()
        )
    );
}

function MarkReturned({ rental, onChanged }) {
    const [submitting, setSubmitting] = useState(false);
    const toast = useToastApi();
    const doMark = async () => {
        try {
            setSubmitting(true);
            const { error } = await supabase
                .from("rental_transactions")
                .update({
                    status: "awaiting_owner_confirmation",
                    renter_return_marked_at: new Date().toISOString(),
                })
                .eq("rental_id", rental.rental_id)
                .in("status", ["confirmed", "ongoing"]);
            if (error) throw error;
            toast.success(
                "Marked as returned. Waiting for owner confirmation."
            );
            onChanged && onChanged();
        } catch (e) {
            toast.error(
                `Could not mark returned: ${e.message || "Unknown error"}`
            );
        } finally {
            setSubmitting(false);
        }
    };
    return (
        <Button
            size="sm"
            onClick={doMark}
            disabled={submitting}
            className="cursor-pointer"
        >
            {submitting ? "Marking…" : "Mark as Returned"}
        </Button>
    );
}
