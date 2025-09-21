import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Calendar, CalendarDayButton } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "../../supabaseClient";

export default function BookItemModal({
    open,
    onOpenChange,
    item,
    currentUserId,
    onBooked,
}) {
    // Custom DayButton: start/end solid #FFAB00, middle washed-out
    const DayButton = ({ className, ...props }) => (
        <CalendarDayButton
            {...props}
            className={cn(
                className,
                "data-[selected-single=true]:!bg-[#FFAB00] data-[selected-single=true]:!text-black",
                "data-[range-start=true]:!bg-[#FFAB00] data-[range-start=true]:!text-black",
                "data-[range-end=true]:!bg-[#FFAB00] data-[range-end=true]:!text-black",
                "data-[range-middle=true]:!bg-[#FFAB00]/30 data-[range-middle=true]:!text-black"
            )}
        />
    );
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    // Quantity and availability
    const [quantity, setQuantity] = useState(1);
    const [remaining, setRemaining] = useState(null); // null when no range
    const [availabilityLoading, setAvailabilityLoading] = useState(false);
    const [range, setRange] = useState({ from: undefined, to: undefined });
    const [imageUrl, setImageUrl] = useState();
    const [imageLoading, setImageLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");
    const [owner, setOwner] = useState(null);
    const [ownerLoading, setOwnerLoading] = useState(false);

    const today = useMemo(() => {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        return d;
    }, []);

    // Fetch item quantity (use prop if present)
    useEffect(() => {
        if (!open || !item?.item_id) return;
        if (item?.quantity != null) {
            setQuantity(Number(item.quantity) || 1);
            return;
        }
        (async () => {
            const { data } = await supabase
                .from("items")
                .select("quantity")
                .eq("item_id", item.item_id)
                .single();
            setQuantity(Number(data?.quantity) || 1);
        })();
    }, [open, item?.item_id, item?.quantity]);

    useEffect(() => {
        if (!open || !item?.item_id || !item?.user_id) return;
        (async () => {
            try {
                setImageLoading(true);
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
            } finally {
                setImageLoading(false);
            }
        })();
    }, [open, item?.item_id, item?.user_id]);

    // Fetch owner profile basics for display (first/last name, phone, created_at)
    useEffect(() => {
        if (!open || !item?.user_id) return;
        (async () => {
            try {
                setOwnerLoading(true);
                const { data, error } = await supabase
                    .from("users")
                    .select(
                        "id,first_name,last_name,phone,created_at,location_lat,location_lng"
                    )
                    .eq("id", item.user_id)
                    .single();
                if (error) return setOwner(null);
                setOwner(data);
            } catch {
                setOwner(null);
            } finally {
                setOwnerLoading(false);
            }
        })();
    }, [open, item?.user_id]);

    useEffect(() => {
        if (!open) {
            setRange({ from: undefined, to: undefined });
            setRemaining(null);
            setErrorMsg("");
        }
    }, [open]);

    const disabled = useMemo(() => {
        return [{ before: today }];
    }, [today]);

    // Compute remaining availability for selected range
    useEffect(() => {
        const hasRange = !!range.from && !!range.to;
        if (!open || !item?.item_id || !hasRange) {
            setRemaining(hasRange ? 0 : null);
            return;
        }
        (async () => {
            try {
                setAvailabilityLoading(true);
                const from = (() => {
                    const d = new Date(range.from);
                    d.setHours(0, 0, 0, 0);
                    return d;
                })();
                const to = (() => {
                    const d = new Date(range.to);
                    d.setHours(0, 0, 0, 0);
                    return d;
                })();
                const fromStr = `${from.getFullYear()}-${String(
                    from.getMonth() + 1
                ).padStart(2, "0")}-${String(from.getDate()).padStart(2, "0")}`;
                const toStr = `${to.getFullYear()}-${String(
                    to.getMonth() + 1
                ).padStart(2, "0")}-${String(to.getDate()).padStart(2, "0")}`;

                const { count } = await supabase
                    .from("rental_transactions")
                    .select("*", { count: "exact", head: true })
                    .eq("item_id", item.item_id)
                    .in("status", ["pending", "confirmed", "ongoing"])
                    .lte("start_date", toStr)
                    .gte("end_date", fromStr);

                const overlaps = Number(count || 0);
                const rem = Math.max(0, (Number(quantity) || 1) - overlaps);
                setRemaining(rem);
            } finally {
                setAvailabilityLoading(false);
            }
        })();
    }, [open, item?.item_id, range.from, range.to, quantity]);

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
    const canSubmit =
        !loading &&
        !isOwner &&
        daysCount > 0 &&
        !!currentUserId &&
        (remaining === null || remaining > 0);

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
        if (remaining !== null && remaining <= 0) {
            setErrorMsg(
                "Selected dates are fully booked. Try different dates."
            );
            return;
        }
        // Guard: prevent past start dates even if UI is bypassed
        const startMidnight = new Date(range.from);
        startMidnight.setHours(0, 0, 0, 0);
        if (startMidnight < today) {
            setErrorMsg("Start date cannot be in the past.");
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
            if (error) {
                // DB enforces capacity; turn violation into friendly message
                setErrorMsg(
                    "Booking could not be created. The selected dates may be fully booked."
                );
                throw error;
            }
            onBooked?.();
            onOpenChange(false);
        } catch (e) {
            if (!errorMsg) {
                setErrorMsg("Failed to submit booking. Please try again.");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent
                side="right"
                className="w-full sm:max-w-xl md:max-w-2xl lg:max-w-3xl xl:max-w-4xl"
            >
                <SheetHeader>
                    <SheetTitle>Rent "{item?.title}"</SheetTitle>
                </SheetHeader>
                <div className="flex-1 overflow-y-auto p-4 min-h-0">
                    <div className="flex flex-col md:flex-row gap-4 md:gap-6">
                        {imageLoading ? (
                            <Skeleton className="w-full md:w-56 h-40 md:h-40 rounded-md" />
                        ) : imageUrl ? (
                            <img
                                src={imageUrl}
                                alt={item?.title || "Item image"}
                                className="w-full md:w-56 h-40 md:h-40 object-cover rounded-md border"
                            />
                        ) : null}
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
                                    onClick={() => {
                                        setRange({
                                            from: undefined,
                                            to: undefined,
                                        });
                                        setRemaining(null);
                                    }}
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
                                classNames={{
                                    today: "rounded-md ring-1 ring-muted-foreground text-foreground data-[selected=true]:rounded-none",
                                }}
                                components={{ DayButton }}
                            />
                            <div className="mt-3 text-xs text-gray-600 space-y-1">
                                <p>
                                    Availability is checked for your selected
                                    dates.
                                </p>
                                <p>Start and end dates are both inclusive.</p>
                                <p>Total units: {Number(quantity) || 1}</p>
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
                                <div className="flex justify-between">
                                    <span>Units available</span>
                                    <span>
                                        {availabilityLoading
                                            ? "Checking..."
                                            : range.from && range.to
                                            ? remaining ?? "—"
                                            : "—"}
                                    </span>
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
                            {/* Owner info */}
                            {ownerLoading ? (
                                <div className="mt-4 p-3 border rounded bg-white space-y-2">
                                    <Skeleton className="h-5 w-24" />
                                    <Skeleton className="h-4 w-full" />
                                    <Skeleton className="h-4 w-2/3" />
                                    <Skeleton className="h-4 w-1/2" />
                                </div>
                            ) : owner ? (
                                <div className="mt-4 p-3 border rounded bg-white">
                                    <p className="font-medium mb-2">
                                        Item owner
                                    </p>
                                    <div className="text-sm space-y-1">
                                        <div className="flex justify-between">
                                            <span>Name</span>
                                            <span>
                                                {(
                                                    owner.first_name || ""
                                                ).trim()}{" "}
                                                {(owner.last_name || "").trim()}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Member since</span>
                                            <span>
                                                {owner.created_at
                                                    ? new Date(
                                                          owner.created_at
                                                      ).toLocaleDateString()
                                                    : "—"}
                                            </span>
                                        </div>
                                        {(owner.location_lat ||
                                            owner.location_lng) && (
                                            <div className="flex justify-between">
                                                <span>Location</span>
                                                <span>
                                                    {owner.location_lat || ""}
                                                    {owner.location_lat &&
                                                    owner.location_lng
                                                        ? ", "
                                                        : ""}
                                                    {owner.location_lng || ""}
                                                </span>
                                            </div>
                                        )}
                                        {owner.phone && (
                                            <div className="flex justify-between">
                                                <span>Phone</span>
                                                <a
                                                    className="text-blue-600 hover:underline"
                                                    href={`tel:${owner.phone}`}
                                                >
                                                    {owner.phone}
                                                </a>
                                            </div>
                                        )}
                                    </div>
                                    <div className="mt-3 flex justify-end">
                                        <Button
                                            variant="outline"
                                            className="cursor-pointer"
                                            onClick={() => {
                                                if (!currentUserId) {
                                                    setErrorMsg(
                                                        "Please sign in to message the owner."
                                                    );
                                                    return;
                                                }
                                                const params =
                                                    new URLSearchParams({
                                                        to: owner.id,
                                                        item: item.item_id,
                                                    });
                                                navigate(
                                                    `/inbox?${params.toString()}`
                                                );
                                            }}
                                        >
                                            Message Owner
                                        </Button>
                                    </div>
                                </div>
                            ) : null}
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
                <SheetFooter className="border-t bg-white/60 backdrop-blur supports-[backdrop-filter]:bg-white/40 sticky bottom-0">
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
                        style={{
                            "--primary": "#FFAB00",
                            "--primary-foreground": "black",
                        }}
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
                                    : remaining !== null && remaining <= 0
                                    ? "Fully booked for selected dates"
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
