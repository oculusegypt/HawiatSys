import { useState, useEffect } from "react";
import { useLocation, Link, useRoute } from "wouter";
import {
  LayoutDashboard,
  Inbox,
  MessageSquare,
  Bell,
  LogOut,
  Settings,
  Box,
  ExternalLink,
  SlidersHorizontal,
  Search,
  Menu,
  X,
  Megaphone,
  BarChart3,
  BookOpen,
  Users,
  UserCircle,
  ShieldCheck,
  Shield,
  Headphones,
  ClipboardList,
  Database,
  MessageCircle,
  Truck,
  FilePenLine,
  Star,
  KeyRound,
  Volume2,
  VolumeX,
  Code2,
} from "lucide-react";
import {
  NotificationBell,
  AdminToastPortal,
  NotificationStatusStrip,
} from "@/components/admin/NotificationBell";
import { useSiteSettings } from "@/context/SiteSettingsContext";
import { unlockNotificationAudio } from "@/lib/visitorAttribution";

const API_BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";
// ── Nav items with section keys for permission filtering ──────────────────────

const ALL_NAV = [
  {
    href: "/admin",
    icon: LayoutDashboard,
    label: "لوحة القيادة",
    group: "main",
    section: "dashboard",
  },
  {
    href: "/admin/container-system",
    icon: Truck,
    label: "عمليات الحاويات",
    group: "main",
    section: "container_system",
  },
  {
    href: "/admin/work-orders",
    icon: Truck,
    label: "مهام السائقين",
    group: "main",
    section: "work_orders",
  },
  {
    href: "/admin/requests",
    icon: Inbox,
    label: "الطلبات",
    group: "operations",
    section: "requests",
  },
  {
    href: "/admin/services",
    icon: Settings,
    label: "الخدمات",
    group: "operations",
    section: "services",
  },
  {
    href: "/admin/packages",
    icon: Box,
    label: "أنواع الحاويات",
    group: "operations",
    section: "packages",
  },
  {
    href: "/admin/ads",
    icon: Megaphone,
    label: "الاعلانات",
    group: "operations",
    section: "ads",
  },
  {
    href: "/admin/conversations",
    icon: MessageSquare,
    label: "المحادثات",
    group: "operations",
    section: "conversations",
  },
  {
    href: "/admin/whatsapp",
    icon: MessageCircle,
    label: "واتساب",
    group: "operations",
    section: "whatsapp",
  },
  {
    href: "/admin/notifications",
    icon: Bell,
    label: "الإشعارات",
    group: "operations",
    section: "notifications",
  },
  {
    href: "/admin/analytics",
    icon: BarChart3,
    label: "التقارير والتحليلات",
    group: "analytics",
    section: "analytics",
  },
  {
    href: "/admin/blog",
    icon: BookOpen,
    label: "المدونة",
    group: "analytics",
    section: "blog",
  },
  {
    href: "/admin/seo-pages",
    icon: FilePenLine,
    label: "الصفحات",
    group: "analytics",
    section: "seo_pages",
  },
  {
    href: "/admin/seo",
    icon: Search,
    label: "SEO",
    group: "analytics",
    section: "seo",
  },
  {
    href: "/admin/structured-content",
    icon: Code2,
    label: "Structured Content",
    group: "analytics",
    section: "structured_content",
  },
  {
    href: "/admin/reviews",
    icon: Star,
    label: "تقييمات الخدمات",
    group: "extra",
    section: "reviews",
  },
  {
    href: "/admin/settings",
    icon: SlidersHorizontal,
    label: "الإعدادات",
    group: "extra",
    section: "settings",
  },
  {
    href: "/admin/employees",
    icon: Users,
    label: "الموظفون",
    group: "site_settings",
    section: "employees",
  },
  {
    href: "/admin/roles-permissions",
    icon: KeyRound,
    label: "الأدوار والصلاحيات",
    group: "site_settings",
    section: "employees",
  },
  {
    href: "/admin/database",
    icon: Database,
    label: "قاعدة البيانات",
    group: "site_settings",
    section: "database",
  },
];

const GROUPS: { key: string; label: string }[] = [
  { key: "main", label: "الرئيسية" },
  { key: "operations", label: "التشغيل والتواصل" },
  { key: "analytics", label: "المحتوى والتحليلات" },
  { key: "extra", label: "المحتوى الإضافي" },
  { key: "site_settings", label: "إعدادات الموقع" },
];

const ROLE_INFO: Record<
  string,
  { label: string; icon: React.ElementType; color: string }
> = {
  admin: { label: "مدير النظام", icon: ShieldCheck, color: "bg-purple-500" },
  manager: { label: "مدير", icon: Shield, color: "bg-blue-500" },
  customer_service: {
    label: "خدمة عملاء",
    icon: Headphones,
    color: "bg-green-500",
  },
  requests_officer: {
    label: "مسؤول طلبات",
    icon: ClipboardList,
    color: "bg-amber-500",
  },
  driver: { label: "سائق", icon: Truck, color: "bg-teal-500" },
};

// ── Nav Item ──────────────────────────────────────────────────────────────────

function NavItem({
  href,
  icon: Icon,
  label,
  badge,
  badgeColor = "bg-rose-500",
  onClick,
}: {
  href: string;
  icon: React.ElementType;
  label: string;
  badge?: number;
  badgeColor?: string;
  onClick?: () => void;
}) {
  const [isActive] = useRoute(href);
  return (
    <li>
      <Link
        href={href}
        onClick={onClick}
        className={`flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl transition-all text-sm ${
          isActive
            ? "bg-secondary text-primary font-bold shadow-sm"
            : "text-gray-300 hover:bg-white/10 hover:text-white"
        }`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <Icon size={18} className="shrink-0" />
          <span className="truncate">{label}</span>
        </div>
        {badge !== undefined && badge > 0 && (
          <span
            className={`px-2 py-0.5 rounded-full text-[11px] font-black text-white ${badgeColor} ${badgeColor.includes("rose") ? "animate-pulse" : ""} shadow-xs shrink-0`}
          >
            {badge > 99 ? "+99" : badge}
          </span>
        )}
      </Link>
    </li>
  );
}

// ── Sidebar Content ───────────────────────────────────────────────────────────

function SidebarContent({
  permissions = [],
  onNavClick,
  onLogout,
  userName,
  userRole,
  conversationCount = 0,
  pendingRequests = 0,
  unreadNotifications = 0,
}: {
  permissions?: string[];
  onNavClick?: () => void;
  onLogout: () => void;
  userName: string;
  userRole: string;
  conversationCount?: number;
  pendingRequests?: number;
  unreadNotifications?: number;
}) {
  const { companyName, logoUrl, isLoaded } = useSiteSettings();
  const hasPerm = (sec: string) =>
    permissions.includes(sec) ||
    (sec === "packages" &&
      (permissions.includes("packages") ||
        permissions.includes("containers"))) ||
    (sec === "container_system" &&
      (permissions.includes("container_system") ||
        permissions.includes("containers") ||
        permissions.some((permission) =>
          permission.startsWith("container_system_"),
        )));
  const visibleNav =
    userRole === "driver"
      ? ALL_NAV.filter((item) => item.section === "work_orders")
      : ["admin", "manager"].includes(userRole)
        ? ALL_NAV.filter((item) => hasPerm(item.section))
        : ALL_NAV.filter(
            (item) => item.section !== "work_orders" && hasPerm(item.section),
          );
  const roleInfo = ROLE_INFO[userRole] ?? ROLE_INFO.admin;
  const RIcon = roleInfo.icon;
  return (
    <div className="flex min-h-0 flex-col h-full">
      <div className="p-4 border-b border-white/10 shrink-0">
        <div className="relative flex min-h-[5.5rem] items-center justify-center overflow-hidden rounded-2xl border border-white/15 bg-gradient-to-br from-white via-slate-50 to-amber-50/90 px-3 py-4 shadow-xl shadow-black/10">
          <span
            className="absolute inset-x-0 top-0 h-1 bg-gradient-to-l from-secondary via-amber-300 to-primary"
            aria-hidden="true"
          />
          {isLoaded && logoUrl ? (
            <img
              src={logoUrl}
              alt={`شعار ${companyName}`}
              className="max-h-14 max-w-full w-auto object-contain"
            />
          ) : (
            <span
              className="text-primary/30 text-xs font-bold"
              aria-hidden="true"
            >
              {" "}
            </span>
          )}
        </div>
      </div>

      <nav
        className="min-h-0 flex-1 overflow-y-auto py-3 overscroll-contain"
        aria-label="قائمة إدارة النظام"
      >
        {GROUPS.map((group) => {
          const items = visibleNav.filter((i) => i.group === group.key);
          if (items.length === 0) return null;
          return (
            <div key={group.key} className="mb-2">
              <p className="px-4 py-1.5 text-[10px] font-bold text-white/30 uppercase tracking-widest">
                {group.label}
              </p>
              <ul className="space-y-0.5 px-3">
                {items.map((item) => (
                  <NavItem
                    key={item.href}
                    href={item.href}
                    icon={item.icon}
                    label={
                      item.section === "work_orders" && userRole === "driver"
                        ? "مهامي"
                        : item.label
                    }
                    badge={
                      item.section === "conversations"
                        ? conversationCount
                        : item.section === "requests"
                          ? pendingRequests
                          : item.section === "notifications"
                            ? unreadNotifications
                            : undefined
                    }
                    badgeColor={
                      item.section === "requests"
                        ? "bg-emerald-500"
                        : "bg-rose-500"
                    }
                    onClick={onNavClick}
                  />
                ))}
              </ul>
            </div>
          );
        })}

        {/* Account actions stay inside the scrolling menu instead of being pinned to its bottom. */}
        <div className="mt-3 border-t border-white/10 pt-3">
          <p className="px-4 py-1.5 text-[10px] font-bold text-white/30 uppercase tracking-widest">
            الحساب
          </p>
          <ul className="space-y-0.5 px-3">
            {!userRole || userRole !== "driver" ? (
              <li>
                <Link
                  href="/admin/profile"
                  onClick={onNavClick}
                  className="flex items-center gap-3 px-3 py-2.5 w-full text-right text-gray-300 hover:bg-white/10 hover:text-white rounded-xl transition-colors text-sm"
                >
                  <UserCircle size={18} className="shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="truncate font-medium text-white/90 text-xs">
                      {userName || "حسابي"}
                    </p>
                    <p className="text-white/40 text-[10px] flex items-center gap-1">
                      <RIcon size={9} /> {roleInfo.label}
                    </p>
                  </div>
                </Link>
              </li>
            ) : null}
            <li>
              <Link
                href="/"
                target="_blank"
                onClick={onNavClick}
                className="flex items-center gap-3 px-3 py-2.5 w-full text-right text-gray-400 hover:bg-white/10 hover:text-white rounded-xl transition-colors text-sm"
              >
                <ExternalLink size={18} className="shrink-0" />
                <span>عرض الموقع</span>
              </Link>
            </li>
            <li>
              <button
                onClick={onLogout}
                className="flex items-center gap-3 px-3 py-2.5 w-full text-right text-gray-400 hover:bg-red-500/20 hover:text-red-400 rounded-xl transition-colors text-sm"
              >
                <LogOut size={18} className="shrink-0" />
                <span>تسجيل الخروج</span>
              </button>
            </li>
          </ul>
        </div>
      </nav>
    </div>
  );
}

// ── Small helper: logo shown in mobile top-bar ────────────────────────────────

function AdminHeaderLogo() {
  const { companyName, logoUrl, isLoaded } = useSiteSettings();
  return isLoaded && logoUrl ? (
    <img
      src={logoUrl}
      alt={`شعار ${companyName}`}
      className="sm:hidden h-7 w-auto object-contain"
    />
  ) : (
    <span className="sm:hidden h-7 w-20" aria-hidden="true" />
  );
}

// ── Main Layout ───────────────────────────────────────────────────────────────

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { companyName } = useSiteSettings();
  const [, setLocation] = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [userRole, setUserRole] = useState("");
  const [userName, setUserName] = useState("");
  const [authLoading, setAuthLoading] = useState(true);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [conversationCount, setConversationCount] = useState(0);
  const [pendingRequests, setPendingRequests] = useState(0);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [isSoundMuted, setIsSoundMuted] = useState(
    () => localStorage.getItem("admin_sound_muted") === "true",
  );

  const toggleSound = () => {
    setIsSoundMuted((prev) => {
      const next = !prev;
      localStorage.setItem("admin_sound_muted", String(next));
      return next;
    });
  };

  useEffect(() => {
    // Prime Web Audio during the first admin interaction so later polling
    // notifications can play even though they arrive outside a click handler.
    const unlock = () => unlockNotificationAudio();
    window.addEventListener("pointerdown", unlock, { once: true, passive: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("admin_token");
    if (!token) {
      setAuthLoading(false);
      setLocation("/admin/login");
      return;
    }

    fetch(`${API_BASE}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => {
        if (!r.ok) {
          localStorage.removeItem("admin_token");
          localStorage.removeItem("admin_role");
          localStorage.removeItem("admin_id");
          localStorage.removeItem("admin_name");
          setAuthLoading(false);
          setLocation("/admin/login");
          return null;
        }
        return r.json();
      })
      .then(
        (
          data: {
            role: string;
            permissions: string[];
            name: string;
            id: number;
          } | null,
        ) => {
          if (!data) return;
          setPermissions(
            Array.isArray(data.permissions) ? data.permissions : [],
          );
          setUserRole(data.role);
          setUserName(data.name);
          localStorage.setItem("admin_role", data.role);
          localStorage.setItem("admin_id", String(data.id));
          localStorage.setItem("admin_name", data.name);
          setAuthLoading(false);
        },
      )
      .catch(() => {
        localStorage.removeItem("admin_token");
        localStorage.removeItem("admin_role");
        localStorage.removeItem("admin_id");
        localStorage.removeItem("admin_name");
        setAuthLoading(false);
        setLocation("/admin/login");
      });
  }, [setLocation]);

  useEffect(() => {
    const token = localStorage.getItem("admin_token");
    if (!token) return;
    // Driver accounts use the dedicated work-orders surface and do not have
    // access to management sidebar counters.
    if (localStorage.getItem("admin_role") === "driver") return;

    // Request desktop notifications permission if not decided
    if (
      typeof window !== "undefined" &&
      "Notification" in window &&
      Notification.permission === "default"
    ) {
      try {
        Notification.requestPermission();
      } catch {}
    }

    let stopped = false;
    let timer: ReturnType<typeof setInterval> | undefined;
    const pollBadges = async () => {
      try {
        const sRes = await fetch(`${API_BASE}/api/admin/sidebar-counts`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Cache-Control": "no-cache",
          },
          cache: "no-store",
        });
        if (sRes.status === 401) {
          stopped = true;
          if (timer) clearInterval(timer);
          return;
        }
        if (sRes.ok) {
          const data = await sRes.json();
          const messages = Number(
            data.unreadMessages ?? data.unreadConversations ?? 0,
          );
          const conversations = Number(
            data.openConversations ??
              data.unreadConversationCount ??
              data.unreadConversations ??
              0,
          );
          const pending = Number(data.pendingRequests || 0);
          const notifications = Number(data.unreadNotifications || 0);

          setUnreadMessages(messages);
          setConversationCount(conversations);
          setPendingRequests(pending);
          setUnreadNotifications(notifications);
        }
      } catch {}
    };

    pollBadges();
    timer = setInterval(() => {
      if (!stopped) void pollBadges();
    }, 3000);
    return () => {
      stopped = true;
      if (timer) clearInterval(timer);
    };
  }, []);

  // The chat stream can arrive from the service worker before the next badge
  // poll. Update the message icon immediately; the next poll reconciles it
  // with the authoritative unread count from the server.
  useEffect(() => {
    const handleNewMessage = () => {
      setUnreadMessages((current) => current + 1);
    };
    window.addEventListener("admin:new-message", handleNewMessage);
    return () =>
      window.removeEventListener("admin:new-message", handleNewMessage);
  }, []);

  const [location] = useLocation();
  useEffect(() => {
    setDrawerOpen(false);
  }, [location]);

  useEffect(() => {
    document.body.style.overflow = drawerOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [drawerOpen]);

  const handleLogout = () => {
    localStorage.removeItem("admin_token");
    localStorage.removeItem("admin_role");
    localStorage.removeItem("admin_id");
    localStorage.removeItem("admin_name");
    setLocation("/admin/login");
  };

  const roleInfo = ROLE_INFO[userRole] ?? ROLE_INFO.admin;
  const initials = userName ? userName.charAt(0) : "A";
  const isDriver = userRole === "driver";
  const isWorkOrdersManager = userRole === "admin" || userRole === "manager";
  // Drivers have one intentional destination in the dashboard. Do not allow
  // profile or other admin URLs to become reachable through manual navigation.
  const driverAllowedRoute = location === "/admin/work-orders";

  useEffect(() => {
    if (!authLoading && isDriver && !driverAllowedRoute) {
      setLocation("/admin/work-orders");
    }
    if (
      !authLoading &&
      !isDriver &&
      !isWorkOrdersManager &&
      location === "/admin/work-orders"
    ) {
      setLocation("/admin");
    }
  }, [
    authLoading,
    isDriver,
    isWorkOrdersManager,
    driverAllowedRoute,
    location,
    setLocation,
  ]);

  // While auth is being verified, show a minimal loading screen so the
  // sidebar never flashes empty state for any role including "manager".
  if (authLoading) {
    return (
      <div
        className="min-h-screen bg-primary flex items-center justify-center"
        dir="rtl"
      >
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-white/20 border-t-white rounded-full animate-spin" />
          <p className="text-white/60 text-sm">جاري التحقق...</p>
        </div>
      </div>
    );
  }

  // Drivers have a dedicated work-order surface. Keep this guard in the
  // layout as well as the login redirect so manually entered admin URLs
  // cannot expose dashboard or management screens.
  if (
    (isDriver && !driverAllowedRoute) ||
    (!isDriver && !isWorkOrdersManager && location === "/admin/work-orders")
  ) {
    return (
      <div
        className="min-h-screen bg-primary flex items-center justify-center"
        dir="rtl"
      >
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-white/20 border-t-white rounded-full animate-spin" />
          <p className="text-white/60 text-sm">جاري فتح مسار العمل...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="admin-shell min-h-screen bg-gray-100 flex min-w-0 w-full max-w-full font-sans overflow-x-hidden"
      dir="rtl"
    >
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-60 xl:w-64 bg-primary text-white flex-col shrink-0 fixed inset-y-0 right-0 z-20">
        <SidebarContent
          permissions={permissions}
          onLogout={handleLogout}
          userName={userName}
          userRole={userRole}
          conversationCount={conversationCount}
          pendingRequests={pendingRequests}
          unreadNotifications={unreadNotifications}
        />
      </aside>

      {/* Mobile Overlay */}
      {drawerOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      {/* Mobile Drawer */}
      <aside
        className={`fixed inset-y-0 right-0 z-40 flex h-dvh min-h-0 w-[min(18rem,calc(100vw-1rem))] max-w-[calc(100vw-1rem)] flex-col overflow-hidden bg-primary text-white transform transition-transform duration-300 ease-in-out lg:hidden ${drawerOpen ? "translate-x-0" : "translate-x-full"}`}
      >
        <button
          onClick={() => setDrawerOpen(false)}
          className="absolute top-4 left-4 w-8 h-8 bg-white/10 hover:bg-white/20 rounded-lg flex items-center justify-center transition-colors"
        >
          <X size={18} className="text-white" />
        </button>
        <SidebarContent
          permissions={permissions}
          onNavClick={() => setDrawerOpen(false)}
          onLogout={handleLogout}
          userName={userName}
          userRole={userRole}
          conversationCount={conversationCount}
          pendingRequests={pendingRequests}
          unreadNotifications={unreadNotifications}
        />
      </aside>

      {/* Main */}
      <main className="flex min-h-screen min-w-0 w-full max-w-full flex-1 flex-col overflow-x-hidden lg:mr-60 xl:mr-64">
        <header className="flex h-14 min-w-0 w-full shrink-0 items-center justify-between overflow-visible border-b border-gray-100 bg-white px-3 shadow-sm sticky top-0 z-10 sm:h-16 sm:px-6">
          <button
            className="lg:hidden flex items-center justify-center w-9 h-9 rounded-xl bg-gray-50 border border-gray-200 text-gray-600 hover:bg-gray-100 transition-colors"
            onClick={() => setDrawerOpen(true)}
            aria-label="فتح القائمة"
          >
            <Menu size={20} />
          </button>
          <h1 className="hidden sm:block text-base font-bold text-gray-800">
            {isDriver ? "مسار العمل اليومي" : `إدارة ${companyName}`}
          </h1>
          <AdminHeaderLogo />
          <div className="flex items-center gap-2 sm:gap-3">
            {!isDriver && (
              <button
                onClick={toggleSound}
                className={`w-9 h-9 rounded-xl flex items-center justify-center border transition-all ${
                  isSoundMuted
                    ? "bg-rose-50 border-rose-200 text-rose-600 hover:bg-rose-100"
                    : "bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100"
                }`}
                title={
                  isSoundMuted
                    ? "الصوت مكتوم — اضغط للتفعيل"
                    : "صوت الإشعارات مفعل — اضغط للكتم"
                }
                aria-label="التحكم في صوت التنبيهات"
              >
                {isSoundMuted ? <VolumeX size={17} /> : <Volume2 size={17} />}
              </button>
            )}
            {!isDriver && (
              <Link
                href="/admin/conversations"
                className="relative w-9 h-9 rounded-xl flex items-center justify-center border border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100 transition-all cursor-pointer"
                title={`المحادثات المباشرة${unreadMessages > 0 ? ` (${unreadMessages} رسالة غير مقروءة)` : ""}`}
                aria-label="المحادثات المباشرة"
              >
                <MessageSquare size={17} />
                {unreadMessages > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-sm animate-pulse leading-none">
                    {unreadMessages > 99 ? "99+" : unreadMessages}
                  </span>
                )}
              </Link>
            )}
            <NotificationBell />
            {!isDriver && (
              <>
                <Link
                  href="/admin/profile"
                  className="hidden sm:flex items-center gap-2 bg-gray-50 border border-gray-200 hover:border-primary/30 hover:bg-primary/5 rounded-xl px-3 py-1.5 transition-all cursor-pointer"
                >
                  <div
                    className={`w-7 h-7 ${roleInfo.color} rounded-full flex items-center justify-center text-white text-xs font-bold`}
                  >
                    {initials}
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-700 font-medium leading-none">
                      {userName || "مدير"}
                    </p>
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      {roleInfo.label}
                    </p>
                  </div>
                </Link>
                <Link
                  href="/admin/profile"
                  className={`sm:hidden w-8 h-8 ${roleInfo.color} rounded-full flex items-center justify-center text-white text-xs font-bold`}
                >
                  {initials}
                </Link>
              </>
            )}
          </div>
        </header>
        <NotificationStatusStrip />
        <div className="min-w-0 w-full max-w-full flex-1 overflow-x-hidden p-3 sm:p-6 lg:p-8">
          {children}
        </div>
      </main>

      <AdminToastPortal />
    </div>
  );
}
