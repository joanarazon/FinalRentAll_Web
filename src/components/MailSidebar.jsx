// src/components/MailSidebar.jsx
import React from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function MailSidebar({ activePage }) {
  const linkClass = (page) =>
    `justify-start cursor-pointer ${activePage === page
      ? "bg-gray-200 font-bold" // active style
      : ""
    }`;

  return (
    <aside className="w-64 bg-[#FFFBF2] border-r flex flex-col">
      <ScrollArea className="flex-1 bg-[#FFFBF2]">
        <nav className="flex flex-col p-4 gap-2">
          <p className="mb-5">Messages</p>
          <Button variant="ghost" className={linkClass("inbox")}>Inbox</Button>
        </nav>
      </ScrollArea>
    </aside>
  );
}