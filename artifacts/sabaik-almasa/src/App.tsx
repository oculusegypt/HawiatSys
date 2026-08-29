import { lazy, Suspense, useEffect, useState } from 'react';
import { Route, Switch, Router as WouterRouter, useLocation } from 'wouter';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ServiceRequestProvider, useServiceRequest } from '@/context/ServiceRequestContext';
import { SiteSettingsProvider, useSiteSettings } from '@/context/SiteSettingsContext';
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
const ServiceRequestModal = lazy(() => import('@/components/home/ServiceRequestModal').then(m => ({ default: m.ServiceRequestModal })));

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

function DeferredServiceRequestModal() {
  const { isOpen } = useServiceRequest()

  if (!isOpen) return null

  return (
    <Suspense fallback={null}>
      <ServiceRequestModal />
    </Suspense>
  )
}

function SettingsBootstrap() {
  const [location] = useLocation()
  const { isLoaded, isError, reload } = useSiteSettings()
  const isLoginRoute = location === "/admin/login"

  // Keep the prerendered, data-backed page visible while settings load. The
  // old loading shell replaced it immediately and made the shell itself the
  // largest contentful paint on slower mobile connections.
  useEffect(() => {
    if (isLoaded && !isLoginRoute) {
      document.documentElement.classList.remove("seo-static-pending")
      document.getElementById("seo-static-page-content")?.remove()
    }
  }, [isLoaded, isLoginRoute])

  // The login screen does not need public site settings. Keeping it outside the
  // settings gate prevents a slow public-settings request from flashing a
  // bootstrap screen before the credentials form.
  if (!isLoginRoute && isError) return <SettingsErrorShell onRetry={reload} />
  return (
    <>
      <AnonymousAnalyticsTracker />
      <MarketingMeasurementScripts />
      <ScrollToTop />
      <SiteIdentitySEO />
      <Router />
      <FloatingContactButtons />
      <MarketingBadge />
      <DeferredServiceRequestModal />
      <Toaster />
    </>
  )
}

function AnonymousAnalyticsTracker() {
  const [location] = useLocation();

  useEffect(() => {
    const isAdmin = location.startsWith("/admin");
    // Analytics and presence are useful, but neither should compete with the
    // hero image and CSS during the first paint on a slow mobile connection.
    const timer = window.setTimeout(() => {
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
    }, 2000);
    const heartbeatTimer = isAdmin
      ? undefined
      : window.setInterval(() => void sendVisitorHeartbeat(), 30000);
    return () => {
      window.clearTimeout(timer);
      if (heartbeatTimer !== undefined) window.clearInterval(heartbeatTimer);
    };
  }, [location]);

  return null;
}

function MarketingMeasurementScripts() {
  const { analyticsGoogleTagId, facebookPixelId, isLoaded } = useSiteSettings();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!isLoaded) return;
    const timer = window.setTimeout(() => setReady(true), 1500);
    return () => window.clearTimeout(timer);
  }, [isLoaded]);

  useEffect(() => {
    if (!isLoaded || !ready) return;

    const googleId = /^G-[A-Z0-9]+$/i.test(analyticsGoogleTagId) ? analyticsGoogleTagId : "";
    const pixelId = /^\d{5,20}$/.test(facebookPixelId) ? facebookPixelId : "";
    const googleScriptId = "google-tag-script";
    const facebookScriptId = "facebook-pixel-script";
    const analyticsWindow = window as typeof window & {
      dataLayer?: unknown[];
      gtag?: (...args: unknown[]) => void;
    };

    document.getElementById(facebookScriptId)?.remove();

    if (googleId) {
      const googleScriptSrc = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(googleId)}`;
      const existingGoogleScript = document.getElementById(googleScriptId) as HTMLScriptElement | null;
      if (!existingGoogleScript || existingGoogleScript.src !== googleScriptSrc) {
        existingGoogleScript?.remove();
        const script = document.createElement("script");
        script.id = googleScriptId;
        script.async = true;
        script.src = googleScriptSrc;
        document.head.appendChild(script);
      }
      analyticsWindow.dataLayer = analyticsWindow.dataLayer || [];
      analyticsWindow.gtag = (...args: unknown[]) => {
        analyticsWindow.dataLayer?.push(args);
      };
      analyticsWindow.gtag("js", new Date());
      analyticsWindow.gtag("config", googleId, { anonymize_ip: true });
    }

    if (pixelId) {
      const script = document.createElement("script");
      script.id = facebookScriptId;
      script.textContent = `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${pixelId}');fbq('track','PageView');`;
      document.head.appendChild(script);
    }

    return () => {
      document.getElementById(googleScriptId)?.remove();
      document.getElementById(facebookScriptId)?.remove();
    };
  }, [analyticsGoogleTagId, facebookPixelId, isLoaded, ready]);

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
