// src/components/Marketplace.tsx
import React, { useEffect, useState } from "react";
import { isAxiosError } from "axios";
import API from "../services/api";
import {
  Tractor,
  MapPin,
  ShieldCheck,
  Search,
  ArrowRight,
} from "lucide-react";
import TimedNotice from "./TimedNotice";

interface Equipment {
  id: number;
  name: string;
  category: string;
  description: string | null;
  price_per_acre: number;
  owner_name: string;
  owner_phone: string;
  county: string | null;
  image_urls?: string[];
}

type SearchField = "name" | "price" | "county" | "category" | "description";

export default function Marketplace() {
  const [equipmentList, setEquipmentList] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEquip, setSelectedEquip] = useState<Equipment | null>(null);
  const [acres, setAcres] = useState(1);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [bookingMessage, setBookingMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchField, setSearchField] = useState<SearchField>("name");
  const [selectedCategory, setSelectedCategory] = useState("All");

  useEffect(() => {
    let cancelled = false;
    const loadEquipment = async () => {
      try {
        const response = await API.get("/equipment");
        if (!cancelled) {
          setEquipmentList(response.data.equipment);
          setLoading(false);
        }
      } catch (err) {
        console.error("Error fetching equipment:", err);
        if (!cancelled) setLoading(false);
      }
    };

    void loadEquipment();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEquip) return;

    try {
      const response = await API.post("/bookings", {
        equipment_id: selectedEquip.id,
        start_date: startDate,
        end_date: endDate,
        total_acres: Number(acres),
      });
      setBookingMessage(
        `Booking successful! Reference ID: #${response.data.booking.id}. Total: KES ${response.data.booking.total_amount}`,
      );
      setSelectedEquip(null);
    } catch (err: unknown) {
      const responseMessage = isAxiosError<{ message?: string }>(err)
        ? err.response?.data?.message
        : undefined;
      setBookingMessage(
        responseMessage ||
          "Failed to create booking. Ensure you are logged in as a farmer.",
      );
    }
  };

  const filteredEquipment = equipmentList.filter((item) => {
    const query = searchQuery.trim().toLocaleLowerCase();
    const valueByField: Record<SearchField, string> = {
      name: item.name,
      price: String(item.price_per_acre),
      county: item.county ?? "",
      category: item.category,
      description: item.description ?? "",
    };
    const normalizedValue =
      searchField === "price"
        ? valueByField[searchField].replace(/[,\s]/g, "")
        : valueByField[searchField].toLocaleLowerCase();
    const normalizedQuery =
      searchField === "price" ? query.replace(/[,\s]/g, "") : query;
    const matchesSearch = normalizedValue.includes(normalizedQuery);
    const matchesCategory =
      selectedCategory === "All" || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center bg-slate-50">
        <div className="w-14 h-14 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-slate-600 font-semibold text-lg">
          Loading verified machinery near you...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* High-End SaaS Hero Section */}
      <div className="marketplace-hero bg-gradient-to-br from-emerald-950 via-green-900 to-teal-950 text-white py-20 px-6 shadow-2xl relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:24px_24px]"></div>
        <div className="max-w-7xl mx-auto relative z-10 flex flex-col lg:flex-row justify-between items-center gap-12">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 bg-emerald-800/60 border border-emerald-600/60 text-emerald-200 px-4 py-2 rounded-full text-xs font-bold tracking-wider uppercase mb-6 shadow-sm backdrop-blur-md">
              <ShieldCheck size={16} className="text-emerald-400" /> M-Pesa
              Secured Escrow Platform
            </div>
            <h1 className="text-5xl lg:text-6xl font-black tracking-tight leading-none text-white">
              Find machinery for your farm
            </h1>
            <p className="mt-6 text-emerald-100/90 text-lg lg:text-xl font-normal leading-relaxed">
              Search available equipment by name or county, compare rental
              rates, and book the machine that fits your field.
            </p>
            <ol className="farmer-booking-steps" aria-label="How to book a machine">
              <li><span>1</span> Search and filter machines</li>
              <li><span>2</span> Compare rates and owner details</li>
              <li><span>3</span> Choose dates and confirm your booking</li>
            </ol>
          </div>

          <div className="bg-white/10 backdrop-blur-xl border border-white/20 p-8 rounded-3xl shadow-2xl w-full lg:w-80 flex flex-col gap-6">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-emerald-600 rounded-2xl shadow-lg">
                <Tractor className="w-8 h-8 text-white" />
              </div>
              <div>
                <p className="text-3xl font-black">{equipmentList.length}</p>
                <p className="text-xs text-emerald-300 uppercase tracking-widest font-bold">
                  Active Machines
                </p>
              </div>
            </div>
            <div className="border-t border-white/10 pt-4 flex justify-between text-xs text-emerald-200">
              <span className="font-medium">Payment option</span>
              <span className="font-extrabold text-white">M-Pesa escrow</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-6 -mt-8 relative z-20">
        {bookingMessage && (
          <TimedNotice
            key={bookingMessage}
            message={bookingMessage}
            type={bookingMessage.startsWith("Booking successful") ? "success" : "error"}
            onDismiss={() => setBookingMessage("")}
          />
        )}

        <section className="farmer-machinery-section" aria-labelledby="available-machinery-title">
        <div className="farmer-machinery-heading">
          <div>
            <h2 id="available-machinery-title">Available machinery</h2>
            <p>Browse the listings below and book directly from a machine card.</p>
          </div>
          <span>{filteredEquipment.length} found</span>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="bg-white p-5 rounded-3xl shadow-xl border border-slate-200/80 mb-10 flex flex-col lg:flex-row gap-4 items-center justify-between">
          <div className="marketplace-search w-full lg:w-[34rem]">
            <div className="marketplace-search-controls">
              <label className="marketplace-search-select-wrap">
                <span className="sr-only">Search by</span>
                <select
                  aria-label="Choose what to search by"
                  value={searchField}
                  onChange={(event) =>
                    setSearchField(event.target.value as SearchField)
                  }
                >
                  <option value="name">Machine name</option>
                  <option value="price">Price per acre</option>
                  <option value="county">County</option>
                  <option value="category">Category</option>
                  <option value="description">Description</option>
                </select>
              </label>
              <label className="marketplace-search-input-wrap">
                <Search className="marketplace-search-icon text-slate-400 w-5 h-5" aria-hidden="true" />
                <span className="sr-only">Search available machines</span>
                <input
                  type="search"
                  inputMode={searchField === "price" ? "decimal" : "search"}
                  maxLength={100}
                  placeholder={
                    searchField === "price"
                      ? "Enter a price in KES"
                      : `Search by ${searchField}`
                  }
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="marketplace-search-input"
                />
              </label>
            </div>
            <small className="marketplace-search-counter">
              {100 - searchQuery.length} characters remaining
            </small>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto w-full lg:w-auto pb-2 lg:pb-0">
            {["All", "Tractor", "Plow", "Planter", "Sprayer", "Harvester"].map(
              (cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`button-secondary px-5 py-2.5 rounded-2xl text-xs font-bold transition whitespace-nowrap shadow-sm ${
                    selectedCategory === cat
                      ? "is-active bg-emerald-900 text-white shadow-md scale-105"
                      : ""
                  }`}
                >
                  {cat}
                </button>
              ),
            )}
          </div>
        </div>

        {/* Equipment Grid */}
        {filteredEquipment.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-slate-200 shadow-sm">
            <Tractor className="w-16 h-16 text-slate-300 mx-auto mb-3" />
            <h3 className="text-xl font-bold text-slate-800">
              No equipment found
            </h3>
            <p className="text-sm text-slate-500 mt-1">
              Try adjusting your search criteria or category filter.
            </p>
          </div>
        ) : (
          <div className="farmer-equipment-grid">
            {filteredEquipment.map((item) => (
              <div
                key={item.id}
                className="bg-white border border-slate-200/80 rounded-3xl shadow-sm hover:shadow-2xl transition-all duration-300 flex flex-col justify-between overflow-hidden group"
              >
                {item.image_urls?.length ? (
                  <div className="equipment-card-gallery">
                    {item.image_urls.map((imageUrl, index) => (
                      <img
                        key={imageUrl}
                        src={new URL(imageUrl, API.defaults.baseURL).toString()}
                        alt={`${item.name} photo ${index + 1}`}
                        loading="lazy"
                      />
                    ))}
                  </div>
                ) : (
                  <div className="equipment-card-placeholder">
                    <Tractor aria-hidden="true" />
                    <span>No equipment photos</span>
                  </div>
                )}
                <div className="p-7">
                  <div className="flex justify-between items-start mb-4">
                    <span className="text-[11px] uppercase tracking-wider bg-emerald-50 text-emerald-800 px-3 py-1 rounded-full font-extrabold border border-emerald-200/60">
                      {item.category}
                    </span>
                    <span className="equipment-location text-xs text-slate-500 font-semibold flex items-center gap-1">
                      <MapPin size={14} className="text-emerald-600" />{" "}
                      {item.county || "Kenya"}
                    </span>
                  </div>

                  <h3 className="text-2xl font-black text-slate-900 group-hover:text-emerald-700 transition duration-200">
                    {item.name}
                  </h3>
                  <p className="text-slate-600 text-sm mt-2.5 line-clamp-2 leading-relaxed">
                    {item.description ||
                      "Verified agricultural machinery ready for immediate farm deployment."}
                  </p>

                  <div className="mt-6 pt-5 border-t border-slate-100 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        Rental Rate
                      </span>
                      <span className="equipment-rate font-black text-emerald-700 text-xl flex items-baseline">
                        KES {item.price_per_acre}{" "}
                        <span className="text-xs font-bold text-slate-500 ml-1">
                          / acre
                        </span>
                      </span>
                    </div>

                    <div className="equipment-owner-box bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                      <span className="equipment-owner-label text-slate-500 font-semibold">
                        Owner Contact:
                      </span>
                      <span className="equipment-owner-contact font-bold text-slate-800">
                        {item.owner_name} ({item.owner_phone})
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-5 bg-slate-50/80 border-t border-slate-100">
                  <button
                    onClick={() => setSelectedEquip(item)}
                    className="button-primary w-full font-bold py-3.5 px-4 rounded-2xl shadow-lg transition duration-200 flex items-center justify-center gap-2"
                  >
                    <span>Book Machinery Now</span>
                    <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        </section>

        {/* Booking Modal */}
        {selectedEquip && (
          <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-3xl max-w-md w-full p-8 shadow-2xl border border-slate-100 relative animate-in fade-in zoom-in duration-200">
              <div className="mb-6">
                <span className="text-xs font-extrabold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full uppercase tracking-wider">
                  Secure Escrow Booking
                </span>
                <h2 className="text-2xl font-black text-slate-900 mt-2">
                  {selectedEquip.name}
                </h2>
                <p className="text-sm font-medium text-slate-500 mt-1">
                  Rate: KES {selectedEquip.price_per_acre} per acre
                </p>
              </div>

              <form onSubmit={handleBooking} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Total Acres to Farm
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={acres}
                    onChange={(e) => setAcres(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-300 rounded-2xl p-3.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Start Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-2xl p-3.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    End Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-2xl p-3.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    required
                  />
                </div>

                <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl flex justify-between items-center mt-4">
                  <span className="text-sm font-bold text-emerald-950">
                    Estimated Escrow Total:
                  </span>
                  <span className="text-xl font-black text-emerald-700">
                    KES {selectedEquip.price_per_acre * acres}
                  </span>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setSelectedEquip(null)}
                    className="button-secondary w-1/2 py-3.5 rounded-2xl transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="button-primary w-1/2 py-3.5 rounded-2xl shadow-lg transition"
                  >
                    Confirm Order
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
