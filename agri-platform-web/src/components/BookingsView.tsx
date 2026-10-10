// src/components/BookingsView.tsx
import { useEffect, useState } from "react";
import API from "../services/api";
import { useAuth } from "../context/AuthContext";
import { Calendar, DollarSign, ShieldCheck } from "lucide-react";
import TimedNotice from "./TimedNotice";

interface Booking {
  id: number;
  equipment_name: string;
  start_date: string;
  end_date: string;
  total_acres: number;
  total_amount: number;
  status: string;
}

export default function BookingsView() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [payMsg, setPayMsg] = useState("");
  const { user } = useAuth();

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      const response = await API.get("/bookings");
      setBookings(response.data.bookings);
      setLoading(false);
    } catch (err) {
      console.error("Error fetching bookings:", err);
      setLoading(false);
    }
  };

  const handleMpesaPayment = async (bookingId: number) => {
    try {
      const response = await API.post("/bookings/pay-escrow", {
        booking_id: bookingId,
        phone_number: user?.phone_number || "0712345678",
      });
      setPayMsg(
        `Success! M-Pesa Escrow secured. Ref: ${response.data.transaction_reference}`,
      );
      fetchBookings();
    } catch (err: any) {
      setPayMsg(err.response?.data?.message || "Payment simulation failed.");
    }
  };

  if (loading)
    return <div className="p-8 text-center">Loading bookings...</div>;

  return (
    <div className="max-w-5xl mx-auto p-6">
      <h2 className="text-2xl font-bold text-green-800 mb-6 flex items-center gap-2">
        <Calendar /> My Bookings & M-Pesa Escrow Status
      </h2>

      {payMsg && (
        <TimedNotice
          key={payMsg}
          message={payMsg}
          type={payMsg.startsWith("Success!") ? "success" : "error"}
          onDismiss={() => setPayMsg("")}
        />
      )}

      {bookings.length === 0 ? (
        <p className="text-gray-600">No bookings found.</p>
      ) : (
        <div className="space-y-4">
          {bookings.map((b) => (
            <div
              key={b.id}
              className="bg-white border rounded-lg p-5 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
            >
              <div>
                <span
                  className={`text-xs uppercase px-2 py-1 rounded font-semibold ${b.status === "confirmed" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}`}
                >
                  Status: {b.status}
                </span>
                <h3 className="text-xl font-bold mt-2 text-gray-800">
                  {b.equipment_name}
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  Dates: {new Date(b.start_date).toLocaleDateString()} to{" "}
                  {new Date(b.end_date).toLocaleDateString()}
                </p>
                {b.total_acres && (
                  <p className="text-sm text-gray-600">
                    Total Acres: {b.total_acres}
                  </p>
                )}
                <p className="text-sm font-semibold text-green-700 mt-1 flex items-center gap-1">
                  <DollarSign size={16} /> Total Amount: KES {b.total_amount}
                </p>
              </div>

              {user?.role === "farmer" && b.status === "pending" && (
                <button
                  onClick={() => handleMpesaPayment(b.id)}
                  className="button-primary px-4 py-2 rounded font-medium transition flex items-center gap-1"
                >
                  <ShieldCheck size={18} /> Pay via M-Pesa (Escrow)
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
