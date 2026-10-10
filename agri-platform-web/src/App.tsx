// src/App.tsx
import { useState } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Navbar from "./components/Navbar";
import Marketplace from "./components/Marketplace";
import OwnerDashboard from "./components/OwnerDashboard";
import BookingsView from "./components/BookingsView";
import AuthModal from "./components/AuthModal";
import LandingPage from "./components/LandingPage";

type AppTab = "marketplace" | "owner" | "bookings";

function MainContent() {
  const { user, logout } = useAuth();
  const [selectedTab, setSelectedTab] = useState<{
    roleKey: string;
    tab: AppTab;
  } | null>(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const roleKey = user ? `${user.id}:${user.role}` : null;
  const roleHome = user?.role === "farmer"
    ? "marketplace"
    : user?.role === "equipment_owner"
      ? "owner"
      : null;
  const allowedTabs: AppTab[] =
    user?.role === "farmer"
      ? ["marketplace", "bookings"]
      : user?.role === "equipment_owner"
        ? ["owner", "bookings"]
        : [];
  const activeTab = roleHome
    ? selectedTab?.roleKey === roleKey && allowedTabs.includes(selectedTab.tab)
      ? selectedTab.tab
      : roleHome
    : null;

  const setActiveTab = (tab: AppTab) => {
    if (roleKey && allowedTabs.includes(tab)) {
      setSelectedTab({ roleKey, tab });
    }
  };

  const handleLogout = () => {
    setSelectedTab(null);
    logout();
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 selection:bg-emerald-600 selection:text-white">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onGetStarted={() => setIsAuthOpen(true)}
        onLogout={handleLogout}
      />
      <main className="flex-grow">
        {!user && <LandingPage onGetStarted={() => setIsAuthOpen(true)} />}
        {user?.role === "farmer" && activeTab === "marketplace" && <Marketplace />}
        {user && activeTab === "bookings" && <BookingsView />}
        {user?.role === "equipment_owner" && activeTab === "owner" && (
          <OwnerDashboard
            onListingCreated={() => setActiveTab("owner")}
          />
        )}
        {user && !roleHome && (
          <section className="role-unavailable">
            <h1>Your account is signed in</h1>
            <p>
              This workspace is not configured for the{" "}
              {user.role.replaceAll("_", " ")} role. Please contact an
              administrator for access.
            </p>
          </section>
        )}
      </main>
      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainContent />
    </AuthProvider>
  );
}
