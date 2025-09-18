import React from "react";
import AdminLayout from "../../../components/AdminLayout";
import { Button } from "@/components/ui/button";

export default function PendingUser() {
  const pendingUsers = [
    {
      id: "#AHGA68",
      signupDate: "23/09/2022",
      name: "Jacob Marcus",
      fileLink: "#",
    },
    {
      id: "#AHGA69",
      signupDate: "24/09/2022",
      name: "Maria Santos",
      fileLink: "#",
    },
  ];

  return (
    <AdminLayout className="bg-[#FFFBF2] min-h-screen">
      <div className="p-6">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Pending User Accounts 👥
          </h1>
          <p className="text-gray-600">
            Review and approve new user registrations
          </p>
        </div>
        
          <div className="flex gap-6 mb-6"> 
            <input
              placeholder="Enter User Name"
              className="border py-3 px-4 rounded w-1/3"
            />
            <input
              placeholder="Enter User ID"
              className="border py-3 px-4 rounded w-1/3"
            />
            <input
              placeholder="Sign Up Date"
              type="date"
              className="border py-3 px-4 rounded w-1/3"
            />
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b">
                <th className="p-2">
                  <input type="checkbox" />
                </th>
                <th className="p-2">User ID</th>
                <th className="p-2">Sign Up Date</th>
                <th className="p-2">User</th>
                <th className="p-2">Submitted ID</th>
                <th className="p-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {pendingUsers.map((user) => (
                <tr key={user.id} className="border-b">
                  <td className="p-2">
                    <input type="checkbox" />
                  </td>
                  <td className="p-2 text-[#FF9900] font-medium">{user.id}</td>
                  <td className="p-2">{user.signupDate}</td>
                  <td className="p-2">{user.name}</td>
                  <td className="p-2">
                    <a href={user.fileLink} className="text-blue-500 underline">
                      File Link
                    </a>
                  </td>
                  <td className="p-2 flex gap-2">
                    <Button className="bg-green-600 text-white hover:bg-green-700">
                      Accept
                    </Button>
                    <Button className="bg-red-600 text-white hover:bg-red-700">
                      Reject
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

    </AdminLayout>
  );
}
