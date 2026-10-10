// src/components/Navbar.tsx
import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { Tractor, User as UserIcon, LogOut, Menu, X } from "lucide-react";

interface NavbarProps {
  activeTab: "marketplace" | "owner" | "bookings" | null;
  setActiveTab: (tab: "marketplace" | "owner" | "bookings") => void;
  onGetStarted: () => void;
  onLogout: () => void;
}

export default function Navbar({
  activeTab,
  setActiveTab,
  onGetStarted,
  onLogout,
}: NavbarProps) {
  const { user } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="site-header sticky top-0 z-50 bg-emerald-950/95 backdrop-blur-md border-b border-emerald-800/50 text-white shadow-xl">
      <div className="max-w-7xl mx-auto px-6 h-20 flex justify-between items-center">
        {/* Brand Logo */}
        <div
          onClick={() => {
            if (user?.role === "farmer") setActiveTab("marketplace");
            if (user?.role === "equipment_owner") setActiveTab("owner");
          }}
          className="flex items-center gap-3 cursor-pointer group"
        >
          <div className="bg-gradient-to-tr from-emerald-600 to-teal-500 p-3 rounded-2xl shadow-lg group-hover:scale-105 transition duration-300">
            <Tractor className="w-6 h-6 text-white" />
          </div>
          <div>
            <span className="font-black text-2xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-emerald-100 to-emerald-300">
              AgriShare
            </span>
            <span className="block text-[10px] uppercase tracking-widest text-emerald-400 font-bold">
              Kenya Enterprise
            </span>
          </div>
        </div>

        {/* Desktop Navigation Links */}
        {user && (user.role === "farmer" || user.role === "equipment_owner") && (
          <nav className="header-desktop-nav hidden md:flex items-center gap-2 bg-emerald-900/40 p-1.5 rounded-2xl border border-emerald-700/40 shadow-inner">
            {user.role === "farmer" && (
              <button
                onClick={() => setActiveTab("marketplace")}
                aria-current={activeTab === "marketplace" ? "page" : undefined}
                className={`header-nav-button px-6 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${activeTab === "marketplace" ? "is-active" : ""}`}
              >
                Marketplace
              </button>
            )}
            <button
              onClick={() => setActiveTab("bookings")}
              aria-current={activeTab === "bookings" ? "page" : undefined}
              className={`header-nav-button px-6 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${activeTab === "bookings" ? "is-active" : ""}`}
            >
              My Bookings & Escrow
            </button>
            {user.role === "equipment_owner" && (
              <button
                onClick={() => setActiveTab("owner")}
                aria-current={activeTab === "owner" ? "page" : undefined}
                className={`header-nav-button px-6 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${activeTab === "owner" ? "is-active" : ""}`}
              >
                Owner Dashboard
              </button>
            )}
          </nav>
        )}

        {/* User Profile / Auth Action */}
        <div className="hidden md:flex items-center gap-4">
          {user ? (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-3 bg-emerald-900/60 border border-emerald-700/60 px-4 py-2 rounded-2xl shadow-sm">
                <div className="bg-emerald-600 p-2 rounded-xl">
                  <UserIcon size={16} className="text-white" />
                </div>
                <div className="text-left">
                  <p className="text-xs font-bold leading-tight text-white">
                    {user.full_name}
                  </p>
                  <p className="text-[10px] text-emerald-400 font-extrabold uppercase tracking-wider">
                    {user.role}
                  </p>
                </div>
              </div>
              <button
                onClick={onLogout}
                title="Logout"
                className="header-logout-button p-3 rounded-2xl shadow transition duration-200"
              >
                <LogOut size={18} />
              </button>
            </div>
          ) : (
            <button
              onClick={onGetStarted}
              className="header-cta-button font-bold px-7 py-3 rounded-2xl shadow-xl transition-all duration-200"
            >
              Get Started
            </button>
          )}
        </div>

        {/* Mobile Toggle */}
        <div className="md:hidden">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="header-menu-toggle p-2"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="header-mobile-drawer md:hidden bg-emerald-950 border-t border-emerald-800 p-6 space-y-4">
          {user?.role === "farmer" && (
            <button
              onClick={() => {
                setActiveTab("marketplace");
                setMobileMenuOpen(false);
              }}
              className={`header-mobile-nav-button block w-full text-left py-3 px-4 rounded-xl text-sm font-semibold ${activeTab === "marketplace" ? "is-active" : ""}`}
            >
              Marketplace
            </button>
          )}
          {(user?.role === "farmer" || user?.role === "equipment_owner") && (
            <button
              onClick={() => {
                setActiveTab("bookings");
                setMobileMenuOpen(false);
              }}
              className={`header-mobile-nav-button block w-full text-left py-3 px-4 rounded-xl text-sm font-semibold ${activeTab === "bookings" ? "is-active" : ""}`}
            >
              My Bookings & Escrow
            </button>
          )}
          {user?.role === "equipment_owner" && (
            <button
              onClick={() => {
                setActiveTab("owner");
                setMobileMenuOpen(false);
              }}
              className={`header-mobile-nav-button block w-full text-left py-3 px-4 rounded-xl text-sm font-semibold ${activeTab === "owner" ? "is-active" : ""}`}
            >
              Owner Dashboard
            </button>
          )}
          <div className="pt-4 border-t border-emerald-800">
            {user ? (
              <div className="flex justify-between items-center">
                <span className="text-xs text-emerald-300 font-bold">
                  {user.full_name} ({user.role})
                </span>
                <button
                  onClick={onLogout}
                  className="header-mobile-logout text-xs font-bold flex items-center gap-1"
                >
                  <LogOut size={14} /> Logout
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  onGetStarted();
                  setMobileMenuOpen(false);
                }}
                className="header-cta-button w-full font-bold py-3 rounded-xl text-center shadow-lg"
              >
                Login / Register
              </button>
            )}
          </div>
        </div>
      )}

    </header>
  );
}
