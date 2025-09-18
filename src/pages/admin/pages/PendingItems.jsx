import React from "react";
import AdminLayout from "../../../components/AdminLayout";
import { Button } from "@/components/ui/button";

export default function PendingItems() {
  const pendingItems = [
    {
      id: "#ITEM001",
      requestDate: "25/09/2022",
      name: "Canon DSLR Camera",
      fileLink: "#",
      description: "Professional camera with lens kit, good for photography.",
    },
    {
      id: "#ITEM002",
      requestDate: "26/09/2022",
      name: "Electric Guitar",
      fileLink: "#",
      description: "Yamaha electric guitar, comes with amplifier.",
    },
  ];

  return (
    <AdminLayout className="bg-[#FFFBF2] min-h-screen">
      <div className="p-6">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Pending Items 📦
          </h1>
          <p className="text-gray-600">
            Review and approve items submitted by users
          </p>
        </div>


          <div className="flex gap-6 mb-6">
            <input
              placeholder="Enter Item Name"
              className="border py-3 px-4 rounded w-1/3"
            />
            <input
              placeholder="Enter Item ID"
              className="border py-3 px-4 rounded w-1/3"
            />
            <input
              type="date"
              placeholder="Request Date"
              className="border py-3 px-4 rounded w-1/3"
            />
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b">
                <th className="p-2">
                  <input type="checkbox" />
                </th>
                <th className="p-2">Item ID</th>
                <th className="p-2">Request Date</th>
                <th className="p-2">Item Name</th>
                <th className="p-2">Submitted Photo</th>
                <th className="p-2">Description</th>
                <th className="p-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {pendingItems.map((item) => (
                <tr key={item.id} className="border-b">
                  <td className="p-2">
                    <input type="checkbox" />
                  </td>
                  <td className="p-2 text-[#FF9900] font-medium">{item.id}</td>
                  <td className="p-2">{item.requestDate}</td>
                  <td className="p-2">{item.name}</td>
                  <td className="p-2">
                    <a
                      href={item.fileLink}
                      className="text-blue-500 underline"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      File Link
                    </a>
                  </td>
                  <td className="p-2 text-gray-700">{item.description}</td>
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
