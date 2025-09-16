import { useEffect, useMemo, useState } from "react";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { supabase } from "../../supabaseClient";

export default function BookItemModal({
    open,
    onOpenChange,
    item,
    currentUserId,
    onBooked,
}) {
    const [loading, setLoading] = useState(false);
    const [busyRanges, setBusyRanges] = useState([]); // [{from: Date, to: Date}]
    const [range, setRange] = useState({ from: undefined, to: undefined });

    const today = useMemo(() => {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        return d;
    }, []);

    useEffect(() => {
        if (!open || !item?.item_id) return;
        (async () => {
            const { data, error } = await supabase
                .from("rental_transactions")
                .select("start_date,end_date,status")
                .eq("item_id", item.item_id)
                .in("status", ["pending", "confirmed", "ongoing"]);
            if (error) return;
            const ranges = (data || []).map((r) => ({
                from: new Date(r.start_date),
                to: new Date(r.end_date),
            }));
            setBusyRanges(ranges);
        })();
    }, [open, item?.item_id]);

    useEffect(() => {
        if (!open) {
            setRange({ from: undefined, to: undefined });
            setBusyRanges([]);
        }
    }, [open]);

    const disabled = useMemo(() => {
        const beforeToday = {
            to: new Date(today.getTime() - 24 * 60 * 60 * 1000),
        };
        return [beforeToday, ...busyRanges];
    }, [busyRanges, today]);

    const daysCount = useMemo(() => {
        if (!range.from || !range.to) return 0;
        const ms =
            range.to.setHours(0, 0, 0, 0) - range.from.setHours(0, 0, 0, 0);
        return Math.floor(ms / (1000 * 60 * 60 * 24)) + 1; // inclusive
    }, [range]);

    const total = useMemo(() => {
        const price = Number(item?.price_per_day || 0);
        const deposit = Number(item?.deposit_fee || 0);
        return price * daysCount + deposit;
    }, [item?.price_per_day, item?.deposit_fee, daysCount]);

    const formatDate = (d) => {
        if (!d) return null;
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        return `${y}-${m}-${day}`;
    };

    const submit = async () => {
        if (!currentUserId) {
            alert("You must be logged in to rent.");
            return;
        }
        if (!item?.item_id) return;
        if (!range.from || !range.to) {
            alert("Please select a start and end date.");
            return;
        }
        if (currentUserId === item.user_id) {
            alert("You can't rent your own item.");
            return;
        }
        try {
            setLoading(true);
            const payload = {
                item_id: item.item_id,
                renter_id: currentUserId,
                start_date: formatDate(range.from),
                end_date: formatDate(range.to),
                total_cost: total,
            };
            const { error } = await supabase
                .from("rental_transactions")
                .insert([payload]);
            if (error) throw error;
            alert("Booking request submitted (pending)");
            onBooked?.();
            onOpenChange(false);
        } catch (e) {
            alert("Failed to book: " + e.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="right" className="w-full sm:max-w-md">
                <SheetHeader>
                    <SheetTitle>Rent "{item?.title}"</SheetTitle>
                </SheetHeader>
                <div className="p-4 space-y-4">
                    <div>
                        <p className="text-sm text-gray-600">Price per day</p>
                        <p className="text-xl font-semibold">
                            ₱{Number(item?.price_per_day || 0).toFixed(2)}
                        </p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-600">Deposit fee</p>
                        <p className="text-xl font-semibold">
                            ₱{Number(item?.deposit_fee || 0).toFixed(2)}
                        </p>
                    </div>
                    <div>
                        <p className="text-sm font-medium mb-2">
                            Select rental dates
                        </p>
                        <Calendar
                            mode="range"
                            selected={range}
                            onSelect={setRange}
                            disabled={disabled}
                            numberOfMonths={1}
                            captionLayout="dropdown"
                            fromYear={new Date().getFullYear()}
                            toYear={new Date().getFullYear() + 2}
                        />
                    </div>
                    <div className="border-t pt-3">
                        <div className="flex justify-between text-sm">
                            <span>Days</span>
                            <span>{daysCount}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span>Subtotal</span>
                            <span>
                                ₱
                                {(
                                    Number(item?.price_per_day || 0) * daysCount
                                ).toFixed(2)}
                            </span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span>Deposit</span>
                            <span>
                                ₱{Number(item?.deposit_fee || 0).toFixed(2)}
                            </span>
                        </div>
                        <div className="flex justify-between text-base font-semibold mt-2">
                            <span>Total</span>
                            <span>₱{total.toFixed(2)}</span>
                        </div>
                    </div>
                </div>
                <SheetFooter>
                    <Button
                        variant="outline"
                        className="cursor-pointer"
                        onClick={() => onOpenChange(false)}
                        disabled={loading}
                    >
                        Cancel
                    </Button>
                    <Button
                        className="cursor-pointer"
                        onClick={submit}
                        disabled={loading || daysCount <= 0}
                    >
                        Request Booking
                    </Button>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    );
}
