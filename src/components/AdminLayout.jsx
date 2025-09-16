import React from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
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
        {/* Mobile top bar */}
        <div className="md:hidden flex items-center p-4 border-b">
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
          {children}
        </main>
      </div>
    </div>
  );
}
