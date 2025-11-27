"use client"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import Link from "next/link"

interface TopMenuProps {
  activePage?: string
  searchTerm?: string
  setSearchTerm?: (term: string) => void
}

export default function TopMenu({ activePage, searchTerm = "", setSearchTerm }: TopMenuProps) {
  const navItems = [
    { id: "home", label: "Home", href: "/" },
    { id: "my-rentals", label: "My Rentals", href: "/my-rentals" },
    { id: "my-ratings", label: "My Ratings", href: "/my-ratings" },
    { id: "browse", label: "Browse", href: "/browse" },
  ]

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[#1E1E1E]/10 bg-white/80 backdrop-blur-lg shadow-sm">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between gap-6">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-10 h-10 rounded-lg bg-[#FFAB00] flex items-center justify-center group-hover:scale-105 transition-transform duration-200">
              <svg className="w-6 h-6 text-[#1E1E1E]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                />
              </svg>
            </div>
            <span className="text-xl font-bold text-[#1E1E1E] hidden sm:block">RentHub</span>
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <Link key={item.id} href={item.href}>
                <Button
                  variant="ghost"
                  className={`relative px-4 py-2 text-sm font-medium transition-all duration-200 ${
                    activePage === item.id
                      ? "text-[#FFAB00] bg-[#FFAB00]/10"
                      : "text-[#1E1E1E]/70 hover:text-[#1E1E1E] hover:bg-[#1E1E1E]/5"
                  }`}
                >
                  {item.label}
                  {activePage === item.id && (
                    <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/2 h-0.5 bg-[#FFAB00] rounded-full" />
                  )}
                </Button>
              </Link>
            ))}
          </nav>

          {/* Search */}
          {setSearchTerm && (
            <div className="flex-1 max-w-md">
              <div className="relative">
                <svg
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#1E1E1E]/40"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                <Input
                  type="text"
                  placeholder="Search items..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border-[#1E1E1E]/10 focus:border-[#FFAB00] focus:ring-[#FFAB00]/20 bg-[#FAF5EF]/50"
                />
              </div>
            </div>
          )}

          {/* User Menu */}
          <Button variant="ghost" size="icon" className="rounded-full w-10 h-10 bg-[#1E1E1E]/5 hover:bg-[#1E1E1E]/10">
            <svg className="w-5 h-5 text-[#1E1E1E]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
          </Button>
        </div>
      </div>
    </header>
  )
}
