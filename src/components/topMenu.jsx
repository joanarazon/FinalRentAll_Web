import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useUser } from "../hooks/useUser";
import { Heart, Menu } from "lucide-react";
import { useState } from "react";

export default function TopMenu() {
  const user = useUser();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="bg-[#FFFBF2] shadow-md px-4 py-3 md:px-6 flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-0">
      
      {/* Left: Logo + Links */}
      <div className="flex items-center justify-between md:justify-start gap-3 md:gap-6 w-full md:w-auto">
        <h1 className="text-xl font-bold">RentAll</h1>

        {/* Desktop Links */}
        <div className="hidden md:flex items-center gap-6">
          <Button variant="link" className="text-gray-600 hover:text-black">Home</Button>
          <Button variant="link" className="text-gray-600 hover:text-black">Inbox</Button>
          <Button variant="link" className="text-gray-600 hover:text-black">Notifications</Button>
        </div>

        {/* Mobile menu button */}
        <Button 
          variant="ghost" 
          className="md:hidden"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          <Menu className="w-6 h-6" />
        </Button>
      </div>

      {/* Mobile links */}
      {mobileMenuOpen && (
        <div className="flex flex-col gap-2 md:hidden mt-2">
          <Button variant="link" className="text-gray-600 hover:text-black">Home</Button>
          <Button variant="link" className="text-gray-600 hover:text-black">Inbox</Button>
          <Button variant="link" className="text-gray-600 hover:text-black">Notifications</Button>
        </div>
      )}

      {/* Right: Search + Heart + Avatar */}
      <div className="flex items-center gap-3 md:gap-4 w-full md:w-auto mt-2 md:mt-0">
        <input
          type="text"
          placeholder="Search..."
          className="flex-1 md:flex-none px-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring focus:border-blue-500"
        />

        <Button variant="ghost">
          <Heart className="text-gray-500 w-5 h-5 md:w-6 md:h-6" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger>
            {user ? (
              <Avatar>
                <AvatarImage src={user.face_image_url} alt="Profile" />
                <AvatarFallback>
                  {user.first_name?.[0]}{user.last_name?.[0]}
                </AvatarFallback>
              </Avatar>
            ) : (
              <Avatar>
                <AvatarFallback>JD</AvatarFallback>
              </Avatar>
            )}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>Profile</DropdownMenuItem>
            <DropdownMenuItem>Settings</DropdownMenuItem>
            <DropdownMenuItem>Logout</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
