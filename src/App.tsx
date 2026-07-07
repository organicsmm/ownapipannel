import { useEffect, lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { AdminGuard } from "@/components/admin/AdminGuard";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { CurrencyProvider } from "@/hooks/useCurrency";
import { ScrollToTop } from "@/components/ScrollToTop";
import { toast } from "sonner";
import { AppErrorBoundary } from "@/components/app/AppErrorBoundary";
import { OxapaySubscriptionPoller } from "@/components/subscription/OxapaySubscriptionPoller";
import { GlobalSubscriptionGuard } from "@/components/subscription/GlobalSubscriptionGuard";

// Eager — dashboard so logged-in app first paint stays instant
import NotFound from "./pages/NotFound";
import Dashboard from "./pages/Dashboard";

// Lazy — everything else is code-split so a single user's heavy workload
// (millions of runs, bundles, admin tools) never blocks anyone else's UI.
const Index = lazy(() => import("./pages/Index"));
const Auth = lazy(() => import("./pages/Auth"));
const Services = lazy(() => import("./pages/Services"));
const Order = lazy(() => import("./pages/Order"));
const Orders = lazy(() => import("./pages/Orders"));

const Settings = lazy(() => import("./pages/Settings"));
const Support = lazy(() => import("./pages/Support"));
const ApiAccess = lazy(() => import("./pages/ApiAccess"));
const Intelligence = lazy(() => import("./pages/Intelligence"));
const MyProviders = lazy(() => import("./pages/MyProviders"));
const MyBundles = lazy(() => import("./pages/MyBundles"));
const MassOrder = lazy(() => import("./pages/MassOrder"));
const SubscriptionReturn = lazy(() => import("./pages/SubscriptionReturn"));
const SecurityTest = lazy(() => import("./pages/SecurityTest"));

// Engagement pages — heaviest user-facing screens, always lazy
const EngagementOrder = lazy(() => import("./pages/UserEngagementOrder"));
const EngagementOrders = lazy(() => import("./pages/EngagementOrders"));
const EngagementOrderDetail = lazy(() => import("./pages/EngagementOrderDetail"));

// Admin pages — only admins ever load these chunks
const Admin = lazy(() => import("./pages/admin/Admin"));
const AdminServices = lazy(() => import("./pages/admin/AdminServices"));
const AdminUsers = lazy(() => import("./pages/admin/AdminUsers"));
const AdminOrders = lazy(() => import("./pages/admin/AdminOrders"));
const AdminBundles = lazy(() => import("./pages/admin/AdminBundles"));
const AdminCronMonitor = lazy(() => import("./pages/admin/AdminCronMonitor"));
const AdminChat = lazy(() => import("./pages/admin/AdminChat"));
const AdminDeposits = lazy(() => import("./pages/admin/AdminDeposits"));
const AdminProviderAccounts = lazy(() => import("./pages/admin/AdminProviderAccounts"));
const AdminServiceProviderMapping = lazy(() => import("./pages/admin/AdminServiceProviderMapping"));
const AdminSubscriptions = lazy(() => import("./pages/admin/AdminSubscriptions"));


// Legal — lazy
const TermsOfService = lazy(() => import("./pages/legal/TermsOfService"));
const PrivacyPolicy = lazy(() => import("./pages/legal/PrivacyPolicy"));
const RefundPolicy = lazy(() => import("./pages/legal/RefundPolicy"));
const CookiePolicy = lazy(() => import("./pages/legal/CookiePolicy"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 15 * 60 * 1000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchOnMount: false,
      retry: 2,
      retryDelay: (i) => Math.min(1000 * 2 ** i, 10000),
    },
    mutations: {
      retry: 1,
      retryDelay: 1000,
    },
  },
});

const RouteFallback = () => (
  <div className="flex items-center justify-center min-h-[60vh]">
    <div className="h-10 w-10 rounded-full border-4 border-primary border-t-transparent animate-spin" />
  </div>
);

const App = () => {
  useEffect(() => {
    const handleRejection = (e: PromiseRejectionEvent) => {
      console.error("Unhandled rejection:", e.reason);
      toast.error("An error occurred. Please try again.");
      e.preventDefault();
    };
    const handleError = (e: ErrorEvent) => {
      console.error("Unhandled error:", e.error || e.message);
    };
    window.addEventListener("unhandledrejection", handleRejection);
    window.addEventListener("error", handleError);
    return () => {
      window.removeEventListener("unhandledrejection", handleRejection);
      window.removeEventListener("error", handleError);
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <CurrencyProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <AppErrorBoundary>
              <BrowserRouter>
                <ScrollToTop />
                <OxapaySubscriptionPoller />
                <GlobalSubscriptionGuard>
                <Suspense fallback={<RouteFallback />}>
                  <Routes>
                    {/* User pages */}
                    <Route path="/" element={<Index />} />
                    <Route path="*" element={<NotFound />} />
                    <Route path="/auth" element={<Auth />} />
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/services" element={<Services />} />
                    <Route path="/order" element={<Order />} />
                    <Route path="/orders" element={<Orders />} />
                    
                    <Route path="/subscription/return" element={<SubscriptionReturn />} />
                    <Route path="/settings" element={<Settings />} />
                    <Route path="/security-test" element={<SecurityTest />} />
                    <Route path="/support" element={<Support />} />
                    <Route path="/api-access" element={<ApiAccess />} />
                    <Route path="/intelligence" element={<Intelligence />} />

                    {/* My Provider / Bundles — subscription prompt opens only when user tries to add/create */}
                    <Route path="/my-providers" element={<MyProviders />} />
                    <Route path="/my-bundles" element={<MyBundles />} />



                    {/* Engagement */}
                    <Route path="/engagement-order" element={<EngagementOrder />} />
                    <Route path="/mass-order" element={<MassOrder />} />
                    <Route path="/engagement-orders" element={<EngagementOrders />} />
                    <Route path="/engagement-orders/:orderNumber" element={<EngagementOrderDetail />} />

                    {/* Admin — server-verified guard */}
                    <Route path="/admin" element={<AdminGuard><Admin /></AdminGuard>} />
                    <Route path="/admin/services" element={<AdminGuard><AdminServices /></AdminGuard>} />
                    <Route path="/admin/users" element={<AdminGuard><AdminUsers /></AdminGuard>} />
                    <Route path="/admin/orders" element={<AdminGuard><AdminOrders /></AdminGuard>} />
                    <Route path="/admin/bundles" element={<AdminGuard><AdminBundles /></AdminGuard>} />
                    <Route path="/admin/cron-monitor" element={<AdminGuard><AdminCronMonitor /></AdminGuard>} />
                    <Route path="/admin/chat" element={<AdminGuard><AdminChat /></AdminGuard>} />
                    <Route path="/admin/deposits" element={<AdminGuard><AdminDeposits /></AdminGuard>} />
                    <Route path="/admin/provider-accounts" element={<AdminGuard><AdminProviderAccounts /></AdminGuard>} />
                    <Route path="/admin/service-provider-mapping" element={<AdminGuard><AdminServiceProviderMapping /></AdminGuard>} />
                    <Route path="/admin/subscriptions" element={<AdminGuard><AdminSubscriptions /></AdminGuard>} />

                    {/* Legal */}
                    <Route path="/terms" element={<TermsOfService />} />
                    <Route path="/privacy" element={<PrivacyPolicy />} />
                    <Route path="/refund" element={<RefundPolicy />} />
                    <Route path="/cookies" element={<CookiePolicy />} />
                  </Routes>
                </Suspense>
                </GlobalSubscriptionGuard>
              </BrowserRouter>
            </AppErrorBoundary>
          </TooltipProvider>
        </CurrencyProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
