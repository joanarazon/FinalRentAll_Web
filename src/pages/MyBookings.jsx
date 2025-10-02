import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import TopMenu from "@/components/topMenu";
import { useUser } from "@/hooks/useUser";
import { supabase } from "../../supabaseClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToastApi } from "@/components/ui/toast";
import { Separator } from "@/components/ui/separator";
import Loading from "@/components/Loading";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from "@/components/ui/dialog";
import { getExistingLessorReview, saveLessorReview } from "@/lib/reviews";
import ReportDialog from "@/components/ReportDialog";
import { Badge } from "@/components/ui/badge";
import { Clock } from "lucide-react";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { BookingSteps, ProgressLegend } from "@/components/shared/BookingSteps";
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

const PROOF_BUCKET = "proof-of-deposit"; // storage bucket for deposit proofs

export default function MyBookings() {
    const user = useUser();
    const [loading, setLoading] = useState(true);
    const [rows, setRows] = useState([]);
    const [search, setSearch] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("");
    const [categories, setCategories] = useState([]); // {category_id, name}
    const toast = useToastApi();
    const navigate = useNavigate();

    useEffect(() => {
        if (!user?.id) return;
        (async () => {
            try {
                setLoading(true);
                const { data, error } = await supabase
                    .from("rental_transactions")
                    .select(
                        `rental_id,item_id,start_date,end_date,total_cost,status,quantity,proof_of_deposit_url,
             renter:renter_id ( first_name, last_name ),
             items (
               title,
               main_image_url,
               user_id,
               category_id,
               owner:users ( first_name, last_name )
             )`
                    )
                    .eq("renter_id", user.id)
                    .order("created_at", { ascending: false });
                if (error) throw error;
                setRows(data || []);
                // Load categories (once) if not yet loaded
                try {
                    const { data: cats } = await supabase
                        .from("categories")
                        .select("category_id,name")
                        .order("name", { ascending: true });
                    setCategories(cats || []);
                } catch {
                    /* ignore */
                }
            } finally {
                setLoading(false);
            }
        })();
    }, [user?.id]);

    const grouped = useMemo(() => {
        const by = {
            pending: [],
            awaitingDeposit: [], // confirmed
            awaitingOwnerConfirmDeposit: [], // deposit_submitted
            onTheWay: [], // on_the_way
            ongoing: [], // ongoing
            awaitingOwnerConfirmReturn: [], // awaiting_owner_confirmation
            completed: [],
            expired: [],
            cancelled: [],
        };
        for (const r of rows) {
            const st = String(r.status || "");
            if (st === "completed") by.completed.push(r);
            else if (st === "expired") by.expired.push(r);
            else if (st === "cancelled" || st === "rejected")
                by.cancelled.push(r);
            else if (st === "pending") by.pending.push(r);
            else if (st === "confirmed") by.awaitingDeposit.push(r);
            else if (st === "deposit_submitted")
                by.awaitingOwnerConfirmDeposit.push(r);
            else if (st === "on_the_way") by.onTheWay.push(r);
            else if (st === "ongoing") by.ongoing.push(r);
            else if (st === "awaiting_owner_confirmation")
                by.awaitingOwnerConfirmReturn.push(r);
        }
        const term = search.trim().toLowerCase();
        const activeCategory = (categoryFilter || "").trim();
        const filter = (arr) =>
            arr.filter((r) => {
                const titleOk = term
                    ? r.items?.title?.toLowerCase().includes(term)
                    : true;
                const catOk = activeCategory
                    ? String(r.items?.category_id || "") === activeCategory
                    : true;
                return titleOk && catOk;
            });
        return {
            pending: filter(by.pending),
            awaitingDeposit: filter(by.awaitingDeposit),
            awaitingOwnerConfirmDeposit: filter(by.awaitingOwnerConfirmDeposit),
            onTheWay: filter(by.onTheWay),
            ongoing: filter(by.ongoing),
            awaitingOwnerConfirmReturn: filter(by.awaitingOwnerConfirmReturn),
            completed: filter(by.completed),
            expired: filter(by.expired),
            cancelled: filter(by.cancelled),
        };
    }, [rows, search, categoryFilter]);

    if (!user) return null;

    return (
        <div className="min-h-screen bg-[#FFFBF2]">
            <TopMenu
                activePage="my-bookings"
                searchTerm={search}
                setSearchTerm={setSearch}
            />
            <div className="max-w-5xl mx-auto p-4 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
                    <h2 className="text-2xl font-semibold">My Bookings</h2>
                    <div className="flex items-center gap-2">
                        <label className="text-sm text-gray-600">
                            Category
                        </label>
                        <select
                            className="border rounded px-2 py-1 text-sm bg-white"
                            value={categoryFilter}
                            onChange={(e) => setCategoryFilter(e.target.value)}
                        >
                            <option value="">All</option>
                            {categories.map((c) => (
                                <option
                                    key={c.category_id}
                                    value={String(c.category_id)}
                                >
                                    {c.name}
                                </option>
                            ))}
                        </select>
                        {categoryFilter && (
                            <Button
                                variant="outline"
                                size="sm"
                                className="cursor-pointer"
                                onClick={() => setCategoryFilter("")}
                            >
                                Clear
                            </Button>
                        )}
                    </div>
                </div>
                {/* {loading ? <Loading /> : ( */}
                <div className="space-y-6">
                    <div className="border bg-white/60 rounded-md p-3">
                        <div className="flex items-center justify-between gap-3 flex-wrap">
                            <span className="text-sm font-medium text-gray-700">
                                Booking progress
                            </span>
                            <ProgressLegend />
                        </div>
                    </div>
                    <Section
                        title="Pending"
                        data={grouped.pending}
                        user={user}
                        onChanged={() => {
                            (async () => {
                                try {
                                    setLoading(true);
                                    const { data, error } = await supabase
                                        .from("rental_transactions")
                                        .select(
                                            `rental_id,item_id,start_date,end_date,total_cost,status,quantity,proof_of_deposit_url,
                       renter:renter_id ( first_name, last_name ),
                       items (
                         title,
                         main_image_url,
                         user_id,
                         category_id,
                         owner:users ( first_name, last_name )
                       )`
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
                    <Section
                        title="Awaiting Deposit"
                        data={grouped.awaitingDeposit}
                        user={user}
                        tip="Upload your deposit to proceed."
                        onChanged={() => {
                            (async () => {
                                try {
                                    setLoading(true);
                                    const { data, error } = await supabase
                                        .from("rental_transactions")
                                        .select(
                                            `rental_id,item_id,start_date,end_date,total_cost,status,quantity,proof_of_deposit_url,
                       renter:renter_id ( first_name, last_name ),
                       items (
                         title,
                         main_image_url,
                         user_id,
                         category_id,
                         owner:users ( first_name, last_name )
                       )`
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
                    <Section
                        title="Awaiting Owner Confirmation"
                        data={grouped.awaitingOwnerConfirmDeposit}
                        user={user}
                        onChanged={() => {
                            (async () => {
                                try {
                                    setLoading(true);
                                    const { data, error } = await supabase
                                        .from("rental_transactions")
                                        .select(
                                            `rental_id,item_id,start_date,end_date,total_cost,status,quantity,proof_of_deposit_url,
                       renter:renter_id ( first_name, last_name ),
                       items (
                         title,
                         main_image_url,
                         user_id,
                         category_id,
                         owner:users ( first_name, last_name )
                       )`
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
                    <Section
                        title="On The Way"
                        data={grouped.onTheWay}
                        user={user}
                        onChanged={() => {
                            (async () => {
                                try {
                                    setLoading(true);
                                    const { data, error } = await supabase
                                        .from("rental_transactions")
                                        .select(
                                            `rental_id,item_id,start_date,end_date,total_cost,status,quantity,proof_of_deposit_url,
                       renter:renter_id ( first_name, last_name ),
                       items (
                         title,
                         main_image_url,
                         user_id,
                         category_id,
                         owner:users ( first_name, last_name )
                       )`
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
                    <Section
                        title="Ongoing"
                        data={grouped.ongoing}
                        user={user}
                        onChanged={() => {
                            (async () => {
                                try {
                                    setLoading(true);
                                    const { data, error } = await supabase
                                        .from("rental_transactions")
                                        .select(
                                            `rental_id,item_id,start_date,end_date,total_cost,status,quantity,proof_of_deposit_url,
                       renter:renter_id ( first_name, last_name ),
                       items (
                         title,
                         main_image_url,
                         user_id,
                         category_id,
                         owner:users ( first_name, last_name )
                       )`
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
                    <Section
                        title="Awaiting Return Confirmation"
                        data={grouped.awaitingOwnerConfirmReturn}
                        user={user}
                        onChanged={() => {
                            (async () => {
                                try {
                                    setLoading(true);
                                    const { data, error } = await supabase
                                        .from("rental_transactions")
                                        .select(
                                            `rental_id,item_id,start_date,end_date,total_cost,status,quantity,proof_of_deposit_url,
                       renter:renter_id ( first_name, last_name ),
                       items (
                         title,
                         main_image_url,
                         user_id,
                         category_id,
                         owner:users ( first_name, last_name )
                       )`
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
                    <Section
                        title="Completed"
                        data={grouped.completed}
                        user={user}
                    />
                    <Separator />
                    <Section
                        title="Expired"
                        data={grouped.expired}
                        user={user}
                    />
                    <Separator />
                    <Section
                        title="Cancelled / Rejected"
                        data={grouped.cancelled}
                        user={user}
                    />
                </div>
                {/* )} */}
            </div>
        </div>
    );
}

function Section({ title, data, onChanged, user, tip }) {
    return (
        <div>
            <div className="flex items-center gap-2 mb-3">
                <h3 className="text-xl font-medium">{title}</h3>
                <Badge
                    variant="secondary"
                    className="bg-amber-100 text-amber-800 border-amber-200"
                >
                    {data?.length || 0}
                </Badge>
            </div>
            {tip ? <p className="text-xs text-gray-600 mb-3">{tip}</p> : null}
            {!data || data.length === 0 ? (
                <div className="text-sm text-gray-600 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <span>No {title.toLowerCase()} bookings.</span>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {data.map((r) => (
                        <Card key={r.rental_id}>
                            <CardHeader className="pb-2">
                                <div className="flex items-start justify-between gap-3">
                                    <CardTitle className="text-base flex items-center gap-3">
                                        <ImagePreviewThumb
                                            src={r.items?.main_image_url}
                                            alt={r.items?.title}
                                        />
                                        <span className="line-clamp-1">
                                            {r.items?.title || "Item"}
                                        </span>
                                    </CardTitle>
                                    <StatusBadge status={r.status} />
                                </div>
                            </CardHeader>
                            <CardContent className="text-sm space-y-2">
                                <BookingSteps status={String(r.status || "")} />
                                <div className="grid grid-cols-2 gap-y-1">
                                    <div className="text-gray-600">Start</div>
                                    <div>
                                        {new Date(
                                            r.start_date
                                        ).toLocaleDateString()}
                                    </div>
                                    <div className="text-gray-600">End</div>
                                    <div>
                                        {new Date(
                                            r.end_date
                                        ).toLocaleDateString()}
                                    </div>
                                    <div className="text-gray-600">Owner</div>
                                    <div>
                                        {r.items?.owner?.first_name || ""}{" "}
                                        {r.items?.owner?.last_name || ""}
                                    </div>
                                    <div className="text-gray-600">Units</div>
                                    <div>{Number(r.quantity || 1)}</div>
                                    <div className="text-gray-600">Total</div>
                                    <div>
                                        ₱{Number(r.total_cost || 0).toFixed(2)}
                                    </div>
                                </div>
                                <ActionBar
                                    title={title}
                                    rental={r}
                                    user={user}
                                    onChanged={onChanged}
                                />
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}

function ActionBar({ title, rental, user, onChanged }) {
    // Decide the primary action based on section and status
    let primary = null;
    if (title === "Pending") {
        primary = (
            <CancelBooking rental={rental} onChanged={onChanged} user={user} />
        );
    } else if (title === "Awaiting Deposit") {
        if (rental.status === "confirmed") {
            primary = <UploadDeposit rental={rental} onChanged={onChanged} />;
        }
    } else if (title === "Awaiting Owner Confirmation") {
        if (rental.status === "deposit_submitted") {
            primary = <ViewDepositProof rental={rental} />;
        }
    } else if (title === "On The Way") {
        primary = <MarkReceived rental={rental} onChanged={onChanged} />;
    } else if (title === "Ongoing") {
        if (isEligibleReturn(rental)) {
            primary = <MarkReturned rental={rental} onChanged={onChanged} />;
        }
    } else if (title === "Completed") {
        primary = <RateLessorButton rental={rental} />;
    }

    return (
        <div className="pt-2 flex items-center justify-between gap-2 flex-wrap">
            <div className="flex gap-2">
                {primary}
                <DetailsModal rental={rental} user={user} />
            </div>
            <MoreMenu rental={rental} user={user} onChanged={onChanged} />
        </div>
    );
}

function MoreMenu({ rental, user, onChanged }) {
    const navigate = useNavigate();
    const ownerId = rental?.items?.user_id;
    const [openUpload, setOpenUpload] = useState(false);
    const [file, setFile] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const toast = useToastApi();

    const doUpload = async (e) => {
        e?.preventDefault?.();
        if (!file) return;
        try {
            setSubmitting(true);
            const ext = file.name.split(".").pop();
            const path = `${rental.rental_id}/${Date.now()}.${ext}`;
            const { error: upErr } = await supabase.storage
                .from(PROOF_BUCKET)
                .upload(path, file, {
                    cacheControl: "3600",
                    upsert: false,
                    contentType: file.type || "application/octet-stream",
                });
            if (upErr) throw upErr;
            const { error } = await supabase
                .from("rental_transactions")
                .update({
                    proof_of_deposit_url: path,
                    status: "deposit_submitted",
                })
                .eq("rental_id", rental.rental_id)
                .eq("status", "confirmed");
            if (error) throw error;
            toast.success("Deposit uploaded. Waiting for owner verification.");
            setOpenUpload(false);
            setFile(null);
            onChanged && onChanged();
        } catch (err) {
            toast.error(err.message || "Upload failed");
        } finally {
            setSubmitting(false);
        }
    };

    const openProof = async () => {
        const url = rental?.proof_of_deposit_url;
        if (!url) return;
        try {
            if (/^https?:\/\//i.test(url)) {
                window.open(url, "_blank");
                return;
            }
            const { data, error } = await supabase.storage
                .from(PROOF_BUCKET)
                .createSignedUrl(url, 300);
            if (error) throw error;
            window.open(data.signedUrl, "_blank");
        } catch (e) {
            toast.error(e.message || "Could not open proof");
        }
    };
    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="outline"
                        size="sm"
                        className="cursor-pointer"
                    >
                        More
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuItem
                        onSelect={(e) => {
                            e.preventDefault();
                            if (ownerId) navigate(`/profile/${ownerId}`);
                        }}
                    >
                        View owner profile
                    </DropdownMenuItem>
                    {String(rental.status) === "confirmed" && (
                        <DropdownMenuItem
                            onSelect={(e) => {
                                e.preventDefault();
                                setOpenUpload(true);
                            }}
                        >
                            Upload deposit
                        </DropdownMenuItem>
                    )}
                    {String(rental.status) === "deposit_submitted" && (
                        <DropdownMenuItem
                            onSelect={(e) => {
                                e.preventDefault();
                                openProof();
                            }}
                        >
                            View deposit
                        </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <ReportDialog
                        trigger={
                            <DropdownMenuItem>Report owner</DropdownMenuItem>
                        }
                        senderId={rental?.renter?.id || user?.id}
                        targetUserId={ownerId}
                        rentalId={rental.rental_id}
                        title="Report Owner"
                        description="Describe your issue with the owner for this booking."
                    />
                </DropdownMenuContent>
            </DropdownMenu>
            <Dialog open={openUpload} onOpenChange={setOpenUpload}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Upload deposit proof</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={doUpload} className="space-y-3">
                        <input
                            type="file"
                            accept="image/*,application/pdf"
                            onChange={(e) =>
                                setFile(e.target.files?.[0] || null)
                            }
                        />
                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                className="cursor-pointer"
                                onClick={() => setOpenUpload(false)}
                                disabled={submitting}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={!file || submitting}
                            >
                                {submitting ? "Uploading…" : "Submit"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
}

function CancelBooking({ rental, onChanged, user }) {
    const [open, setOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const toast = useToastApi();
    const doCancel = async () => {
        if (!rental?.rental_id) return;
        try {
            setSubmitting(true);
            const { error } = await supabase
                .from("rental_transactions")
                .update({ status: "cancelled" })
                .eq("rental_id", rental.rental_id)
                .eq("renter_id", user?.id)
                .eq("status", "pending");
            if (error) throw error;
            toast.success("Booking cancelled");
            setOpen(false);
            onChanged && onChanged();
        } catch (e) {
            toast.error(e.message || "Could not cancel booking");
        } finally {
            setSubmitting(false);
        }
    };
    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="cursor-pointer">
                    Cancel
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Cancel booking request?</DialogTitle>
                </DialogHeader>
                <div className="text-sm text-gray-700 space-y-2">
                    <p>
                        This will withdraw your request for
                        <span className="font-medium">
                            {" "}
                            {rental.items?.title}
                        </span>
                        .
                    </p>
                    <div className="grid grid-cols-2">
                        <span className="text-gray-600">Dates</span>
                        <span>
                            {new Date(rental.start_date).toLocaleDateString()} —{" "}
                            {new Date(rental.end_date).toLocaleDateString()}
                        </span>
                    </div>
                    <p className="text-xs text-gray-500">
                        This action cannot be undone.
                    </p>
                </div>
                <DialogFooter>
                    <Button
                        type="button"
                        variant="outline"
                        className="cursor-pointer"
                        onClick={() => setOpen(false)}
                        disabled={submitting}
                    >
                        Keep Booking
                    </Button>
                    <Button
                        type="button"
                        variant="destructive"
                        className="cursor-pointer"
                        onClick={doCancel}
                        disabled={submitting}
                    >
                        {submitting ? "Cancelling…" : "Confirm Cancel"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function isEligibleReturn(rental) {
    if (!rental) return false;
    const now = new Date();
    const end = new Date(rental.end_date);
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

function RateLessorButton({ rental }) {
    const user = useUser();
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [existing, setExisting] = useState(null);
    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState("");
    const toast = useToastApi();

    useEffect(() => {
        if (!open) return;
        (async () => {
            try {
                setLoading(true);
                const data = await getExistingLessorReview(
                    rental.rental_id,
                    user?.id
                );
                setExisting(data);
                setRating(Number(data?.rating || 0));
                setComment(data?.comment || "");
            } catch (e) {
                // ignore
            } finally {
                setLoading(false);
            }
        })();
    }, [open, rental?.rental_id, user?.id]);

    const submit = async (e) => {
        e?.preventDefault?.();
        if (!user?.id) return;
        if (!rating) return;
        try {
            setLoading(true);
            const { updated } = await saveLessorReview({
                rentalId: rental.rental_id,
                reviewerId: user.id,
                rating,
                comment,
            });
            toast.success(updated ? "Review updated" : "Review submitted");
            setOpen(false);
        } catch (err) {
            toast.error(err.message || "Could not save review");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="cursor-pointer">
                    {existing ? "Edit review" : "Rate lessor"}
                </Button>
            </DialogTrigger>
            <DialogContent title="Rate lessor">
                <DialogHeader>
                    <DialogTitle>Rate lessor</DialogTitle>
                </DialogHeader>
                <form onSubmit={submit} className="space-y-3">
                    <div className="flex items-center gap-2">
                        {[1, 2, 3, 4, 5].map((n) => (
                            <button
                                type="button"
                                key={n}
                                onClick={() => setRating(n)}
                                className={`w-8 h-8 rounded-full border flex items-center justify-center ${
                                    n <= rating
                                        ? "bg-yellow-400 border-yellow-500"
                                        : "bg-white border-gray-300"
                                }`}
                                aria-label={`${n} star`}
                            >
                                {n}
                            </button>
                        ))}
                    </div>
                    <textarea
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        placeholder="Optional comment"
                        className="w-full border rounded p-2 text-sm"
                        rows={3}
                    />
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            className="cursor-pointer"
                            onClick={() => setOpen(false)}
                            disabled={loading}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading || !rating}>
                            {loading
                                ? "Saving..."
                                : existing
                                ? "Update"
                                : "Submit"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

function ImagePreviewThumb({ src, alt }) {
    const imgSrc = src || "/vite.svg";
    return (
        <Dialog>
            <DialogTrigger asChild>
                <img
                    src={imgSrc}
                    alt={alt || "Item"}
                    className="w-12 h-12 object-cover rounded-md border cursor-pointer"
                    onError={(e) => (e.currentTarget.style.display = "none")}
                />
            </DialogTrigger>
            <DialogContent className="max-w-2xl p-0">
                <img
                    src={imgSrc}
                    alt={alt || "Item"}
                    className="w-full h-auto rounded-md"
                />
            </DialogContent>
        </Dialog>
    );
}

function DetailsModal({ rental, user }) {
    const [open, setOpen] = useState(false);
    const [unitsCount, setUnitsCount] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        if (!open) return;
        // Units involved is simply this row's quantity per schema
        setUnitsCount(Number(rental.quantity ?? 1));
    }, [open, rental.quantity]);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="cursor-pointer">
                    View Details
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>
                        {rental.items?.title || "Item Details"}
                    </DialogTitle>
                </DialogHeader>
                {/* Preview */}
                <div className="mb-3">
                    <img
                        src={rental.items?.main_image_url || "/vite.svg"}
                        alt={rental.items?.title || "Item"}
                        className="w-full h-40 object-cover rounded-md border"
                        onError={(e) =>
                            (e.currentTarget.style.display = "none")
                        }
                    />
                </div>
                <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                        <span>Owner</span>
                        <span>
                            {rental.items?.owner?.first_name || ""}{" "}
                            {rental.items?.owner?.last_name || ""}
                        </span>
                    </div>
                    <div className="flex justify-between">
                        <span>Renter</span>
                        <span>
                            {rental.renter?.first_name || "You"}{" "}
                            {rental.renter?.last_name || ""}
                        </span>
                    </div>
                    <Separator />
                    <div className="flex justify-between">
                        <span>Start</span>
                        <span>
                            {new Date(rental.start_date).toLocaleDateString()}
                        </span>
                    </div>
                    <div className="flex justify-between">
                        <span>End</span>
                        <span>
                            {new Date(rental.end_date).toLocaleDateString()}
                        </span>
                    </div>
                    <div className="flex justify-between">
                        <span>Units</span>
                        <span>{unitsCount ?? "—"}</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <span>Status</span>
                        <StatusBadge status={rental.status} />
                    </div>
                    <div className="flex justify-between">
                        <span>Total</span>
                        <span>
                            ₱{Number(rental.total_cost || 0).toFixed(2)}
                        </span>
                    </div>
                    <div className="flex justify-between">
                        <span>Progress</span>
                        <span className="text-gray-500">&nbsp;</span>
                    </div>
                    <BookingSteps
                        status={String(rental.status || "")}
                        compact
                    />
                </div>
                <DialogFooter className="flex items-center justify-between">
                    <Button
                        type="button"
                        variant="outline"
                        className="cursor-pointer"
                        onClick={() => {
                            const ownerId = rental?.items?.user_id;
                            if (ownerId) navigate(`/profile/${ownerId}`);
                        }}
                    >
                        View Owner Profile
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        className="cursor-pointer"
                        onClick={() => setOpen(false)}
                    >
                        Close
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// Renter action: upload deposit proof when status is confirmed
function UploadDeposit({ rental, onChanged }) {
    const [open, setOpen] = useState(false);
    const [file, setFile] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const toast = useToastApi();

    const handleUpload = async (e) => {
        e?.preventDefault?.();
        if (!file) return;
        try {
            setSubmitting(true);
            const ext = file.name.split(".").pop();
            const path = `${rental.rental_id}/${Date.now()}.${ext}`;
            const { error: upErr } = await supabase.storage
                .from(PROOF_BUCKET)
                .upload(path, file, {
                    cacheControl: "3600",
                    upsert: false,
                    contentType: file.type || "application/octet-stream",
                });
            if (upErr) throw upErr;
            const { error } = await supabase
                .from("rental_transactions")
                .update({
                    // store storage key; UI will generate signed URL on demand
                    proof_of_deposit_url: path,
                    status: "deposit_submitted",
                })
                .eq("rental_id", rental.rental_id)
                .eq("status", "confirmed");
            if (error) throw error;
            toast.success("Deposit uploaded. Waiting for owner verification.");
            setOpen(false);
            onChanged && onChanged();
        } catch (err) {
            toast.error(err.message || "Upload failed");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size="sm" className="cursor-pointer">
                    Upload Deposit
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Upload deposit proof</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleUpload} className="space-y-3">
                    <input
                        type="file"
                        accept="image/*,application/pdf"
                        onChange={(e) => setFile(e.target.files?.[0] || null)}
                    />
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            className="cursor-pointer"
                            onClick={() => setOpen(false)}
                            disabled={submitting}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={!file || submitting}>
                            {submitting ? "Uploading…" : "Submit"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

// Renter: view deposit proof when submitted
function ViewDepositProof({ rental }) {
    const url = rental?.proof_of_deposit_url;
    if (!url) return null;
    const openProof = async () => {
        try {
            if (/^https?:\/\//i.test(url)) {
                window.open(url, "_blank");
                return;
            }
            const { data, error } = await supabase.storage
                .from(PROOF_BUCKET)
                .createSignedUrl(url, 300);
            if (error) throw error;
            window.open(data.signedUrl, "_blank");
        } catch (e) {
            alert(e.message || "Could not open proof");
        }
    };
    return (
        <Button
            size="sm"
            variant="outline"
            className="cursor-pointer"
            onClick={openProof}
        >
            View Deposit
        </Button>
    );
}

// Renter: mark item received to transition on_the_way -> ongoing
function MarkReceived({ rental, onChanged }) {
    const [loading, setLoading] = useState(false);
    const toast = useToastApi();
    const doMark = async () => {
        try {
            setLoading(true);
            const { error } = await supabase
                .from("rental_transactions")
                .update({ status: "ongoing" })
                .eq("rental_id", rental.rental_id)
                .eq("status", "on_the_way");
            if (error) throw error;
            toast.success("Marked as received. Enjoy your rental!");
            onChanged && onChanged();
        } catch (e) {
            toast.error(e.message || "Could not update");
        } finally {
            setLoading(false);
        }
    };
    return (
        <Button
            size="sm"
            onClick={doMark}
            disabled={loading}
            className="cursor-pointer"
        >
            {loading ? "Updating…" : "Mark Delivered"}
        </Button>
    );
}
