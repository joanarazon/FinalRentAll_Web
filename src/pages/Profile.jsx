import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useUserContext } from "@/context/UserContext.jsx";
import { supabase } from "../../supabaseClient";
import { useToastApi } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Camera,
    EllipsisVertical,
    Pencil,
    Plus,
    Minus,
    Trash2,
    ExternalLink,
} from "lucide-react";
import TopMenu from "@/components/topMenu";
import { ChevronLeft } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { getLessorRatingStats } from "@/lib/reviews";
import BookItemModal from "@/components/BookItemModal";
import ReportDialog from "@/components/ReportDialog";
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

export default function Profile() {
    const { user: authUser, loading } = useUserContext();
    const [search, setSearch] = useState("");
    const navigate = useNavigate();
    const toast = useToastApi();
    const params = useParams();

    const profileUserId = params?.id || authUser?.id || null;
    const isOwnProfile = authUser?.id && profileUserId === authUser.id;

    const [profile, setProfile] = useState(null);
    const [loadingProfile, setLoadingProfile] = useState(true);
    const [items, setItems] = useState([]);
    const [loadingItems, setLoadingItems] = useState(false);
    const [rating, setRating] = useState({ average: 0, count: 0 });
    const [loadingRating, setLoadingRating] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [rentOpen, setRentOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);

    const initials = useMemo(() => {
        const f = (profile?.first_name || "").trim();
        const l = (profile?.last_name || "").trim();
        return `${f[0] || ""}${l[0] || ""}`.toUpperCase() || "U";
    }, [profile]);

    const onUploadFace = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!authUser?.id || !isOwnProfile) {
            toast.error("No user context");
            return;
        }
        try {
            setUploading(true);
            const picPath = `${authUser.id}/profile/${Date.now()}_${file.name}`;
            const { error: upErr } = await supabase.storage
                .from("user-profile-pic")
                .upload(picPath, file, { upsert: false });
            if (upErr) throw upErr;
            const { data: pub } = supabase.storage
                .from("user-profile-pic")
                .getPublicUrl(picPath);
            const publicUrl = pub?.publicUrl;
            if (!publicUrl) throw new Error("Could not get public URL");

            const { error: updErr } = await supabase
                .from("users")
                .update({ profile_pic_url: publicUrl })
                .eq("id", authUser.id);
            if (updErr) throw updErr;
            toast.success("Profile picture updated");
            // Refresh local profile
            setProfile((p) => ({ ...(p || {}), profile_pic_url: publicUrl }));
        } catch (err) {
            console.error("Upload error:", err);
            toast.error("Failed to upload: " + err.message);
        } finally {
            setUploading(false);
        }
    };

    const loadProfile = useCallback(async () => {
        if (!profileUserId) return;
        try {
            setLoadingProfile(true);
            const { data, error } = await supabase
                .from("users")
                .select(
                    "id, first_name, last_name, phone, created_at, profile_pic_url"
                )
                .eq("id", profileUserId)
                .single();
            if (error) throw error;
            setProfile(data);
        } catch (e) {
            toast.error("Failed to load profile");
        } finally {
            setLoadingProfile(false);
        }
    }, [profileUserId]);

    const getImageUrl = async (userId, itemId) => {
        try {
            const dir = `${userId}/${itemId}`;
            const { data: files, error } = await supabase.storage
                .from("Items-photos")
                .list(dir, {
                    limit: 1,
                    sortBy: { column: "name", order: "desc" },
                });
            if (error || !files || files.length === 0) return undefined;
            const fullPath = `${dir}/${files[0].name}`;
            const { data: pub } = supabase.storage
                .from("Items-photos")
                .getPublicUrl(fullPath);
            return pub?.publicUrl;
        } catch {
            return undefined;
        }
    };

    const loadItems = useCallback(async () => {
        if (!profileUserId) return;
        setLoadingItems(true);
        try {
            let query = supabase
                .from("items")
                .select(
                    "item_id,user_id,title,description,price_per_day,deposit_fee,location,available,created_at,item_status,quantity,main_image_url"
                )
                .eq("user_id", profileUserId)
                .eq("available", true)
                .order("created_at", { ascending: false });
            let { data, error } = await query;
            if (
                error &&
                (error.code === "42703" || /item_status/i.test(error.message))
            ) {
                const fallback = await supabase
                    .from("items")
                    .select(
                        "item_id,user_id,title,description,price_per_day,deposit_fee,location,available,created_at,quantity,main_image_url"
                    )
                    .eq("user_id", profileUserId)
                    .eq("available", true)
                    .order("created_at", { ascending: false });
                data = fallback.data;
                error = fallback.error;
            }
            if (error) throw error;
            const withImages = await Promise.all(
                (data || []).map(async (it) => ({
                    ...it,
                    imageUrl:
                        it.main_image_url ||
                        (await getImageUrl(it.user_id, it.item_id)),
                }))
            );
            setItems(withImages);
        } catch (e) {
            console.error("Load items failed:", e?.message || e);
            toast.error("Failed to load items");
        } finally {
            setLoadingItems(false);
        }
    }, [profileUserId]);

    useEffect(() => {
        if (!profileUserId) return;
        loadProfile();
        loadItems();
        (async () => {
            try {
                setLoadingRating(true);
                const stats = await getLessorRatingStats(profileUserId);
                setRating(stats);
            } catch {
                setRating({ average: 0, count: 0 });
            } finally {
                setLoadingRating(false);
            }
        })();
    }, [profileUserId, loadProfile, loadItems]);

    const onRent = useCallback((item) => {
        if (!item) return;
        setSelectedItem(item);
        setRentOpen(true);
    }, []);

    return (
        <div className="min-h-screen bg-[#FFFBF2]">
            <TopMenu
                activePage="profile"
                searchTerm={search}
                setSearchTerm={setSearch}
            />
            <div className="max-w-5xl mx-auto p-4">
                <div className="flex items-center gap-2 mb-4">
                    <Button
                        variant="ghost"
                        onClick={() =>
                            window.history.length > 1
                                ? navigate(-1)
                                : navigate("/home")
                        }
                        className="flex items-center gap-2"
                    >
                        <ChevronLeft className="h-4 w-4" />
                        Back
                    </Button>
                </div>
                <h1 className="text-2xl font-semibold mb-4">Profile</h1>
                <div className="flex items-center gap-4 mb-6">
                    <div className="relative h-16 w-16">
                        {loadingProfile ? (
                            <Skeleton className="h-16 w-16 rounded-full" />
                        ) : (
                            <Avatar className="h-16 w-16">
                                <AvatarImage
                                    src={profile?.profile_pic_url || ""}
                                    alt="Profile"
                                />
                                <AvatarFallback>{initials}</AvatarFallback>
                            </Avatar>
                        )}
                        {isOwnProfile && !loadingProfile && (
                            <>
                                <input
                                    id="face-upload-input"
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={onUploadFace}
                                />
                                <button
                                    type="button"
                                    onClick={() =>
                                        document
                                            .getElementById("face-upload-input")
                                            ?.click()
                                    }
                                    className="absolute -bottom-1 -right-1 bg-black/80 hover:bg-black text-white rounded-full p-1 shadow-md"
                                    title={
                                        uploading
                                            ? "Uploading..."
                                            : "Change photo"
                                    }
                                    disabled={uploading}
                                >
                                    <Camera className="h-4 w-4" />
                                </button>
                            </>
                        )}
                    </div>
                    <div>
                        {loadingProfile ? (
                            <>
                                <Skeleton className="h-5 w-48 mb-2" />
                                <Skeleton className="h-4 w-40 mb-1" />
                                <Skeleton className="h-4 w-28" />
                                <Skeleton className="h-4 w-56 mt-2" />
                            </>
                        ) : (
                            <>
                                <p className="text-lg font-medium">
                                    {(profile?.first_name || "").trim()}{" "}
                                    {(profile?.last_name || "").trim()}
                                </p>
                                <p className="text-sm text-gray-600">
                                    Member since{" "}
                                    {profile?.created_at
                                        ? new Date(
                                              profile.created_at
                                          ).toLocaleDateString()
                                        : "—"}
                                </p>
                                {profile?.phone && (
                                    <p className="text-sm text-gray-600">
                                        📞 {profile.phone}
                                    </p>
                                )}
                                <p className="text-sm text-gray-700 mt-1">
                                    Owner rating:{" "}
                                    {loadingRating ? (
                                        <Skeleton className="h-4 w-40 inline-block align-middle" />
                                    ) : rating.count > 0 ? (
                                        `${rating.average.toFixed(1)} / 5 (${
                                            rating.count
                                        } review${
                                            rating.count === 1 ? "" : "s"
                                        })`
                                    ) : (
                                        "No reviews yet"
                                    )}
                                </p>
                                {!isOwnProfile && profile?.id && (
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        <Button
                                            variant="outline"
                                            className="cursor-pointer"
                                            onClick={() =>
                                                navigate(
                                                    `/inbox?to=${profile.id}`
                                                )
                                            }
                                        >
                                            Message Owner
                                        </Button>
                                        <ReportDialog
                                            trigger={
                                                <Button
                                                    variant="outline"
                                                    className="cursor-pointer"
                                                >
                                                    Report User
                                                </Button>
                                            }
                                            senderId={authUser?.id || null}
                                            targetUserId={profile.id}
                                            targetItemId={null}
                                            rentalId={null}
                                            title="Report User"
                                            description="Describe the issue with this user."
                                        />
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
                <h2 className="text-xl font-semibold mt-6 mb-3">
                    Open for booking
                </h2>
                {loadingItems ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <div
                                key={i}
                                className="border rounded-lg overflow-hidden bg-white"
                            >
                                <Skeleton className="w-full h-40" />
                                <div className="p-3">
                                    <Skeleton className="h-5 w-3/4 mb-2" />
                                    <Skeleton className="h-4 w-1/3" />
                                    <div className="mt-3 flex justify-between items-center">
                                        <Skeleton className="h-4 w-20" />
                                        <Skeleton className="h-8 w-24" />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <OwnedItemsGrid
                        items={items}
                        isOwner={isOwnProfile}
                        onChanged={loadItems}
                        onRent={onRent}
                    />
                )}
                <BookItemModal
                    open={rentOpen}
                    onOpenChange={setRentOpen}
                    item={selectedItem}
                    currentUserId={authUser?.id || null}
                    onBooked={loadItems}
                />
            </div>
        </div>
    );
}

function OwnedItemsGrid({ items, isOwner, onChanged, onRent }) {
    if (!items || items.length === 0) {
        return <p className="text-sm text-gray-600">No active posts.</p>;
    }
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((it) => (
                <div
                    key={it.item_id}
                    className="relative border rounded-lg overflow-hidden bg-white"
                >
                    {it.imageUrl && (
                        <img
                            src={it.imageUrl}
                            alt={it.title}
                            className="w-full h-40 object-cover"
                        />
                    )}
                    <div className="p-3">
                        <div className="flex items-start justify-between gap-2">
                            <div>
                                <p className="font-medium line-clamp-1">
                                    {it.title}
                                </p>
                                <p className="text-sm text-gray-600">
                                    ₱{Number(it.price_per_day || 0).toFixed(2)}{" "}
                                    / day
                                </p>
                            </div>
                            {isOwner && (
                                <OwnerItemActions
                                    item={it}
                                    onChanged={onChanged}
                                />
                            )}
                        </div>
                        <div className="mt-2 text-xs text-gray-600 flex justify-between">
                            <span>Units: {Number(it.quantity) || 1}</span>
                            {it.location && (
                                <span className="truncate max-w-[50%] text-right">
                                    {it.location}
                                </span>
                            )}
                        </div>
                        {!isOwner && (
                            <div className="mt-3 flex justify-end">
                                <Button
                                    size="sm"
                                    className="cursor-pointer"
                                    onClick={() => onRent?.(it)}
                                >
                                    Rent Now
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
}

function OwnerItemActions({ item, onChanged }) {
    const [busy, setBusy] = useState(false);
    const toast = useToastApi();

    const updateQuantity = async (delta) => {
        try {
            setBusy(true);
            const next = Math.max(0, (Number(item.quantity) || 0) + delta);
            const { error } = await supabase
                .from("items")
                .update({ quantity: next })
                .eq("item_id", item.item_id);
            if (error) throw error;
            toast.success(`Quantity ${delta > 0 ? "increased" : "decreased"}.`);
            onChanged?.();
        } catch (e) {
            toast.error(e.message || "Update failed");
        } finally {
            setBusy(false);
        }
    };

    const deletePost = async () => {
        if (!confirm("Delete this post? This cannot be undone.")) return;
        try {
            setBusy(true);
            const { error } = await supabase
                .from("items")
                .delete()
                .eq("item_id", item.item_id);
            if (error) throw error;
            toast.success("Post deleted");
            onChanged?.();
        } catch (e) {
            toast.error(e.message || "Delete failed");
        } finally {
            setBusy(false);
        }
    };

    const [editOpen, setEditOpen] = useState(false);

    return (
        <div className="shrink-0">
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        size="icon"
                        variant="ghost"
                        className="cursor-pointer"
                    >
                        <EllipsisVertical className="w-5 h-5" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-48">
                    <DropdownMenuItem onClick={() => setEditOpen(true)}>
                        <Pencil className="w-4 h-4" /> Edit post
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                        onClick={() => {
                            const input = prompt("How many units to add?", "1");
                            const n = parseInt(input || "0", 10);
                            if (!Number.isFinite(n) || n <= 0) return;
                            updateQuantity(n);
                        }}
                        disabled={busy}
                    >
                        <Plus className="w-4 h-4" /> Add units…
                    </DropdownMenuItem>
                    <DropdownMenuItem
                        onClick={() => {
                            const input = prompt(
                                "How many units to subtract?",
                                "1"
                            );
                            const n = parseInt(input || "0", 10);
                            if (!Number.isFinite(n) || n <= 0) return;
                            updateQuantity(-n);
                        }}
                        disabled={busy || (Number(item.quantity) || 0) <= 0}
                    >
                        <Minus className="w-4 h-4" /> Subtract units…
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                        data-variant="destructive"
                        onClick={deletePost}
                        disabled={busy}
                    >
                        <Trash2 className="w-4 h-4" /> Delete post
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
            <EditItemModal
                open={editOpen}
                onOpenChange={setEditOpen}
                item={item}
                onSaved={onChanged}
            />
        </div>
    );
}

function EditItemModal({ open, onOpenChange, item, onSaved }) {
    const toast = useToastApi();
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({
        title: "",
        description: "",
        price_per_day: "",
        deposit_fee: "0",
        location: "",
        available: true,
        quantity: "1",
    });

    useEffect(() => {
        if (open && item) {
            setForm({
                title: item.title || "",
                description: item.description || "",
                price_per_day: String(item.price_per_day || ""),
                deposit_fee: String(item.deposit_fee || "0"),
                location: item.location || "",
                available: !!item.available,
                quantity: String(item.quantity ?? "1"),
            });
        }
    }, [open, item]);

    const onChange = (e) => {
        const { name, value, type, checked } = e.target;
        setForm((f) => ({
            ...f,
            [name]: type === "checkbox" ? checked : value,
        }));
    };

    const save = async () => {
        if (!item?.item_id) return;
        try {
            setSaving(true);
            const payload = {
                title: form.title.trim() || null,
                description: form.description.trim() || null,
                price_per_day: form.price_per_day
                    ? parseFloat(form.price_per_day)
                    : null,
                deposit_fee: form.deposit_fee
                    ? parseFloat(form.deposit_fee)
                    : 0,
                location: form.location.trim() || null,
                available: !!form.available,
                quantity: form.quantity
                    ? Math.max(0, parseInt(form.quantity, 10) || 0)
                    : 0,
            };
            const { error } = await supabase
                .from("items")
                .update(payload)
                .eq("item_id", item.item_id);
            if (error) throw error;
            toast.success("Post updated");
            onOpenChange(false);
            onSaved?.();
        } catch (e) {
            toast.error(e.message || "Save failed");
        } finally {
            setSaving(false);
        }
    };

    if (!open) return null;
    return (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-lg w-full max-w-lg p-4">
                <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold">Edit Post</h3>
                    <button
                        className="text-sm text-gray-600"
                        onClick={() => onOpenChange(false)}
                    >
                        ✕
                    </button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                        <label className="text-sm">Title</label>
                        <input
                            name="title"
                            value={form.title}
                            onChange={onChange}
                            className="w-full border rounded px-2 py-1"
                        />
                    </div>
                    <div className="col-span-2">
                        <label className="text-sm">Description</label>
                        <textarea
                            name="description"
                            value={form.description}
                            onChange={onChange}
                            className="w-full border rounded px-2 py-1 min-h-20"
                        />
                    </div>
                    <div>
                        <label className="text-sm">Price per day (₱)</label>
                        <input
                            name="price_per_day"
                            type="number"
                            step="0.01"
                            value={form.price_per_day}
                            onChange={onChange}
                            className="w-full border rounded px-2 py-1"
                        />
                    </div>
                    <div>
                        <label className="text-sm">Deposit (₱)</label>
                        <input
                            name="deposit_fee"
                            type="number"
                            step="0.01"
                            value={form.deposit_fee}
                            onChange={onChange}
                            className="w-full border rounded px-2 py-1"
                        />
                    </div>
                    <div>
                        <label className="text-sm">Quantity</label>
                        <input
                            name="quantity"
                            type="number"
                            step="1"
                            min="0"
                            value={form.quantity}
                            onChange={onChange}
                            className="w-full border rounded px-2 py-1"
                        />
                    </div>
                    <div>
                        <label className="text-sm">Location</label>
                        <input
                            name="location"
                            value={form.location}
                            onChange={onChange}
                            className="w-full border rounded px-2 py-1"
                        />
                    </div>
                    <div className="col-span-2 flex items-center gap-2 mt-1">
                        <input
                            id="available"
                            name="available"
                            type="checkbox"
                            checked={form.available}
                            onChange={onChange}
                        />
                        <label htmlFor="available" className="text-sm">
                            Available
                        </label>
                    </div>
                </div>
                <div className="mt-4 flex justify-end gap-2">
                    <Button
                        variant="outline"
                        className="cursor-pointer"
                        onClick={() => onOpenChange(false)}
                        disabled={saving}
                    >
                        Cancel
                    </Button>
                    <Button
                        className="cursor-pointer"
                        onClick={save}
                        disabled={saving}
                    >
                        {saving ? "Saving..." : "Save"}
                    </Button>
                </div>
            </div>
        </div>
    );
}
