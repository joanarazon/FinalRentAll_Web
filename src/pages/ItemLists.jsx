"use client";

import { useEffect, useState } from "react";
import Swal from "sweetalert2"; // <-- SweetAlert2
import TopMenu from "@/components/topMenu";
import { useUser } from "@/hooks/useUser";
import { supabase } from "../../supabaseClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Loading from "@/components/Loading";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { EllipsisVertical, Pencil, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function ItemLists() {
  const user = useUser();

  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [items, setItems] = useState({
    pending: [],
    approved: [],
    rejected: [],
  });

  const [editOpen, setEditOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const fetchItems = async () => {
      if (!user?.id) return;
      setLoading(true);

      const { data, error } = await supabase
        .from("items")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (!error && data) {
        setItems({
          pending: data.filter((i) => i.item_status === "pending"),
          approved: data.filter((i) => i.item_status === "approved"),
          rejected: data.filter((i) => i.item_status === "rejected"),
        });
      }
      setLoading(false);
    };

    fetchItems();
  }, [user?.id]);

  if (!user) return null;

  const filterBySearch = (list) =>
    list.filter((item) =>
      (item.title || "").toLowerCase().includes(search.toLowerCase())
    );

  // ===================== DELETE ITEM =====================
  const handleDeleteItem = async (itemId, status) => {
    const result = await Swal.fire({
      title: "Are you sure?",
      text: "This item will be permanently deleted!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#FFAB00",
      cancelButtonColor: "#d33",
      confirmButtonText: "Yes, delete it!",
    });

    if (!result.isConfirmed) return;

    setBusy(true);
    const { error } = await supabase
      .from("items")
      .delete()
      .eq("item_id", itemId);
    setBusy(false);

    if (error) {
      Swal.fire("Error", error.message, "error");
      return;
    }

    setItems((prev) => ({
      ...prev,
      [status]: prev[status].filter((item) => item.item_id !== itemId),
    }));

    Swal.fire("Deleted!", "Your item has been deleted.", "success");
  };

  const handleDeleteAll = async (status) => {
    const result = await Swal.fire({
      title: "Are you sure?",
      text: `All ${status} items will be permanently deleted!`,
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
      .eq("user_id", user.id)
      .eq("item_status", status);

    if (error) {
      Swal.fire("Error", error.message, "error");
      return;
    }

    setItems((prev) => ({ ...prev, [status]: [] }));
    Swal.fire("Deleted!", `All ${status} items have been deleted.`, "success");
  };

  // ===================== RENDER ITEM CARD =====================
  const renderItemCard = (item) => (
    <Card
      key={item.item_id}
      className="border bg-white shadow-sm hover:shadow-lg transition-all relative"
    >
      {item.main_image_url && (
        <img
          src={item.main_image_url}
          alt={item.title}
          className="w-full h-48 object-cover rounded-t-md"
        />
      )}
      <CardHeader className="flex justify-between items-start">
        <CardTitle className="text-lg font-semibold">{item.title}</CardTitle>

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
            <DropdownMenuItem
              onClick={() => {
                setSelectedItem(item);
                setEditOpen(true);
              }}
            >
              <Pencil className="w-4 h-4 mr-2" /> Edit
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => handleDeleteItem(item.item_id, item.item_status)}
              data-variant="destructive"
              disabled={busy}
            >
              <Trash2 className="w-4 h-4 mr-2" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>

      <CardContent>
        <p className="text-sm text-gray-600">{item.description}</p>
        <p className="mt-2 text-yellow-600 font-bold text-lg">
          ₱{item.price_per_day} / day
        </p>
        <p className="text-xs text-gray-500 mt-1">
          {item.quantity} {item.quantity === 1 ? "unit" : "units"}
          <span className="ml-2">📍 {item.location || "Unknown"}</span>
        </p>
        <p className="text-xs text-gray-500 mt-1">
          Status: <strong>{item.item_status}</strong>
        </p>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-[#FAF5EF]">
      <TopMenu
        activePage="item-lists"
        searchTerm={search}
        setSearchTerm={setSearch}
      />

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-10">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold text-[#1E1E1E] tracking-tight">
            My Items
          </h1>
          <p className="text-[#1E1E1E]/60 text-lg">
            View and manage your item listings
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loading />
          </div>
        ) : (
          <div className="space-y-12">
            <Section
              title="Pending"
              items={filterBySearch(items.pending)}
              onDeleteAll={() => handleDeleteAll("pending")}
              renderItemCard={renderItemCard}
            />
            <Section
              title="Approved"
              items={filterBySearch(items.approved)}
              onDeleteAll={() => handleDeleteAll("approved")}
              renderItemCard={renderItemCard}
            />
            <Section
              title="Rejected"
              items={filterBySearch(items.rejected)}
              onDeleteAll={() => handleDeleteAll("rejected")}
              renderItemCard={renderItemCard}
            />
          </div>
        )}

        {editOpen && selectedItem && (
          <EditItemModal
            open={editOpen}
            onOpenChange={setEditOpen}
            item={selectedItem}
            onSaved={(updatedItem) => {
              setItems((prev) => ({
                ...prev,
                [updatedItem.item_status]: prev[updatedItem.item_status].map(
                  (i) => (i.item_id === updatedItem.item_id ? updatedItem : i)
                ),
              }));
              setEditOpen(false);
              setSelectedItem(null);
              Swal.fire("Success", "Item updated successfully!", "success");
            }}
          />
        )}
      </div>
    </div>
  );
}

// ===================== SECTION COMPONENT =====================
function Section({ title, items, onDeleteAll, renderItemCard }) {
  return (
    <section>
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-semibold">{title}</h2>
          <Badge variant="outline">{items.length}</Badge>
        </div>
        {items.length > 0 && (
          <button
            onClick={onDeleteAll}
            className="px-3 py-1 text-sm text-white bg-red-500 rounded hover:bg-red-600 transition"
          >
            Delete All
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <p className="text-gray-500">No {title.toLowerCase()} items.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {items.map(renderItemCard)}
        </div>
      )}
    </section>
  );
}

// ===================== EDIT ITEM MODAL =====================
function EditItemModal({ open, onOpenChange, item, onSaved }) {
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
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const save = async () => {
    setSaving(true);
    const { data, error } = await supabase
      .from("items")
      .update({
        title: form.title,
        description: form.description,
        price_per_day: Number(form.price_per_day),
        deposit_fee: Number(form.deposit_fee),
        location: form.location,
        available: form.available,
        quantity: Number(form.quantity),
      })
      .eq("item_id", item.item_id)
      .select()
      .single();
    setSaving(false);

    if (error) {
      Swal.fire("Error", error.message, "error");
      return;
    }

    onSaved(data);
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
