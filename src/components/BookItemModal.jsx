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
import { getLessorRatingStats } from "@/lib/reviews";
import ReportDialog from "@/components/ReportDialog";

export default function BookItemModal({
    open,
    onOpenChange,
    item,
    currentUserId,
    onBooked,
}) {
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
    const [quantity, setQuantity] = useState(1);
    const [remaining, setRemaining] = useState(null);
    const [availabilityLoading, setAvailabilityLoading] = useState(false);
    const [requestedUnits, setRequestedUnits] = useState(1);
    const [range, setRange] = useState({ from: undefined, to: undefined });
    const [imageUrl, setImageUrl] = useState();
    const [imageLoading, setImageLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");
    const [owner, setOwner] = useState(null);
    const [ownerLoading, setOwnerLoading] = useState(false);
    const [reviews, setReviews] = useState([]);
    const [reviewsLoading, setReviewsLoading] = useState(false);
    const [reviewsError, setReviewsError] = useState("");
    const [ownerRating, setOwnerRating] = useState({ average: 0, count: 0 });
    const [ownerRatingLoading, setOwnerRatingLoading] = useState(false);

    const today = useMemo(() => {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        return d;
    }, []);

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
        if (!open || !item?.user_id) return;
        (async () => {
            try {
                setOwnerRatingLoading(true);
                const stats = await getLessorRatingStats(item.user_id);
                setOwnerRating(stats);
            } catch {
                setOwnerRating({ average: 0, count: 0 });
            } finally {
                setOwnerRatingLoading(false);
            }
        })();
    }, [open, item?.user_id]);

    useEffect(() => {
        if (!open) {
            setRange({ from: undefined, to: undefined });
            setRemaining(null);
            setErrorMsg("");
            setRequestedUnits(1);
        }
    }, [open]);

    const disabled = useMemo(() => [{ before: today }], [today]);

    useEffect(() => {
        const hasRange = !!range.from && !!range.to;
        if (!open || !item?.item_id || !hasRange) {
            setRemaining(hasRange ? 0 : null);
            return;
        }
        (async () => {
            try {
                setAvailabilityLoading(true);
                const from = new Date(range.from);
                from.setHours(0, 0, 0, 0);
                const to = new Date(range.to);
                to.setHours(0, 0, 0, 0);
                const fromStr = `${from.getFullYear()}-${String(
                    from.getMonth() + 1
                ).padStart(2, "0")}-${String(from.getDate()).padStart(2, "0")}`;
                const toStr = `${to.getFullYear()}-${String(
                    to.getMonth() + 1
                ).padStart(2, "0")}-${String(to.getDate()).padStart(2, "0")}`;
                const { data, error } = await supabase
                    .from("rental_transactions")
                    .select("quantity")
                    .eq("item_id", item.item_id)
                    .in("status", [
                        "confirmed",
                        "ongoing",
                        "awaiting_owner_confirmation",
                    ])
                    .lte("start_date", toStr)
                    .gte("end_date", fromStr);
                if (error) throw error;
                const booked = Array.isArray(data)
                    ? data.reduce((s, r) => s + Number(r.quantity || 0), 0)
                    : 0;
                const rem = Math.max(0, (Number(quantity) || 1) - booked);
                setRemaining(rem);
                setRequestedUnits((prev) =>
                    Math.min(Math.max(1, prev || 1), rem || 1)
                );
            } finally {
                setAvailabilityLoading(false);
            }
        })();
    }, [open, item?.item_id, range.from, range.to, quantity]);

    const daysCount = useMemo(() => {
        if (!range.from || !range.to) return 0;
        const ms =
            range.to.setHours(0, 0, 0, 0) - range.from.setHours(0, 0, 0, 0);
        return Math.floor(ms / (1000 * 60 * 60 * 24)) + 1;
    }, [range]);

    const total = useMemo(() => {
        const price = Number(item?.price_per_day || 0);
        const deposit = Number(item?.deposit_fee || 0);
        const units = Number(requestedUnits || 1);
        return price * daysCount * units + deposit * units;
    }, [item?.price_per_day, item?.deposit_fee, daysCount, requestedUnits]);

    const formatDate = (d) => {
        if (!d) return null;
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        return `${y}-${m}-${day}`;
    };

    useEffect(() => {
        if (!open || !item?.item_id) return;
        (async () => {
            try {
                setReviewsLoading(true);
                setReviewsError("");
                const { data, error } = await supabase
                    .from("reviews")
                    .select("rating, comment, created_at")
                    .eq("item_id", item.item_id)
                    .order("created_at", { ascending: false })
                    .limit(10);
                if (error) throw error;
                setReviews(data || []);
            } catch (e) {
                setReviews([]);
                setReviewsError("Failed to load reviews.");
            } finally {
                setReviewsLoading(false);
            }
        })();
    }, [open, item?.item_id]);

    const averageRating = useMemo(() => {
        if (!reviews || reviews.length === 0) return 0;
        const sum = reviews.reduce((s, r) => s + Number(r.rating || 0), 0);
        return sum / reviews.length;
    }, [reviews]);

    const StarRow = ({ value, className = "" }) => {
        const full = Math.round(value);
        return (
            <div
                className={`flex items-center gap-0.5 ${className}`}
                aria-label={`${value.toFixed(1)} out of 5`}
            >
                {Array.from({ length: 5 }).map((_, i) => (
                    <span
                        key={i}
                        className={
                            i < full ? "text-yellow-500" : "text-gray-300"
                        }
                    >
                        ★
                    </span>
                ))}
            </div>
        );
    };

    const isOwner =
        currentUserId && item?.user_id && currentUserId === item.user_id;
    const canSubmit =
        !loading &&
        !isOwner &&
        daysCount > 0 &&
        !!currentUserId &&
        (remaining === null ||
            (remaining > 0 &&
                requestedUnits >= 1 &&
                requestedUnits <= remaining));

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
        const startMidnight = new Date(range.from);
        startMidnight.setHours(0, 0, 0, 0);
        if (startMidnight < today) {
            setErrorMsg("Start date cannot be in the past.");
            return;
        }
        try {
            setLoading(true);
            const base = {
                item_id: item.item_id,
                renter_id: currentUserId,
                start_date: formatDate(range.from),
                end_date: formatDate(range.to),
            };
            const unitsToBook = Math.max(
                1,
                Math.min(requestedUnits || 1, remaining || 1)
            );
            const perUnitCost =
                Number(item?.price_per_day || 0) * daysCount +
                Number(item?.deposit_fee || 0);
            const total_cost = perUnitCost * unitsToBook;
            const row = {
                ...base,
                quantity: unitsToBook,
                total_cost,
            };
            const { error } = await supabase
                .from("rental_transactions")
                .insert(row);
            if (error) {
                setErrorMsg(
                    "Booking could not be created. The selected dates may be fully booked."
                );
                throw error;
            }
            onBooked?.();
            onOpenChange(false);
        } catch (e) {
            if (!errorMsg)
                setErrorMsg("Failed to submit booking. Please try again.");
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

                <div className="flex-1 overflow-y-auto p-4 min-h-0 space-y-4">
                    {/* Item details first */}
                    <div className="flex flex-col md:flex-row gap-4 md:gap-6">
                        {imageLoading ? (
                            <Skeleton className="w-full md:w-64 h-44 md:h-44 rounded-md" />
                        ) : imageUrl ? (
                            <img
                                src={imageUrl}
                                alt={item?.title || "Item image"}
                                className="w-full md:w-64 h-44 md:h-44 object-cover rounded-md border cursor-zoom-in"
                                onClick={() => {
                                    if (imageUrl)
                                        window.open(
                                            imageUrl,
                                            "_blank",
                                            "noopener,noreferrer"
                                        );
                                }}
                                title="Click to view full image"
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
                            {item?.description && (
                                <div className="col-span-2">
                                    <p className="text-sm text-gray-600">
                                        Description
                                    </p>
                                    <p className="text-sm leading-relaxed whitespace-pre-line">
                                        {item.description}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Average rating */}
                    <div className="p-4 border rounded-md bg-white">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <StarRow value={averageRating} />
                                <span className="text-sm text-gray-700">
                                    {reviews && reviews.length > 0
                                        ? `${averageRating.toFixed(1)} / 5 · ${
                                              reviews.length
                                          } review${
                                              reviews.length > 1 ? "s" : ""
                                          }`
                                        : "No reviews yet"}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Reviews list */}
                    <div className="p-4 border rounded-md bg-white">
                        <p className="font-medium mb-2">User reviews</p>
                        {reviewsLoading ? (
                            <div className="space-y-2">
                                <Skeleton className="h-4 w-1/3" />
                                <Skeleton className="h-4 w-2/3" />
                                <Skeleton className="h-4 w-1/2" />
                            </div>
                        ) : reviewsError ? (
                            <p className="text-sm text-red-600">
                                {reviewsError}
                            </p>
                        ) : reviews && reviews.length > 0 ? (
                            <div className="space-y-4">
                                {reviews.map((r, idx) => (
                                    <div
                                        key={idx}
                                        className="border-b last:border-b-0 pb-3 last:pb-0"
                                    >
                                        <div className="flex items-center justify-between">
                                            <StarRow
                                                value={Number(r.rating || 0)}
                                                className="text-base"
                                            />
                                            <span className="text-xs text-gray-500">
                                                {r.created_at
                                                    ? new Date(
                                                          r.created_at
                                                      ).toLocaleDateString()
                                                    : ""}
                                            </span>
                                        </div>
                                        {r.comment && (
                                            <p className="text-sm mt-1 whitespace-pre-line">
                                                {r.comment}
                                            </p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-gray-600">
                                No reviews yet for this item.
                            </p>
                        )}
                    </div>

                    <Separator />

                    {/* Booking form below reviews */}
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
                                <div className="flex justify-between">
                                    <span>Units involved</span>
                                    <span>{requestedUnits || 1}</span>
                                </div>
                                <div className="flex items-center justify-between gap-2 mt-1">
                                    <label className="text-sm">
                                        Units to book
                                    </label>
                                    <input
                                        type="number"
                                        min={1}
                                        max={Math.max(1, remaining || 1)}
                                        value={requestedUnits}
                                        onChange={(e) => {
                                            const v = Number(
                                                e.target.value || 1
                                            );
                                            const max = Math.max(
                                                1,
                                                remaining || 1
                                            );
                                            setRequestedUnits(
                                                Math.min(Math.max(1, v), max)
                                            );
                                        }}
                                        disabled={
                                            !range.from ||
                                            !range.to ||
                                            availabilityLoading ||
                                            (remaining ?? 0) <= 0
                                        }
                                        className="w-24 border rounded px-2 py-1 text-right"
                                    />
                                </div>
                                <Separator className="my-2" />
                                <div className="flex justify-between">
                                    <span>Subtotal</span>
                                    <span>
                                        ₱
                                        {(
                                            Number(item?.price_per_day || 0) *
                                            daysCount *
                                            (requestedUnits || 1)
                                        ).toFixed(2)}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Deposit</span>
                                    <span>
                                        ₱
                                        {(
                                            Number(item?.deposit_fee || 0) *
                                            (requestedUnits || 1)
                                        ).toFixed(2)}
                                    </span>
                                </div>
                                <div className="flex justify-between text-base font-semibold mt-1">
                                    <span>Total</span>
                                    <span>₱{total.toFixed(2)}</span>
                                </div>
                            </div>
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
                                        <div className="flex items-center justify-between">
                                            <span>Rating</span>
                                            <span className="flex items-center gap-2">
                                                <StarRow
                                                    value={
                                                        ownerRating.average || 0
                                                    }
                                                />
                                                <span className="text-xs text-gray-600">
                                                    {ownerRatingLoading
                                                        ? "Loading..."
                                                        : `(${
                                                              ownerRating.count
                                                          } ${
                                                              ownerRating.count ===
                                                              1
                                                                  ? "review"
                                                                  : "reviews"
                                                          })`}
                                                </span>
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
                                    <div className="mt-3 flex flex-wrap justify-end gap-2 w-full">
                                        <ReportDialog
                                            trigger={
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="cursor-pointer"
                                                >
                                                    Report Item
                                                </Button>
                                            }
                                            senderId={currentUserId}
                                            targetItemId={item.item_id}
                                            rentalId={null}
                                            title="Report Item"
                                            description="Describe the issue with this listing."
                                        />
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="cursor-pointer"
                                            onClick={() => {
                                                navigate(
                                                    `/profile/${owner.id}`
                                                );
                                            }}
                                        >
                                            View Owner Profile
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
