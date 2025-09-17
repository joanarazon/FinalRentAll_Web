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
import { Separator } from "@/components/ui/separator";
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
    const [imageUrl, setImageUrl] = useState();
    const [errorMsg, setErrorMsg] = useState("");

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
        if (!open || !item?.item_id || !item?.user_id) return;
        (async () => {
            try {
                const dir = `${item.user_id}/${item.item_id}`;
                const { data: files, error } = await supabase.storage
                    .from("Items-photos")
                    .list(dir, {
                        limit: 1,
                        sortBy: { column: "name", order: "desc" },
                    });
                if (error || !files || files.length === 0)
                    return setImageUrl(undefined);
                const fullPath = `${dir}/${files[0].name}`;
                const { data: pub } = supabase.storage
                    .from("Items-photos")
                    .getPublicUrl(fullPath);
                setImageUrl(pub?.publicUrl);
            } catch {
                setImageUrl(undefined);
            }
        })();
    }, [open, item?.item_id, item?.user_id]);

    useEffect(() => {
        if (!open) {
            setRange({ from: undefined, to: undefined });
            setBusyRanges([]);
            setErrorMsg("");
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

    const isOwner =
        currentUserId && item?.user_id && currentUserId === item.user_id;
    const canSubmit = !loading && !isOwner && daysCount > 0 && !!currentUserId;

    const submit = async () => {
        setErrorMsg("");
        if (!currentUserId) {
            setErrorMsg("Please sign in to request a booking.");
            return;
        }
        if (!item?.item_id) return;
        if (!range.from || !range.to) {
            setErrorMsg("Select a start and end date to continue.");
            return;
        }
        if (isOwner) {
            setErrorMsg("You can't rent your own item.");
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
            onBooked?.();
            onOpenChange(false);
        } catch (e) {
            setErrorMsg("Failed to submit booking. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="right" className="w-full sm:max-w-2xl">
                <SheetHeader>
                    <SheetTitle>Rent "{item?.title}"</SheetTitle>
                </SheetHeader>
                <div className="p-4">
                    <div className="flex flex-col md:flex-row gap-4 md:gap-6">
                        {imageUrl && (
                            <img
                                src={imageUrl}
                                alt={item?.title || "Item image"}
                                className="w-full md:w-56 h-40 md:h-40 object-cover rounded-md border"
                            />
                        )}
                        <div className="flex-1 grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-sm text-gray-600">
                                    Price per day
                                </p>
                                <p className="text-xl font-semibold">
                                    ₱
                                    {Number(item?.price_per_day || 0).toFixed(
                                        2
                                    )}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">
                                    Deposit fee
                                </p>
                                <p className="text-xl font-semibold">
                                    ₱{Number(item?.deposit_fee || 0).toFixed(2)}
                                </p>
                            </div>
                            {item?.location && (
                                <div className="col-span-2">
                                    <p className="text-sm text-gray-600">
                                        Location
                                    </p>
                                    <p className="text-base">{item.location}</p>
                                </div>
                            )}
                        </div>
                    </div>

                    <Separator className="my-4" />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <p className="text-sm font-medium">
                                    Select rental dates
                                </p>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="cursor-pointer"
                                    onClick={() =>
                                        setRange({
                                            from: undefined,
                                            to: undefined,
                                        })
                                    }
                                    disabled={loading}
                                >
                                    Clear dates
                                </Button>
                            </div>
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
                            <div className="mt-3 text-xs text-gray-600 space-y-1">
                                <p>
                                    Unavailable dates are disabled based on
                                    existing bookings.
                                </p>
                                <p>Start and end dates are both inclusive.</p>
                            </div>
                        </div>

                        <div className="border rounded-md p-4 h-fit">
                            <p className="font-medium mb-3">Booking summary</p>
                            <div className="space-y-1 text-sm">
                                <div className="flex justify-between">
                                    <span>Start date</span>
                                    <span>
                                        {range.from
                                            ? range.from.toLocaleDateString()
                                            : "—"}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span>End date</span>
                                    <span>
                                        {range.to
                                            ? range.to.toLocaleDateString()
                                            : "—"}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Days</span>
                                    <span>{daysCount}</span>
                                </div>
                                <Separator className="my-2" />
                                <div className="flex justify-between">
                                    <span>Subtotal</span>
                                    <span>
                                        ₱
                                        {(
                                            Number(item?.price_per_day || 0) *
                                            daysCount
                                        ).toFixed(2)}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Deposit</span>
                                    <span>
                                        ₱
                                        {Number(item?.deposit_fee || 0).toFixed(
                                            2
                                        )}
                                    </span>
                                </div>
                                <div className="flex justify-between text-base font-semibold mt-1">
                                    <span>Total</span>
                                    <span>₱{total.toFixed(2)}</span>
                                </div>
                            </div>
                            {isOwner && (
                                <div className="mt-3 text-xs text-red-600">
                                    You are the owner of this item and cannot
                                    book it.
                                </div>
                            )}
                            {!currentUserId && (
                                <div className="mt-3 text-xs text-amber-700">
                                    Please sign in to request a booking.
                                </div>
                            )}
                            {errorMsg && (
                                <div className="mt-3 text-xs text-red-600">
                                    {errorMsg}
                                </div>
                            )}
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
                        disabled={!canSubmit}
                        title={
                            !canSubmit
                                ? isOwner
                                    ? "Owners cannot book their own item"
                                    : daysCount <= 0
                                    ? "Select a start and end date"
                                    : !currentUserId
                                    ? "Sign in to continue"
                                    : ""
                                : undefined
                        }
                    >
                        {loading ? "Submitting..." : "Request Booking"}
                    </Button>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    );
}
