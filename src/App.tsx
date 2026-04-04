import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, useLocation, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import BottomNav from "@/components/BottomNav";

// Lazy-loaded pages
const Landing = lazy(() => import("./pages/Landing"));
const AuthPage = lazy(() => import("./pages/AuthPage"));
const GroupSetupPage = lazy(() => import("./pages/GroupSetupPage"));
const CoupleSetupPage = lazy(() => import("./pages/CoupleSetupPage"));
const FriendSetupPage = lazy(() => import("./pages/FriendSetupPage"));
const HomePage = lazy(() => import("./pages/HomePage"));
const MapPage = lazy(() => import("./pages/MapPage"));
const CreatePage = lazy(() => import("./pages/CreatePage"));
const DiaryPage = lazy(() => import("./pages/DiaryPage"));
const TripPlanPage = lazy(() => import("./pages/TripPlanPage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const CouplePage = lazy(() => import("./pages/CouplePage"));
const FriendsPage = lazy(() => import("./pages/FriendsPage"));
const NotificationsPage = lazy(() => import("./pages/NotificationsPage"));
const NotificationSettingsPage = lazy(() => import("./pages/NotificationSettingsPage"));
const PremiumPage = lazy(() => import("./pages/PremiumPage"));
const MemoryDetailPage = lazy(() => import("./pages/MemoryDetailPage"));
const TripHistoryPage = lazy(() => import("./pages/TripHistoryPage"));
const ProfileBackgroundPage = lazy(() => import("./pages/ProfileBackgroundPage"));
const ExpensePage = lazy(() => import("./pages/ExpensePage"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10,   // 10 minutes
      refetchOnWindowFocus: false,
    },
  },
});

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
);

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (!user) return <Navigate to="/auth" replace />;
  return <>{children}</>;
};

const AppLayout = () => {
  const location = useLocation();
  const publicPaths = ["/", "/auth", "/group-setup", "/couple-setup", "/friend-setup"];
  const showNav = !publicPaths.includes(location.pathname);

  return (
    <>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/group-setup" element={<ProtectedRoute><GroupSetupPage /></ProtectedRoute>} />
          <Route path="/couple-setup" element={<ProtectedRoute><CoupleSetupPage /></ProtectedRoute>} />
          <Route path="/friend-setup" element={<ProtectedRoute><FriendSetupPage /></ProtectedRoute>} />
          <Route path="/home" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
          <Route path="/map" element={<ProtectedRoute><MapPage /></ProtectedRoute>} />
          <Route path="/create" element={<ProtectedRoute><CreatePage /></ProtectedRoute>} />
          <Route path="/diary" element={<ProtectedRoute><DiaryPage /></ProtectedRoute>} />
          <Route path="/trip-plan" element={<ProtectedRoute><TripPlanPage /></ProtectedRoute>} />
          <Route path="/couple" element={<ProtectedRoute><CouplePage /></ProtectedRoute>} />
          <Route path="/friends" element={<ProtectedRoute><FriendsPage /></ProtectedRoute>} />
          <Route path="/global-map" element={<ProtectedRoute><MapPage /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
          <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
          <Route path="/notification-settings" element={<ProtectedRoute><NotificationSettingsPage /></ProtectedRoute>} />
          <Route path="/premium" element={<ProtectedRoute><PremiumPage /></ProtectedRoute>} />
          <Route path="/memory/:id" element={<ProtectedRoute><MemoryDetailPage /></ProtectedRoute>} />
          <Route path="/trip-history" element={<ProtectedRoute><TripHistoryPage /></ProtectedRoute>} />
          <Route path="/profile-background" element={<ProtectedRoute><ProfileBackgroundPage /></ProtectedRoute>} />
          <Route path="/expenses" element={<ProtectedRoute><ExpensePage /></ProtectedRoute>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
      {showNav && <BottomNav />}
    </>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppLayout />
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
