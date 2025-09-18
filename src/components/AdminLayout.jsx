import React from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu, Bell, User } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import AdminSidebarMenu from "./AdminSidebarMenu";
import { cn } from "@/lib/utils";

export default function AdminLayout({ children, className }) {
  return (
    <div className={cn("flex h-screen w-full", className)}>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-64 bg-white border-r flex-col">
        <ScrollArea className="flex-1">
          <nav className="flex flex-col p-4 gap-2">
            <AdminSidebarMenu />
          </nav>
        </ScrollArea>
      </aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col">
        {/* Mobile sidebar toggle only */}
        <div className="md:hidden flex items-center p-4 border-b bg-white">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon">
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-64">
              <ScrollArea className="h-full">
                <nav className="flex flex-col p-4 gap-2">
                  <AdminSidebarMenu />
                </nav>
              </ScrollArea>
            </SheetContent>
          </Sheet>
        </div>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-6 bg-[#FFFBF2] md:ml-0">
          {/* Top header actions row */}
          <div className="flex items-center justify-between mb-8">
            {/* Left: This slot is for the page header (children will inject the title) */}
            <div className="flex-1">
              {/* Page header content goes inside children */}
            </div>

            {/* Right: bell + profile */}
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon">
                <Bell className="w-5 h-5 text-gray-600" />
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-2">
                    <User className="w-5 h-5 text-gray-600" />
                    <span className="hidden md:inline">Admin</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                  <DropdownMenuItem>Profile</DropdownMenuItem>
                  <DropdownMenuItem>Settings</DropdownMenuItem>
                  <DropdownMenuItem className="text-red-600">Logout</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          
          {children}
        </main>
      </div>
    </div>
  );
}
