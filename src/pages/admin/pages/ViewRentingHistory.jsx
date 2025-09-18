import { useUser } from "../../../hooks/useUser";
import AdminLayout from "../../../components/AdminLayout"

function ViewRentingHistory() {
  const user = useUser();

  // Example data (replace with API call later)
  const rentals = [
    {
      id: "#AHGA68",
      date: "23/09/2022",
      item: "Chain Saw",
      status: "Completed",
    },
    {
      id: "#AHGA68",
      date: "23/09/2022",
      item: "Calculator",
      status: "Completed",
    },
    {
      id: "#AHGA68",
      date: "23/09/2022",
      item: "Darna Costume",
      status: "Completed",
    },
    { id: "#AHGA68", date: "23/09/2022", item: "Jag", status: "Completed" },
    { id: "#AHGA68", date: "23/09/2022", item: "Drum Set", status: "Pending" },
    {
      id: "#AHGA68",
      date: "23/09/2022",
      item: "Acoustic Guitar",
      status: "Ongoing",
    },
    {
      id: "#AHGA68",
      date: "23/09/2022",
      item: "Uno Cards",
      status: "Cancelled",
    },
    {
      id: "#AHGA68",
      date: "23/09/2022",
      item: "Grass Cutter",
      status: "Pending",
    },
    {
      id: "#AHGA68",
      date: "23/09/2022",
      item: "Room for 2",
      status: "Completed",
    },
  ];

  return (
    <AdminLayout className="bg-[#FFFBF2] min-h-screen">
      {/* Page Title */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">
          Welcome, {user?.first_name || "Admin"}
        </h1>
        <p className="mt-1 text-gray-600">Renting History</p>
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-6">
        <input
          type="text"
          placeholder="Enter Item Name"
          className="px-3 py-2 border rounded-md w-1/4"
        />
        <input
          type="text"
          placeholder="Enter User ID"
          className="px-3 py-2 border rounded-md w-1/4"
        />
        <input type="date" className="px-3 py-2 border rounded-md w-1/4" />
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-100 text-gray-700">
            <tr>
              <th className="p-3">
                <input type="checkbox" />
              </th>
              <th className="p-3">Rental ID</th>
              <th className="p-3">Renting Start Date</th>
              <th className="p-3">Item Name</th>
              <th className="p-3">Status</th>
            </tr>
          </thead>
          <tbody className="text-gray-600">
            {rentals.map((rental, index) => (
              <tr key={index} className="border-b hover:bg-gray-50 transition">
                <td className="p-3">
                  <input type="checkbox" />
                </td>
                <td className="p-3 text-orange-500 font-semibold">
                  {rental.id}
                </td>
                <td className="p-3">{rental.date}</td>
                <td className="p-3">{rental.item}</td>
                <td className="p-3">
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium
                      ${
                        rental.status === "Completed"
                          ? "bg-green-100 text-green-700"
                          : rental.status === "Pending"
                          ? "bg-yellow-100 text-yellow-700"
                          : rental.status === "Ongoing"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-red-100 text-red-700"
                      }`}
                  >
                    {rental.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  );
}

export default ViewRentingHistory;