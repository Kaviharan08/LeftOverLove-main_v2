import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/lib/auth";
import Index from "./pages/Index";
import About from "./pages/About";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Profile from "./pages/Profile";
import DonorDashboard from "./pages/dashboard/DonorDashboard";
import ReceiverDashboard from "./pages/dashboard/ReceiverDashboard";
import VolunteerDashboard from "./pages/dashboard/VolunteerDashboard";
import AdminDashboard from "./pages/dashboard/AdminDashboard";
import AdminLogin from "./pages/admin/AdminLogin";
import { AdminRoute } from "./components/AdminRoute";
import CreateListing from "./pages/food/CreateListing";
import EditListing from "./pages/food/EditListing";
import FoodDetail from "./pages/food/FoodDetail";
import BrowseFood from "./pages/food/BrowseFood";
import Messages from "./pages/Messages";
import Contact from "./pages/Contact";
import Complaints from "./pages/Complaints";
import NGOSignup from "./pages/signup/NGOSignup";
import NGODashboard from "./pages/dashboard/NGODashboard";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function RoleRoute({ allowedRole, children }: { allowedRole: string; children: React.ReactNode }) {
  const { role, loading } = useAuth();
  if (loading) return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Loading...</div>;
  if (role !== allowedRole) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/about" element={<About />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
      <Route path="/dashboard/donor" element={<ProtectedRoute><RoleRoute allowedRole="donor"><DonorDashboard /></RoleRoute></ProtectedRoute>} />
      <Route path="/dashboard/receiver" element={<ProtectedRoute><RoleRoute allowedRole="receiver"><ReceiverDashboard /></RoleRoute></ProtectedRoute>} />
      <Route path="/dashboard/volunteer" element={<ProtectedRoute><RoleRoute allowedRole="volunteer"><VolunteerDashboard /></RoleRoute></ProtectedRoute>} />
      <Route path="/dashboard/ngo" element={<ProtectedRoute><RoleRoute allowedRole="ngo"><NGODashboard /></RoleRoute></ProtectedRoute>} />
      <Route path="/signup/ngo" element={<NGOSignup />} />
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/admin/dashboard" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
      <Route path="/dashboard/admin" element={<Navigate to="/admin/dashboard" replace />} />
      <Route path="/food/create" element={<ProtectedRoute><RoleRoute allowedRole="donor"><CreateListing /></RoleRoute></ProtectedRoute>} />
      <Route path="/food/edit/:id" element={<ProtectedRoute><RoleRoute allowedRole="donor"><EditListing /></RoleRoute></ProtectedRoute>} />
      <Route path="/food/:id" element={<ProtectedRoute><FoodDetail /></ProtectedRoute>} />
      <Route path="/browse" element={<ProtectedRoute><BrowseFood /></ProtectedRoute>} />
      <Route path="/messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
      <Route path="/messages/:listingId/:otherUserId" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
      <Route path="/contact" element={<Contact />} />
      <Route path="/complaints" element={<ProtectedRoute><Complaints /></ProtectedRoute>} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
