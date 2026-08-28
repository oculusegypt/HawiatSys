import { lazy, Suspense, useEffect } from 'react';
import { Route, Switch, Router as WouterRouter, useLocation } from 'wouter';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ServiceRequestProvider } from '@/context/ServiceRequestContext';
import { SiteSettingsProvider, useSiteSettings } from '@/context/SiteSettingsContext';
import { ServiceRequestModal } from '@/components/home/ServiceRequestModal';
import { MarketingBadge } from '@/components/layout/MarketingBadge';
import { FloatingContactButtons } from '@/components/layout/FloatingContactButtons';
import { ScrollToTop } from "@/components/common/ScrollToTop";
import { getVisitorTracking, sendVisitorHeartbeat } from "@/lib/visitorAttribution";
import { setAuthTokenGetter } from '@workspace/api-client-react';

// Configure the generated API client to attach the admin token to every request
setAuthTokenGetter(() => localStorage.getItem("admin_token"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Lazy loaded top-level routes
const AdminLogin = lazy(() => import('@/pages/admin/Login'));
const RequestPrint = lazy(() => import('@/pages/admin/RequestPrint'));
const AdminRoutes = lazy(() => import('@/routes/AdminRoutes').then(m => ({ default: m.AdminRoutes })));
const PublicRoutes = lazy(() => import('@/routes/PublicRoutes').then(m => ({ default: m.PublicRoutes })));

function Router() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center"><div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>}>
      <Switch>
        <Route path="/admin/login" component={AdminLogin} />
        <Route path="/admin/requests/:id/print" component={RequestPrint} />

        <Route path="/admin/*?">
          <AdminRoutes />
        </Route>

        <Route>
          <PublicRoutes />
        </Route>
      </Switch>
    </Suspense>
  );
}

function SettingsLoadingShell() {
  return (
    <div className="min-h-screen bg-background p-4 sm:p-8" dir="rtl" aria-busy="true" aria-label="جاري تجهيز الموقع">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="h-16 animate-pulse rounded-2xl bg-primary/10" />
        <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <div className="h-72 animate-pulse rounded-3xl bg-primary/10" />
          <div className="h-72 animate-pulse rounded-3xl bg-primary/5" />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="h-28 animate-pulse rounded-2xl bg-primary/5" />
          <div className="h-28 animate-pulse rounded-2xl bg-primary/5" />
          <div className="h-28 animate-pulse rounded-2xl bg-primary/5" />
        </div>
      </div>
    </div>
  )
}

function SettingsErrorShell({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6 text-center" dir="rtl">
      <div className="w-full max-w-md rounded-3xl border border-primary/10 bg-white p-8 shadow-xl">
        <h1 className="text-xl font-bold text-primary">تعذر تجهيز الموقع</h1>
        <p className="mt-3 text-sm leading-7 text-gray-500">لم نتمكن من تحميل إعدادات الموقع. أعد المحاولة للمتابعة.</p>
        <button type="button" onClick={onRetry} className="mt-6 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-white transition hover:opacity-90">
          إعادة المحاولة
        </button>
      </div>
    </div>
  )
}

function SettingsBootstrap() {
  const [location] = useLocation()
  const { isLoaded, isError, reload } = useSiteSettings()
  const isLoginRoute = location === "/admin/login"

  // The login screen does not need public site settings. Keeping it outside the
  // settings gate prevents a slow public-settings request from flashing a
  // bootstrap screen before the credentials form.
  if (!isLoginRoute && !isLoaded) return <SettingsLoadingShell />
  if (!isLoginRoute && isError) return <SettingsErrorShell onRetry={reload} />
  return (
    <>
      <AnonymousAnalyticsTracker />
      <ScrollToTop />
      <SiteIdentitySEO />
      <Router />
      <FloatingContactButtons />
      <MarketingBadge />
      <ServiceRequestModal />
      <Toaster />
    </>
  )
}

function AnonymousAnalyticsTracker() {
  const [location] = useLocation();

  useEffect(() => {
    const isAdmin = location.startsWith("/admin");
    try {
      const tracking = getVisitorTracking();
      fetch(`${import.meta.env.BASE_URL.replace(/\/$/, "")}/api/track`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ page: location, ...tracking }),
      }).catch(() => {});
    } catch {}

    // Hostinger has no Node/WebSocket process. Keep customer presence alive
    // through the PHP heartbeat instead of relying on a realtime connection.
    if (isAdmin) return;
    void sendVisitorHeartbeat();
    const timer = window.setInterval(() => {
      void sendVisitorHeartbeat();
    }, 30000);
    return () => window.clearInterval(timer);
  }, [location]);

  return null;
}

function SiteIdentitySEO() {
  const [location] = useLocation();
  const { companyName, isLoaded } = useSiteSettings();

  useEffect(() => {
    if (location !== "/" && !location.startsWith("/admin")) return;
    if (!isLoaded) return;
    const isAdmin = location.startsWith("/admin");
    document.title = isAdmin
      ? (companyName ? `إدارة ${companyName}` : "لوحة الإدارة")
      : (companyName ? `${companyName} | تأجير حاويات الأنقاض والنفايات بالرياض` : "تأجير حاويات الأنقاض والنفايات بالرياض");
  }, [location, companyName, isLoaded]);

  return null;
}

function App() {
  useEffect(() => {
    document.documentElement.dir = 'rtl';
    document.documentElement.lang = 'ar';
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <SiteSettingsProvider>
          <ServiceRequestProvider>
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
              <SettingsBootstrap />
            </WouterRouter>
          </ServiceRequestProvider>
        </SiteSettingsProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
