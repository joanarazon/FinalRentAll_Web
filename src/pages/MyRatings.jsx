"use client"

import { useEffect, useState } from "react"
import TopMenu from "@/components/topMenu"
import { useUser } from "@/hooks/useUser"
import { supabase } from "../../supabaseClient"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Loading from "@/components/Loading"
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog"

export default function MyRatings() {
  const user = useUser()
  const [loading, setLoading] = useState(true)
  const [completed, setCompleted] = useState([])
  const [existing, setExisting] = useState({})
  const [search, setSearch] = useState("")

  useEffect(() => {
    if (!user?.id) return
    ;(async () => {
      try {
        setLoading(true)
        const [{ data: rentals, error: e1 }, { data: reviews, error: e2 }] = await Promise.all([
          supabase
            .from("rental_transactions")
            .select(
              `item_id,rental_id,
                             items (
                               title,
                               user_id,
                               main_image_url,
                               owner:users ( first_name, last_name )
                             )`,
            )
            .eq("renter_id", user.id)
            .eq("status", "completed"),
          supabase.from("reviews").select("rental_id, reviewer_id").eq("reviewer_id", user.id),
        ])
        if (e1) throw e1
        if (e2) throw e2
        setCompleted(rentals || [])
        const map = {}
        ;(reviews || []).forEach((r) => {
          map[r.rental_id] = true
        })
        setExisting(map)
      } finally {
        setLoading(false)
      }
    })()
  }, [user?.id])

  if (!user) return null

  const filtered = completed.filter((r) => (r.items?.title || "").toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="min-h-screen bg-[#FAF5EF]">
      <TopMenu activePage="my-ratings" searchTerm={search} setSearchTerm={setSearch} />
      <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold text-[#1E1E1E] tracking-tight">My Ratings</h1>
          <p className="text-[#1E1E1E]/60 text-lg">Review your completed rentals and share your experience</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loading />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filtered.length === 0 ? (
              <div className="col-span-full flex flex-col items-center justify-center py-20 space-y-4">
                <div className="w-20 h-20 rounded-full bg-[#FFAB00]/10 flex items-center justify-center">
                  <svg className="w-10 h-10 text-[#FFAB00]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                    />
                  </svg>
                </div>
                <div className="text-center space-y-2">
                  <p className="text-xl font-semibold text-[#1E1E1E]">No completed rentals yet</p>
                  <p className="text-[#1E1E1E]/60">Once you complete a rental, you'll be able to leave a review here</p>
                </div>
              </div>
            ) : (
              filtered.map((r) => (
                <Card
                  key={`${r.rental_id}-${r.item_id}`}
                  className="group border-[#1E1E1E]/10 bg-white shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 overflow-hidden"
                >
                  <CardHeader className="pb-4">
                    <CardTitle className="text-lg font-semibold text-[#1E1E1E] flex items-center gap-4">
                      <ImagePreviewThumb src={r.items?.main_image_url || "/placeholder.svg"} alt={r.items?.title} />
                      <div className="flex-1 min-w-0">
                        <div className="truncate text-pretty leading-relaxed">{r.items?.title || "Item"}</div>
                        <div className="text-sm font-normal text-[#1E1E1E]/60 mt-1 flex items-center gap-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                            />
                          </svg>
                          <span>
                            {r.items?.owner?.first_name || ""} {r.items?.owner?.last_name || ""}
                          </span>
                        </div>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    {existing[r.rental_id] ? (
                      <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                          <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-green-900">Review submitted</p>
                          <p className="text-xs text-green-700">Thank you for your feedback!</p>
                        </div>
                      </div>
                    ) : (
                      <RatingForm
                        itemId={r.item_id}
                        rentalId={r.rental_id}
                        revieweeId={r.items?.user_id}
                        userId={user.id}
                      />
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function ImagePreviewThumb({ src, alt }) {
  const imgSrc = src || "/vite.svg"
  return (
    <Dialog>
      <DialogTrigger asChild>
        <div className="relative flex-shrink-0 group/img cursor-pointer">
          <img
            src={imgSrc || "/placeholder.svg"}
            alt={alt || "Item"}
            className="w-20 h-20 object-cover rounded-xl border-2 border-[#1E1E1E]/10 group-hover/img:border-[#FFAB00] transition-all duration-300 group-hover/img:shadow-lg"
            onError={(e) => (e.currentTarget.style.display = "none")}
          />
          <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/10 rounded-xl transition-all duration-300 flex items-center justify-center">
            <svg
              className="w-6 h-6 text-white opacity-0 group-hover/img:opacity-100 transition-opacity duration-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"
              />
            </svg>
          </div>
        </div>
      </DialogTrigger>
      <DialogContent className="max-w-3xl p-2 bg-[#1E1E1E] border-[#1E1E1E]">
        <img src={imgSrc || "/placeholder.svg"} alt={alt || "Item"} className="w-full h-auto rounded-lg" />
      </DialogContent>
    </Dialog>
  )
}

function RatingForm({ itemId, rentalId, revieweeId, userId }) {
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [hoveredStar, setHoveredStar] = useState(0)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!rating) return
    try {
      setSubmitting(true)
      const { error } = await supabase.from("reviews").insert({
        item_id: itemId,
        rental_id: rentalId,
        reviewer_id: userId,
        reviewee_id: revieweeId,
        rating,
        comment,
      })
      if (error) throw error
      setSubmitted(true)
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted)
    return (
      <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg animate-in fade-in slide-in-from-bottom-2 duration-500">
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
          <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-medium text-green-900">Review submitted successfully!</p>
          <p className="text-xs text-green-700">Thank you for sharing your experience</p>
        </div>
      </div>
    )

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium text-[#1E1E1E]">Rate your experience</label>
        <div className="flex items-center gap-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              type="button"
              key={n}
              onClick={() => setRating(n)}
              onMouseEnter={() => setHoveredStar(n)}
              onMouseLeave={() => setHoveredStar(0)}
              className="group relative transition-transform duration-200 hover:scale-110 active:scale-95"
            >
              <svg
                className={`w-10 h-10 transition-all duration-200 ${
                  n <= (hoveredStar || rating)
                    ? "text-[#FFAB00] fill-[#FFAB00] drop-shadow-md"
                    : "text-[#1E1E1E]/20 fill-none"
                }`}
                stroke="currentColor"
                strokeWidth={1.5}
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                />
              </svg>
            </button>
          ))}
        </div>
        {rating > 0 && (
          <p className="text-xs text-[#1E1E1E]/60 animate-in fade-in slide-in-from-left-1 duration-300">
            {rating === 5 && "Excellent! ⭐"}
            {rating === 4 && "Great experience! 👍"}
            {rating === 3 && "Good 👌"}
            {rating === 2 && "Could be better"}
            {rating === 1 && "Not satisfied"}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-[#1E1E1E]">Share your thoughts (optional)</label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Tell us about your rental experience..."
          className="w-full border-2 border-[#1E1E1E]/10 rounded-lg p-3 text-sm text-[#1E1E1E] placeholder:text-[#1E1E1E]/40 focus:border-[#FFAB00] focus:ring-2 focus:ring-[#FFAB00]/20 transition-all duration-200 resize-none bg-white"
          rows={4}
        />
      </div>

      <Button
        type="submit"
        disabled={submitting || !rating}
        className="w-full bg-[#FFAB00] hover:bg-[#FF9500] text-[#1E1E1E] font-semibold py-6 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg active:scale-[0.98]"
      >
        {submitting ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Submitting...
          </span>
        ) : (
          "Submit Review"
        )}
      </Button>
    </form>
  )
}
