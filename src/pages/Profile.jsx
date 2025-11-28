"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useUserContext } from "@/context/UserContext.jsx";
import { supabase } from "../../supabaseClient";
import { useToastApi } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Camera,
  EllipsisVertical,
  Pencil,
  Trash2,
  ChevronLeft,
  Calendar,
  Phone,
  Star,
  MapPin,
} from "lucide-react";
import TopMenu from "@/components/topMenu";
import EditProfileModal from "@/components/EditProfileModal";
import { useNavigate, useParams } from "react-router-dom";
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
import Swal from "sweetalert2";

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
  const [reviews, setReviews] = useState([]);
  const [loadingReviews, setLoadingReviews] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [rejectedItems, setRejectedItems] = useState([]);
  const [rentOpen, setRentOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [editOpen, setEditOpen] = useState(false);

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
        .select("id, first_name, last_name, phone, created_at, profile_pic_url")
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
  const loadRejectedItems = useCallback(async () => {
    if (!profileUserId) return;

    setLoadingItems(true);

    try {
      let { data, error } = await supabase
        .from("items")
        .select(
          "item_id,user_id,title,description,price_per_day,deposit_fee,location,available,created_at,item_status,quantity,main_image_url"
        )
        .eq("user_id", profileUserId)
        .eq("available", true)
        .eq("item_status", "rejected")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Attach imageUrl for each rejected item
      const dataWithImages = await Promise.all(
        (data || []).map(async (it) => ({
          ...it,
          imageUrl:
            it.main_image_url || (await getImageUrl(it.user_id, it.item_id)),
        }))
      );

      setRejectedItems(dataWithImages);
    } catch (error) {
      console.error("Error loading rejected items:", error.message);
    } finally {
      setLoadingItems(false);
    }
  }, [profileUserId]);
  const handleDeleteAllRejected = async () => {
    const profileUserId = authUser?.id;
    if (!profileUserId) return;
    const result = await Swal.fire({
      title: "Are you sure?",
      text: "All rejected items will be permanently deleted!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#FFAB00",
      cancelButtonColor: "#d33",
      confirmButtonText: "Yes, delete all!",
    });

    if (!result.isConfirmed) return;

    const { error } = await supabase
      .from("items")
      .delete()
      .eq("user_id", profileUserId)
      .eq("item_status", "rejected");

    if (error) {
      Swal.fire("Error", error.message, "error");
      return;
    }

    setRejectedItems([]); // clear local state
    Swal.fire("Deleted!", "All rejected items have been deleted.", "success");
  };

  const handleDeleteAllOpen = async () => {
    const profileUserId = authUser?.id;
    const result = await Swal.fire({
      title: "Are you sure?",
      text: "All open-for-booking items will be permanently deleted!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#FFAB00",
      cancelButtonColor: "#d33",
      confirmButtonText: "Yes, delete all!",
    });

    if (!result.isConfirmed) return;

    const { error } = await supabase
      .from("items")
      .delete()
      .eq("user_id", profileUserId)
      .eq("available", true)
      .not("item_status", "eq", "rejected"); // only open items

    if (error) {
      Swal.fire("Error", error.message, "error");
      return;
    }

    setItems([]); // clear local state for open items
    Swal.fire(
      "Deleted!",
      "All open-for-booking items have been deleted.",
      "success"
    );
  };

  const loadItems = useCallback(async () => {
    if (!profileUserId) return;
    setLoadingItems(true);
    try {
      // Filter items based on approval status
      // - Hide rejected items from all viewers
      // - Show pending and approved items (with different UI treatment)
      const query = supabase
        .from("items")
        .select(
          "item_id,user_id,title,description,price_per_day,deposit_fee,location,available,created_at,item_status,quantity,main_image_url"
        )
        .eq("user_id", profileUserId)
        .eq("available", true)
        .not("item_status", "eq", "rejected") // Hide rejected items
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
      // Filter out rejected items in case of fallback query (when item_status column doesn't exist)
      let filteredData = (data || []).filter((item) => {
        // If item_status doesn't exist, assume it's approved (legacy items)
        // If item_status exists, exclude rejected items
        return !item.item_status || item.item_status !== "rejected";
      });

      // If viewing someone else's profile, also filter out banned items
      if (!isOwnProfile) {
        filteredData = filteredData.filter(
          (item) => item.item_status !== "banned"
        );
      }

      const withImages = await Promise.all(
        filteredData.map(async (it) => ({
          ...it,
          imageUrl:
            it.main_image_url || (await getImageUrl(it.user_id, it.item_id)),
        }))
      );
      setItems(withImages);
    } catch (e) {
      console.error("Load items failed:", e?.message || e);
      toast.error("Failed to load items");
    } finally {
      setLoadingItems(false);
    }
  }, [profileUserId, isOwnProfile]);

  useEffect(() => {
    if (!profileUserId) return;
    loadProfile();
    loadItems();
    loadRejectedItems();
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
    (async () => {
      try {
        setLoadingReviews(true);
        const { data, error } = await supabase
          .from("lessor_reviews")
          .select(
            `review_id,rating,comment,created_at, reviewer:reviewer_id(first_name,last_name,profile_pic_url)`
          )
          .eq("lessor_id", profileUserId)
          .order("created_at", { ascending: false });
        if (error) throw error;
        setReviews(data || []);
      } catch (e) {
        console.warn("Load reviews failed", e?.message || e);
        setReviews([]);
      } finally {
        setLoadingReviews(false);
      }
    })();
  }, [profileUserId, loadProfile, loadItems]);

  const onRent = useCallback((item) => {
    if (!item) return;
    setSelectedItem(item);
    setRentOpen(true);
  }, []);

  return (
    <div className="min-h-screen bg-[#FAF5EF]">
      <TopMenu
        activePage="profile"
        searchTerm={search}
        setSearchTerm={setSearch}
      />
      <div className="max-w-6xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() =>
              window.history.length > 1 ? navigate(-1) : navigate("/home")
            }
            className="flex items-center gap-2 hover:bg-[#1E1E1E]/5 transition-colors"
          >
            <ChevronLeft className="h-5 w-5" />
            <span className="font-medium">Back</span>
          </Button>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-[#1E1E1E]/10 p-6 sm:p-8 mb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <div className="relative">
              {loadingProfile ? (
                <Skeleton className="h-24 w-24 rounded-full" />
              ) : (
                <Avatar className="h-24 w-24 ring-4 ring-[#FFAB00]/20">
                  <AvatarImage
                    src={profile?.profile_pic_url || ""}
                    alt="Profile"
                  />
                  <AvatarFallback className="bg-[#FFAB00] text-[#1E1E1E] text-2xl font-semibold">
                    {initials}
                  </AvatarFallback>
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
                      document.getElementById("face-upload-input")?.click()
                    }
                    className="absolute -bottom-1 -right-1 bg-[#FFAB00] hover:bg-[#FFAB00]/90 text-[#1E1E1E] rounded-full p-2.5 shadow-lg transition-all hover:scale-105"
                    title={uploading ? "Uploading..." : "Change photo"}
                    disabled={uploading}
                  >
                    <Camera className="h-4 w-4" />
                  </button>
                </>
              )}
            </div>
            <div className="flex-1">
              {loadingProfile ? (
                <>
                  <Skeleton className="h-8 w-64 mb-3" />
                  <Skeleton className="h-5 w-48 mb-2" />
                  <Skeleton className="h-5 w-40 mb-2" />
                  <Skeleton className="h-5 w-56" />
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-3">
                    <h1 className="text-3xl font-bold text-[#1E1E1E]">
                      {(profile?.first_name || "").trim()}{" "}
                      {(profile?.last_name || "").trim()}
                    </h1>
                    {isOwnProfile && !loadingProfile && (
                      <Button
                        variant="outline"
                        onClick={() => setEditOpen(true)}
                      >
                        Edit Profile
                      </Button>
                    )}
                  </div>
                  {/* Edit Profile Modal */}
                  {isOwnProfile && (
                    <EditProfileModal
                      open={editOpen}
                      onOpenChange={setEditOpen}
                      profile={profile}
                      onUpdated={loadProfile}
                    />
                  )}
                  <div className="flex flex-wrap gap-4 text-sm text-[#1E1E1E]/70 mb-4">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-4 w-4" />
                      <span>
                        Member since{" "}
                        {profile?.created_at
                          ? new Date(profile.created_at).toLocaleDateString(
                              "en-US",
                              {
                                month: "short",
                                year: "numeric",
                              }
                            )
                          : "—"}
                      </span>
                    </div>
                    {profile?.phone && (
                      <div className="flex items-center gap-1.5">
                        <Phone className="h-4 w-4" />
                        <span>{profile.phone}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mb-4">
                    {loadingRating ? (
                      <Skeleton className="h-6 w-48" />
                    ) : rating.count > 0 ? (
                      <div className="flex items-center gap-2 bg-[#FFAB00]/10 px-3 py-1.5 rounded-full">
                        <Star className="h-4 w-4 fill-[#FFAB00] text-[#FFAB00]" />
                        <span className="font-semibold text-[#1E1E1E]">
                          {rating.average.toFixed(1)}
                        </span>
                        <span className="text-sm text-[#1E1E1E]/70">
                          ({rating.count} review
                          {rating.count === 1 ? "" : "s"})
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-sm text-[#1E1E1E]/50">
                        <Star className="h-4 w-4" />
                        <span>No reviews yet</span>
                      </div>
                    )}
                  </div>
                  {!isOwnProfile && profile?.id && (
                    <div className="flex flex-wrap gap-3">
                      <Button
                        className="bg-[#FFAB00] hover:bg-[#FFAB00]/90 text-[#1E1E1E] font-medium cursor-pointer transition-all hover:scale-105"
                        onClick={() => navigate(`/inbox?to=${profile.id}`)}
                      >
                        Message Owner
                      </Button>
                      <ReportDialog
                        trigger={
                          <Button
                            variant="outline"
                            className="cursor-pointer border-[#1E1E1E]/20 hover:bg-[#1E1E1E]/5 bg-transparent"
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
        </div>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-[#1E1E1E]">
              Open for booking
            </h2>
            <p className="text-sm text-[#1E1E1E]/60 mt-1">
              {items.length} {items.length === 1 ? "item" : "items"} available
            </p>
          </div>

          {items.length > 0 && (
            <button
              onClick={handleDeleteAllOpen} // ⭐ call delete all function for open items
              className="px-3 py-1 text-sm text-white bg-red-500 rounded hover:bg-red-600 transition"
            >
              Delete All
            </button>
          )}
        </div>

        {loadingItems ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="border border-[#1E1E1E]/10 rounded-xl overflow-hidden bg-white"
              >
                <Skeleton className="w-full h-48" />
                <div className="p-4">
                  <Skeleton className="h-6 w-3/4 mb-2" />
                  <Skeleton className="h-5 w-1/3 mb-3" />
                  <Skeleton className="h-4 w-full mb-2" />
                  <div className="mt-4 flex justify-between items-center">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-9 w-24" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <OwnedItemsGrid
            items={items}
            isOwner={isOwnProfile}
            onChanged={loadItems} // reload items after edit/delete
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

        <div className="flex items-center justify-between mt-12 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-[#1E1E1E]">
              Rejected Items
            </h2>
            <p className="text-sm text-[#1E1E1E]/60 mt-1">
              {rejectedItems.length}{" "}
              {rejectedItems.length === 1 ? "item" : "items"} found
            </p>
          </div>

          {rejectedItems.length > 0 && (
            <button
              onClick={handleDeleteAllRejected} // ⭐ call delete all function
              className="px-3 py-1 text-sm text-white bg-red-500 rounded hover:bg-red-600 transition"
            >
              Delete All
            </button>
          )}
        </div>

        {loadingItems ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="border border-[#1E1E1E]/10 rounded-xl overflow-hidden bg-white"
              >
                <Skeleton className="w-full h-48" />
                <div className="p-4">
                  <Skeleton className="h-6 w-3/4 mb-2" />
                  <Skeleton className="h-5 w-1/3 mb-3" />
                  <Skeleton className="h-4 w-full mb-2" />
                  <div className="mt-4 flex justify-between items-center">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-9 w-24" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <OwnedItemsGrid
            items={rejectedItems} // show ONLY rejected items
            isOwner={isOwnProfile}
            onChanged={loadRejectedItems} // reload rejected items after edit/delete
            onRent={onRent}
          />
        )}

        <BookItemModal
          open={rentOpen}
          onOpenChange={setRentOpen}
          item={selectedItem}
          currentUserId={authUser?.id || null}
          onBooked={loadRejectedItems} // reload rejected items after renting
        />

        {/* Reviews section */}
        <div className="mt-12">
          <h2 className="text-2xl font-bold text-[#1E1E1E]">Reviews</h2>
          <p className="text-sm text-[#1E1E1E]/60 mt-1">
            {loadingReviews
              ? "Loading reviews..."
              : `${reviews.length} review${reviews.length === 1 ? "" : "s"}`}
          </p>
          <div className="mt-4 space-y-4">
            {loadingReviews ? (
              <div className="bg-white rounded-xl border border-[#1E1E1E]/10 p-6">
                <Skeleton className="h-6 w-1/3 mb-2" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            ) : reviews.length === 0 ? (
              <div className="text-[#1E1E1E]/60 text-sm bg-white rounded-xl border border-[#1E1E1E]/10 p-6">
                No reviews yet.
              </div>
            ) : (
              reviews.map((rv) => (
                <div
                  key={rv.review_id}
                  className="bg-white rounded-xl border border-[#1E1E1E]/10 p-5"
                >
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-full bg-[#FFAB00]/20 overflow-hidden flex-shrink-0">
                      {rv.reviewer?.profile_pic_url ? (
                        <img
                          src={rv.reviewer.profile_pic_url}
                          className="h-full w-full object-cover"
                        />
                      ) : null}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <div className="font-semibold text-[#1E1E1E] truncate">
                          {(rv.reviewer?.first_name || "").trim()}{" "}
                          {(rv.reviewer?.last_name || "").trim()}
                        </div>
                        <div className="text-xs text-[#1E1E1E]/60">
                          {new Date(rv.created_at).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 mt-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`h-4 w-4 ${
                              i < rv.rating
                                ? "fill-[#FFAB00] text-[#FFAB00]"
                                : "text-[#1E1E1E]/20"
                            }`}
                          />
                        ))}
                      </div>
                      {rv.comment && (
                        <p className="text-sm text-[#1E1E1E]/80 mt-2 whitespace-pre-wrap">
                          {rv.comment}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function OwnedItemsGrid({ items, isOwner, onChanged, onRent }) {
  if (!items || items.length === 0) {
    return (
      <div className="text-center py-16 bg-white rounded-xl border border-[#1E1E1E]/10">
        <p className="text-[#1E1E1E]/60 text-lg">
          No posts for this section yet.
        </p>
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {items.map((it) => (
        <div
          key={it.item_id}
          className="group relative border border-[#1E1E1E]/10 rounded-xl overflow-hidden bg-white transition-all hover:shadow-lg hover:-translate-y-1"
        >
          {it.imageUrl ? (
            <div className="relative h-48 overflow-hidden bg-[#FAF5EF]">
              <img
                src={it.imageUrl || "/placeholder.svg"}
                alt={it.title}
                className="w-full h-full object-cover transition-transform group-hover:scale-105"
              />
            </div>
          ) : (
            <div className="h-48 bg-gradient-to-br from-[#FAF5EF] to-[#FFAB00]/10 flex items-center justify-center">
              <span className="text-[#1E1E1E]/30 text-sm">No image</span>
            </div>
          )}
          <div className="p-4">
            <div className="flex items-start justify-between gap-2 mb-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-[#1E1E1E] text-lg line-clamp-1">
                    {it.title}
                  </h3>
                  {it.item_status === "pending" && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                      Under Review
                    </span>
                  )}
                  {isOwner && it.item_status === "banned" && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                      Banned
                    </span>
                  )}
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-[#FFAB00]">
                    ₱{Number(it.price_per_day || 0).toFixed(0)}
                  </span>
                  <span className="text-sm text-[#1E1E1E]/60">/ day</span>
                </div>
              </div>
              {isOwner && <OwnerItemActions item={it} onChanged={onChanged} />}
            </div>
            <div className="flex items-center justify-between text-xs text-[#1E1E1E]/60 mb-3 pb-3 border-b border-[#1E1E1E]/10">
              <span className="font-medium">
                {Number(it.quantity) || 1}{" "}
                {Number(it.quantity) === 1 ? "unit" : "units"}
              </span>
              {it.location && (
                <div className="flex items-center gap-1 truncate max-w-[60%]">
                  <MapPin className="h-3 w-3 shrink-0" />
                  <span className="truncate">{it.location}</span>
                </div>
              )}
            </div>
            {!isOwner && (
              <Button
                className={`w-full font-medium transition-all ${
                  it.item_status === "pending"
                    ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                    : "bg-[#FFAB00] hover:bg-[#FFAB00]/90 text-[#1E1E1E] cursor-pointer"
                }`}
                onClick={() => {
                  if (it.item_status !== "pending") {
                    onRent?.(it);
                  }
                }}
                disabled={it.item_status === "pending"}
              >
                {it.item_status === "pending" ? "Under Review" : "Rent Now"}
              </Button>
            )}
            {isOwner && it.item_status === "banned" && (
              <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                <ReReviewButton itemId={it.item_id} onRequested={onChanged} />
                <ViolationHistoryButton itemId={it.item_id} />
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

  const deletePost = async () => {
    const result = await Swal.fire({
      title: "Are you sure?",
      text: "Delete this post? This cannot be undone.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, delete it!",
      cancelButtonText: "Cancel",
    });

    if (!result.isConfirmed) return;

    try {
      setBusy(true);
      const { error } = await supabase
        .from("items")
        .delete()
        .eq("item_id", item.item_id);

      if (error) throw error;

      Swal.fire("Deleted!", "Your post has been deleted.", "success");
      onChanged?.();
    } catch (e) {
      Swal.fire("Error", e.message || "Delete failed", "error");
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
            className="cursor-pointer h-8 w-8 hover:bg-[#1E1E1E]/5"
          >
            <EllipsisVertical className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-48">
          <DropdownMenuItem onClick={() => setEditOpen(true)}>
            <Pencil className="w-4 h-4" /> Edit post
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
          ? Number.parseFloat(form.price_per_day)
          : null,
        deposit_fee: form.deposit_fee ? Number.parseFloat(form.deposit_fee) : 0,
        location: form.location.trim() || null,
        available: !!form.available,
        quantity: form.quantity
          ? Math.max(0, Number.parseInt(form.quantity, 10) || 0)
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-[#1E1E1E]">
            Edit Post
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#1E1E1E] mb-1.5">
              Title
            </label>
            <input
              name="title"
              value={form.title}
              onChange={onChange}
              className="w-full border border-[#1E1E1E]/20 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#FFAB00] focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#1E1E1E] mb-1.5">
              Description
            </label>
            <textarea
              name="description"
              value={form.description}
              onChange={onChange}
              className="w-full border border-[#1E1E1E]/20 rounded-lg px-3 py-2 min-h-24 focus:outline-none focus:ring-2 focus:ring-[#FFAB00] focus:border-transparent"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#1E1E1E] mb-1.5">
                Price per day (₱)
              </label>
              <input
                name="price_per_day"
                type="number"
                step="0.01"
                value={form.price_per_day}
                onChange={onChange}
                className="w-full border border-[#1E1E1E]/20 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#FFAB00] focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#1E1E1E] mb-1.5">
                Deposit (₱)
              </label>
              <input
                name="deposit_fee"
                type="number"
                step="0.01"
                value={form.deposit_fee}
                onChange={onChange}
                className="w-full border border-[#1E1E1E]/20 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#FFAB00] focus:border-transparent"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#1E1E1E] mb-1.5">
                Quantity
              </label>
              <input
                name="quantity"
                type="number"
                step="1"
                min="0"
                value={form.quantity}
                onChange={onChange}
                className="w-full border border-[#1E1E1E]/20 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#FFAB00] focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#1E1E1E] mb-1.5">
                Location
              </label>
              <input
                name="location"
                value={form.location}
                onChange={onChange}
                className="w-full border border-[#1E1E1E]/20 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#FFAB00] focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex items-center gap-2 pt-2">
            <input
              id="available"
              name="available"
              type="checkbox"
              checked={form.available}
              onChange={onChange}
              className="h-4 w-4 rounded border-[#1E1E1E]/20 text-[#FFAB00] focus:ring-[#FFAB00]"
            />
            <label
              htmlFor="available"
              className="text-sm font-medium text-[#1E1E1E]"
            >
              Available for booking
            </label>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <Button
            variant="outline"
            className="cursor-pointer border-[#1E1E1E]/20 hover:bg-[#1E1E1E]/5 bg-transparent"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            className="cursor-pointer bg-[#FFAB00] hover:bg-[#FFAB00]/90 text-[#1E1E1E] font-medium"
            onClick={save}
            disabled={saving}
          >
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ReReviewButton({ itemId, onRequested }) {
  const { user } = useUserContext();
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const toast = useToastApi();

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("item_rereview_requests")
          .select("status")
          .eq("item_id", itemId)
          .eq("status", "pending")
          .maybeSingle();
        if (error && error.code !== "PGRST116") throw error;
        if (!cancelled) setPending(!!data);
      } catch (e) {
        console.warn("Check re-review failed", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [itemId]);

  const request = async () => {
    try {
      setLoading(true);
      if (!user?.id) {
        throw new Error("You must be signed in to request re-review.");
      }
      const { error } = await supabase
        .from("item_rereview_requests")
        .insert({ item_id: itemId, requested_by: user.id });
      if (error) throw error;
      toast.success("Re-review requested");
      setPending(true);
      onRequested?.();
    } catch (e) {
      const msg = /uq_item_pending_rereview/i.test(e?.message || "")
        ? "There's already a pending re-review for this item."
        : e.message || "Request failed";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      className={`w-full font-medium ${
        pending
          ? "bg-gray-200 text-gray-600"
          : "bg-[#FFAB00] hover:bg-[#FFAB00]/90 text-[#1E1E1E]"
      }`}
      disabled={loading || pending}
      onClick={request}
    >
      {pending
        ? "Re-review Pending"
        : loading
        ? "Checking..."
        : "Request Re-review"}
    </Button>
  );
}

function ViolationHistoryButton({ itemId }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("item_violations")
          .select("violation_id, reason, details, created_at")
          .eq("item_id", itemId)
          .order("created_at", { ascending: false });
        if (error) throw error;
        if (!cancelled) setRows(data || []);
      } catch (e) {
        console.error("Load violations failed", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [open, itemId]);

  return (
    <>
      <Button
        variant="outline"
        className="w-full border-[#1E1E1E]/20 bg-transparent"
        onClick={() => setOpen(true)}
      >
        View Violation History
      </Button>
      {open && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-[#1E1E1E]">
                Violation History
              </DialogTitle>
            </DialogHeader>
            {loading ? (
              <div className="text-sm text-gray-500">Loading…</div>
            ) : rows.length === 0 ? (
              <div className="text-sm text-gray-500">
                No violations recorded.
              </div>
            ) : (
              <ul className="divide-y">
                {rows.map((v) => (
                  <li key={v.violation_id} className="py-3">
                    <div className="text-sm font-medium text-[#1E1E1E]">
                      {v.reason}
                    </div>
                    {v.details && (
                      <div className="text-sm text-[#1E1E1E]/80 mt-1">
                        {v.details}
                      </div>
                    )}
                    <div className="text-xs text-[#1E1E1E]/50 mt-1">
                      {new Date(v.created_at).toLocaleString()}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
