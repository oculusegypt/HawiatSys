import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { Route, Switch, Router as WouterRouter } from "wouter";
import { useEffect, useState, type ElementType, type FormEvent, type ReactNode } from "react";
import {
  Activity,
  ArrowLeft,
  ArrowUpLeft,
  BarChart3,
  Bell,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  Clock3,
  Filter,
  Globe2,
  LayoutDashboard,
  Link2,
  MapPin,
  Menu,
  MessageCircle,
  MoreHorizontal,
  Package,
  Phone,
  Plus,
  Search,
  Send,
  Settings2,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Users,
  WalletCards,
  Workflow,
  X,
  Zap,
} from "lucide-react";

const queryClient = new QueryClient();

const primary = "#e46942";
const dark = "#153c3c";
const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");

function Logo() {
  return (
    <a href="#top" className="brand-mark" data-testid="link-logo">
      <span className="brand-symbol" aria-hidden="true">
        <Workflow size={19} strokeWidth={2.3} />
      </span>
      <span className="brand-name">
        <strong>CleanFlow</strong>
        <small>Platform</small>
      </span>
    </a>
  );
}

function Button({
  children,
  onClick,
  href,
  variant = "primary",
  testId,
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  href?: string;
  variant?: "primary" | "dark" | "outline" | "text";
  testId: string;
  className?: string;
}) {
  const classes = `action-button action-${variant} ${className}`;
  if (href) {
    return (
      <a href={href} className={classes} data-testid={testId}>
        {children}
      </a>
    );
  }
  return (
    <button onClick={onClick} className={classes} data-testid={testId}>
      {children}
    </button>
  );
}

const navLinks = [
  ["الحل", "#platform"],
  ["كيف تعمل", "#workflow"],
  ["الإمكانات", "#capabilities"],
  ["التقارير", "#insights"],
  ["الأسئلة الشائعة", "#faq"],
];

function TopNav({ onDemo }: { onDemo: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <header className="site-header">
      <div className="page-shell nav-inner">
        <Logo />
        <nav className="desktop-nav" aria-label="التنقل الرئيسي">
          {navLinks.map(([label, href]) => (
            <a key={href} href={href} data-testid={`link-nav-${href.slice(1)}`}>
              {label}
            </a>
          ))}
        </nav>
        <div className="nav-actions">
          <a href="tel:+966500000000" className="phone-link" data-testid="link-nav-phone">
            <Phone size={15} />
            ٠٥٠ ٠٠٠ ٠٠٠٠
          </a>
          <Button onClick={onDemo} testId="button-nav-demo">
            اطلب عرضاً عملياً <ArrowLeft size={16} />
          </Button>
        </div>
        <button
          className="mobile-menu-button"
          onClick={() => setOpen(!open)}
          aria-label={open ? "إغلاق القائمة" : "فتح القائمة"}
          data-testid="button-mobile-menu"
        >
          {open ? <X size={21} /> : <Menu size={21} />}
        </button>
      </div>
      {open && (
        <div className="mobile-menu">
          <nav className="page-shell" aria-label="قائمة الجوال">
            {navLinks.map(([label, href]) => (
              <a
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                data-testid={`link-mobile-${href.slice(1)}`}
              >
                {label}
              </a>
            ))}
            <Button
              onClick={() => {
                setOpen(false);
                onDemo();
              }}
              testId="button-mobile-demo"
              className="mobile-demo"
            >
              اطلب عرضاً عملياً <ArrowLeft size={16} />
            </Button>
          </nav>
        </div>
      )}
    </header>
  );
}

function StatusPill({ children, tone = "green" }: { children: ReactNode; tone?: "green" | "orange" | "blue" }) {
  return <span className={`status-pill status-${tone}`}><span />{children}</span>;
}

function DashboardMockup({ onDemo }: { onDemo: () => void }) {
  const orders = [
    ["#CF-2084", "تنظيف فيلا كاملة", "فريق النخبة", "اليوم، ١١:٣٠", "green"],
    ["#CF-2083", "تنظيف مجالس", "بانتظار التوزيع", "اليوم، ١٣:٠٠", "orange"],
    ["#CF-2082", "ما بعد البناء", "فريق الشمال", "غداً، ٠٩:٠٠", "blue"],
  ] as const;
  return (
    <div className="dashboard-wrap" data-testid="visual-operations-dashboard">
      <div className="dashboard-alert"><span className="live-dot" /> النظام يعمل · ١٢ طلباً يحتاج متابعة</div>
      <div className="dashboard-window">
        <div className="dashboard-topbar">
          <div className="dash-brand"><span><Workflow size={13} /></span><b>CleanFlow</b><small>غرفة التشغيل</small></div>
          <div className="dash-top-actions"><Search size={14} /><Bell size={14} /><span className="user-initial">م</span></div>
        </div>
        <div className="dashboard-body">
          <aside className="dashboard-sidebar">
            <div className="sidebar-caption">مساحة العمل</div>
            {[
              [LayoutDashboard, "نظرة عامة"],
              [ClipboardCheck, "الطلبات"],
              [CalendarDays, "الجدولة"],
              [Users, "الفرق"],
              [WalletCards, "الخدمات"],
              [Settings2, "الإعدادات"],
            ].map(([Icon, label], index) => (
              <div className={`dash-nav-item ${index === 0 ? "active" : ""}`} key={label as string}>
                <Icon size={12} /> <span>{label as string}</span>
              </div>
            ))}
          </aside>
          <main className="dashboard-main">
            <div className="dash-heading">
              <div><small>الأحد، ١٢ مايو ٢٠٢٤</small><h3>صباح الخير، محمد</h3></div>
              <button onClick={onDemo} data-testid="button-dashboard-new-order"><Plus size={12} /> طلب جديد</button>
            </div>
            <div className="stats-grid">
              {[
                ["٢٤", "طلباً اليوم", "+١٨٪", TrendingUp],
                ["٠٧", "فرق نشطة", "في الميدان", Users],
                ["٤.٢", "متوسط الرد / د", "-٢٢٪", Clock3],
              ].map(([value, label, change, Icon]) => (
                <div className="dash-stat" key={label as string}>
                  <div className="stat-icon"><Icon size={12} /></div>
                  <strong>{value as string}</strong>
                  <span>{label as string}</span>
                  <small className={(change as string).startsWith("+") || (change as string).startsWith("-") ? "positive" : ""}>{change as string}</small>
                </div>
              ))}
            </div>
            <div className="dash-content-grid">
              <div className="dash-panel orders-panel">
                <div className="panel-head"><b>آخر الطلبات</b><a href="#workflow">عرض الكل</a></div>
                <div className="orders-list">
                  {orders.map(([id, service, team, time, tone]) => (
                    <div className="order-row" key={id}>
                      <div className="order-id">{id}<small>{service}</small></div>
                      <div className="order-team"><span className={`team-avatar avatar-${tone}`}>{team.slice(0, 1)}</span><small>{team}</small></div>
                      <div className="order-time"><StatusPill tone={tone}>{tone === "green" ? "جاري التنفيذ" : tone === "orange" ? "جديد" : "مجدول"}</StatusPill><small>{time}</small></div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="dash-panel chart-panel">
                <div className="panel-head"><b>مصادر الطلبات</b><MoreHorizontal size={14} /></div>
                <div className="donut-wrap"><div className="donut"><span>١٨٤<small>طلباً</small></span></div></div>
                <div className="chart-legend"><span><i className="legend-teal" />واتساب <b>٤٦٪</b></span><span><i className="legend-coral" />الموقع <b>٣٢٪</b></span><span><i className="legend-gold" />اتصال <b>٢٢٪</b></span></div>
              </div>
            </div>
          </main>
        </div>
      </div>
      <div className="dashboard-toast"><CheckCircle2 size={16} /><span><b>تم إسناد الطلب #CF-2084</b><small>إلى فريق النخبة · منذ لحظات</small></span></div>
    </div>
  );
}

function DemoModal({ onClose }: { onClose: () => void }) {
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSending(true);
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch(`${API_BASE}/api/service-requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isQuoteRequest: true,
          clientName: String(form.get("name") ?? "").trim(),
          phone: String(form.get("phone") ?? "").trim(),
          notes: `عدد الفرق: ${String(form.get("teams") ?? "").trim()}\n${String(form.get("message") ?? "").trim()}`,
          serviceType: "طلب عرض CleanFlow Platform",
          tracking: {
            landingPage: window.location.href,
            referrer: document.referrer,
          },
        }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.message || payload?.error || "تعذر إرسال الطلب");
      }
      setSent(true);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "تعذر إرسال الطلب، حاول مرة أخرى");
    } finally {
      setSending(false);
    }
  };
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="demo-title" data-testid="dialog-demo">
      <div className="demo-modal">
        <button onClick={onClose} className="modal-close" aria-label="إغلاق" data-testid="button-close-demo"><X size={18} /></button>
        {!sent ? (
          <>
            <span className="eyebrow">جولة مخصصة لشركتك</span>
            <h2 id="demo-title">خلّنا نرسم غرفة تشغيلك.</h2>
            <p>أخبرنا كيف تدير الطلبات والفرق اليوم، وسنريك كيف تنتقل إلى CleanFlow Platform خطوة بخطوة.</p>
            <form onSubmit={submit} className="demo-form">
              <label>الاسم الكامل<input required name="name" placeholder="مثال: محمد العتيبي" data-testid="input-demo-name" /></label>
              <label>رقم الجوال<input required type="tel" name="phone" placeholder="05X XXX XXXX" data-testid="input-demo-phone" /></label>
              <label>كم فريقاً تدير؟<select required name="teams" defaultValue="" data-testid="select-demo-teams"><option value="" disabled>اختر العدد التقريبي</option><option>فريق واحد إلى ٣ فرق</option><option>من ٤ إلى ١٠ فرق</option><option>أكثر من ١٠ فرق</option></select></label>
              <label>كيف تدير الطلبات اليوم؟<textarea required name="message" rows={3} placeholder="واتساب، مكالمات، إكسل..." data-testid="input-demo-message" /></label>
              {error && <small className="form-note" role="alert" style={{ color: "#b84d3d" }}>{error}</small>}
              <button type="submit" className="submit-demo" disabled={sending} data-testid="button-submit-demo">
                {sending ? "جارٍ إرسال الطلب..." : "إرسال طلب العرض"} {!sending && <Send size={16} />}
              </button>
              <small className="form-note">بياناتك للتواصل حول العرض فقط، ولا نرسل رسائل تسويقية.</small>
            </form>
          </>
        ) : (
          <div className="success-state" data-testid="status-demo-success">
            <div className="success-icon"><Check size={27} /></div>
            <span className="eyebrow">تم الاستلام</span>
            <h2>وصل طلبك إلى فريقنا.</h2>
            <p>سيتواصل معك مستشار من CleanFlow Platform خلال يوم العمل لتحديد موعد يناسبك.</p>
            <button onClick={onClose} className="action-button action-dark" data-testid="button-finish-demo">إغلاق النافذة</button>
          </div>
        )}
      </div>
    </div>
  );
}

function SectionHeading({ eyebrow, title, body, align = "right" }: { eyebrow: string; title: string; body?: string; align?: "right" | "center" }) {
  return (
    <div className={`section-heading ${align === "center" ? "heading-center" : ""}`}>
      <span className="eyebrow">{eyebrow}</span>
      <h2>{title}</h2>
      {body && <p>{body}</p>}
    </div>
  );
}

function Hero({ onDemo }: { onDemo: () => void }) {
  return (
    <section className="hero" id="top">
      <div className="hero-orb orb-one" /><div className="hero-orb orb-two" />
      <div className="page-shell hero-grid">
        <div className="hero-copy reveal">
          <div className="hero-kicker"><span><Zap size={14} /></span> مركز قيادة شركات النظافة الحديثة</div>
          <h1>كل طلب نظافة<br /><em>في مساره الصحيح.</em></h1>
          <p className="hero-lede">CleanFlow Platform تجمع طلباتك، فرقك، خدماتك، وبياناتك في غرفة تشغيل واحدة — لتدير شركة النظافة بثقة، لا بردود الفعل.</p>
          <div className="hero-actions">
            <Button onClick={onDemo} testId="button-hero-demo">شاهد المنصة على نشاطك <ArrowLeft size={17} /></Button>
            <a href="#workflow" className="text-link" data-testid="link-hero-workflow"><span className="play-circle"><ArrowUpLeft size={14} /></span> كيف تعمل؟</a>
          </div>
          <div className="hero-proof">
            <div className="proof-avatars"><span>ن</span><span>ر</span><span>م</span><span>+</span></div>
            <div><b>مصمم لواقع شركات النظافة في السعودية</b><small>من تنظيف الفلل إلى ما بعد البناء</small></div>
          </div>
        </div>
          <div className="hero-visual reveal reveal-delay"><DashboardMockup onDemo={onDemo} /></div>
      </div>
      <div className="hero-bottom-line page-shell">
        <span>ما الذي تريد السيطرة عليه اليوم؟</span>
        <div><a href="#platform">الطلبات</a><a href="#capabilities">الفرق</a><a href="#insights">الأداء</a></div>
        <span className="scroll-hint"><span /> اسحب للاكتشاف</span>
      </div>
    </section>
  );
}

function PlatformSection() {
  const rows = [
    ["الطلب", "محادثة في واتساب", "طلب له حالة، مالك، وموعد"],
    ["الفريق", "توزيع بالذاكرة", "جدول واضح حسب المنطقة"],
    ["الخدمة", "سعر في ملف متفرق", "كتالوج باقات قابل للتحديث"],
    ["القرار", "شعور وانطباع", "تقرير مصدر وإيراد وأداء"],
  ];
  return (
    <section className="dark-section section-pad" id="platform">
      <div className="page-shell platform-grid">
        <div>
          <span className="eyebrow eyebrow-light">لماذا CleanFlow؟</span>
          <h2>لا تدع واتساب وإكسل يديران شركتك بدلاً منك.</h2>
          <p>عندما تتعدد الفرق والمناطق والخدمات، لا يكفي أن تكون مشغولاً. تحتاج إلى نظام يرى الطلب من أول اتصال حتى إغلاق أمر العمل، ويعطي كل شخص الخطوة التالية.</p>
          <a href="#workflow" className="light-link" data-testid="link-platform-workflow">استكشف مسار الطلب <ArrowLeft size={16} /></a>
        </div>
        <div className="comparison-table" data-testid="table-operations-comparison">
          <div className="comparison-head"><span>نقطة التشغيل</span><span>اليوم</span><span>مع CleanFlow</span></div>
          {rows.map(([label, oldText, newText], index) => (
            <div className="comparison-row" key={label}>
              <b>{label}</b><span>{oldText}</span><strong><Check size={15} />{newText}</strong>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const capabilities = [
  { icon: ClipboardCheck, title: "متابعة الطلب من أوله لآخره", body: "استقبال الطلبات بمسارات مخصصة، تحديد الموقع على خريطة الرياض التفاعلية، وجدولة المواعيد الفورية والمسبقة.", tone: "coral" },
  { icon: Bell, title: "إشعارات الويب اللحظية (Web Push)", body: "تنبيهات فورية تصل إلى هواتف المشرفين والمديرين عند ورود أي طلب جديد حتى في حال إغلاق المتصفح مع خادم VAPID المستقل.", tone: "teal" },
  { icon: ShieldCheck, title: "إدارة تراخيص وشهادات السلامة", body: "نماذج فنية متكاملة لشهادات السلامة، تقارير الدفاع المدني الفورية والمجدولة، وعقود الصيانة الوقائية السنوية.", tone: "gold" },
  { icon: CalendarDays, title: "جدولة الفرق وأوامر العمل الميدانية", body: "توزيع وإسناد الطلبات للفرق والمشرفين عبر لوحة أوامر العمل الميدانية وتتبع حالة التنفيذ في كل حي.", tone: "teal" },
  { icon: Package, title: "كتالوج الباقات والتسعير الذكي", body: "إدارة الباقات والخدمات مع روابط SEO عربية نظيفة بالكامل، ودعم تسعير المساحات والإضافات المخصصة.", tone: "gold" },
  { icon: MessageCircle, title: "مساعد تفاعلي ذكي ودعم مباشر", body: "روبوت ذكي لإرشاد العميل خطوة بخطوة مع إمكانية التحويل الفوري إلى دردشة الدعم البشري المباشر.", tone: "teal" },
  { icon: BarChart3, title: "إحصائيات وتقارير نمو شاملة", body: "متابعة مؤشرات الأداء (KPIs)، معدلات الإنجاز، تحليل مصادر الزيارات والحملات الإعلانية وتوزيع الطلبات حسب الأحياء.", tone: "coral" },
  { icon: Sparkles, title: "توليد تلقائي لملفات SEO و LLMS.txt", body: "توليد خريطة الموقع sitemap.xml الثابتة، ملف الذكاء الاصطناعي llms.txt، والمقالات المهيأة لمحركات البحث.", tone: "teal" },
  { icon: EyeIcon, title: "تتبع العميل بالرقم بدون تسجيل دخول", body: "رابط مباشر للعميل برقم الطلب لمتابعة حالة الخدمة وملاحظات المشرف بشفافية وسرعة فائقة.", tone: "coral" },
];

function EyeIcon(props: { size?: number; strokeWidth?: number }) {
  return <Globe2 {...props} />;
}

function CapabilitiesSection({ onDemo }: { onDemo: () => void }) {
  return (
    <section className="section-pad capabilities-section" id="capabilities">
      <div className="page-shell">
        <SectionHeading
          eyebrow="غرفة التشغيل كاملة"
          title="الأدوات التي تحتاجها شركة النظافة عندما تكبر."
          body="ليست قائمة مزايا للعرض. هذه هي التفاصيل التي تمنع الطلبات من الضياع، وتمنح فريقك طريقة عمل ثابتة مهما تنوعت الخدمات."
        />
        <div className="capabilities-layout">
          <div className="capability-intro">
            <div className="intro-number">٠١</div>
            <h3>من أول رسالة إلى آخر ملاحظة.</h3>
            <p>تبدأ العملية من العميل وتنتهي بصورة واضحة عند الإدارة. كل مرحلة مرتبطة بالتي بعدها.</p>
            <Button onClick={onDemo} variant="dark" testId="button-capabilities-demo">ناقش احتياج شركتك <ArrowLeft size={16} /></Button>
          </div>
          <div className="capabilities-grid">
            {capabilities.map(({ icon: Icon, title, body, tone }, index) => (
              <article className={`capability-card tone-${tone}`} key={title} data-testid={`card-cleaning-capability-${index}`}>
                <div className="capability-top"><span className="capability-icon"><Icon size={19} /></span><small>٠{index + 1}</small></div>
                <h3>{title}</h3><p>{body}</p><span className="card-arrow"><ArrowUpLeft size={14} /></span>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function WorkflowSection() {
  const steps = [
    ["٠١", "يصل الطلب من أي قناة", "موقعك، واتساب، اتصال، أو إدخال من موظف خدمة العملاء. لا يهم من أين بدأ."],
    ["٠٢", "يتحول إلى طلب مرتب", "الخدمة، الموقع، الموعد، ملاحظات العميل، وسجل المحادثة في بطاقة واحدة قابلة للتحديث."],
    ["٠٣", "تُسند المهمة للفريق المناسب", "اختر الفريق والمنطقة والوقت. تصل المهمة بأمر عمل واضح بدل رسالة ناقصة."],
    ["٠٤", "يُغلق العمل وتظهر النتيجة", "سجل التنفيذ والملاحظات وحالة الطلب، ثم راجع الإيراد والأداء ومصدر الطلب."],
  ];
  return (
    <section className="section-pad workflow-section" id="workflow">
      <div className="page-shell">
        <div className="workflow-head">
          <SectionHeading eyebrow="مسار الطلب" title="نظام واحد يتذكر كل التفاصيل." body="صمّمنا المسار حول يوم شركة النظافة الحقيقي: عميل يسأل، فريق يتحرك، ومدير يحتاج أن يرى الصورة." />
          <div className="workflow-stamp"><Workflow size={20} /><span>ORDER<br /><b>→ DONE</b></span></div>
        </div>
        <div className="workflow-steps">
          {steps.map(([number, title, body], index) => (
            <div className={`workflow-step ${index === 2 ? "step-highlight" : ""}`} key={number}>
              <div className="step-marker">{number}</div><div className="step-line" />
              <h3>{title}</h3><p>{body}</p>
            </div>
          ))}
        </div>
        <div className="workflow-bottom">
          <div className="workflow-checks"><span><CheckCircle2 size={16} /> رقم طلب لكل عميل</span><span><CheckCircle2 size={16} /> حالة واضحة للفريق</span><span><CheckCircle2 size={16} /> سجل قابل للرجوع</span></div>
          <a href="#tracking" data-testid="link-workflow-tracking">شاهد تجربة التتبع <ArrowLeft size={16} /></a>
        </div>
      </div>
    </section>
  );
}

function IndustrySection({ onDemo }: { onDemo: () => void }) {
  const services = [
    ["تنظيف المنازل والفلل", "باقات متكررة، تنظيف عميق، ومتابعة رضا العميل"],
    ["المجالس والكنب بالبخار", "توزيع فرق متخصصة مع غسيل حراري وتجفيف سريع"],
    ["ما بعد البناء والتشطيب", "إزالة بقايا الإسمنت والدهانات وتهيئة العقار للتسليم"],
    ["شهادات وتقارير السلامة", "تجهيز ملفات الدفاع المدني وتقارير المعاينة الفنية المعتمدة"],
    ["المكيفات والخزانات", "خدمات دورية مع تنبيهات ذكية بمواعيد الصيانة الدورية"],
    ["المسابح وجلي الرخام", "طلبات متخصصة بمعدات كريستالية وعقود موسمية"],
    ["مكافحة الحشرات والرش", "بلاغ، موعد، أمر عمل، وضمان سنة مع زيارات وقائية"],
    ["واجهات المباني والمؤسسات", "عقود نظافة دورية للمنشآت والمكاتب والشركات الكبرى"],
  ];
  return (
    <section className="section-pad industry-section">
      <div className="page-shell industry-grid">
        <div className="industry-visual">
          <div className="visual-note note-top"><MapPin size={15} /><span>الرياض<br /><b>٣ مناطق نشطة</b></span></div>
          <div className="industry-card">
            <div className="industry-card-head"><span className="mini-logo"><Workflow size={15} /></span><span>صحة التشغيل اليوم</span><MoreHorizontal size={15} /></div>
            <div className="health-score"><strong>٨٧</strong><span>/ ١٠٠</span><div><b>مؤشر انسيابية العمل</b><small>أعلى من الأسبوع الماضي بـ ١٢٪</small></div></div>
            <div className="fake-bars">{[44, 65, 51, 78, 62, 89, 73].map((height, index) => <span key={index} style={{ height: `${height}%` }} className={index === 5 ? "bar-hot" : ""} />)}</div>
            <div className="industry-card-foot"><span>السبت</span><span>الأحد</span><span>الإثنين</span><span>الثلاثاء</span><span>الأربعاء</span><span>الخميس</span><span>الجمعة</span></div>
          </div>
          <div className="visual-note note-bottom"><Users size={15} /><span><b>٠٧ فرق</b><br />تعمل الآن</span></div>
        </div>
        <div className="industry-copy">
          <span className="eyebrow">مصمم لنشاطك، لا لنشاط عام</span>
          <h2>كل خدمة لها تفاصيلها. والمنصة تعرف ذلك.</h2>
          <p>في نشاطك، لا يشبه طلب تنظيف فيلا طلب مكافحة حشرات أو تلميع رخام. CleanFlow تترك لكل خدمة مسارها وبياناتها وفريقها، بينما تبقى الإدارة في لوحة واحدة.</p>
          <div className="service-list">
            {services.map(([title, description]) => <div className="service-item" key={title}><span className="service-check"><Check size={13} /></span><div><b>{title}</b><small>{description}</small></div></div>)}
          </div>
          <Button onClick={onDemo} testId="button-industry-demo">صمّم الكتالوج الخاص بك <ArrowLeft size={16} /></Button>
        </div>
      </div>
    </section>
  );
}

function InsightsSection() {
  const [filtered, setFiltered] = useState(false);
  return (
    <section className="dark-section insights-section section-pad" id="insights">
      <div className="page-shell insights-grid">
        <div className="insights-copy">
          <span className="eyebrow eyebrow-light">قرار مبني على الواقع</span>
          <h2>لا تكتفِ بمعرفة عدد الطلبات.</h2>
          <p>اعرف أي قناة تجلب عميلاً، أي خدمة تحقق إيراداً، وأي فريق يحتاج دعماً. التقارير تجعل اجتماع الإدارة أقصر وقرارك أسرع.</p>
          <div className="insight-links"><span><Activity size={15} /> أداء الفرق</span><span><TrendingUp size={15} /> الإيراد حسب الخدمة</span><span><Link2 size={15} /> مصدر كل طلب</span></div>
        </div>
        <div className="analytics-board" data-testid="visual-cleaning-analytics">
          <div className="analytics-head"><div><small>ملخص الأداء</small><b>هذا الشهر</b></div><button onClick={() => setFiltered(!filtered)} data-testid="button-analytics-filter"><Filter size={13} /> {filtered ? "عرض الكل" : "تصفية"}</button></div>
          <div className="analytics-stats"><div><small>إجمالي الإيراد</small><strong>١٢٨٬٤٥٠ <i>ر.س</i></strong><span>↑ ١٦٪ عن الشهر الماضي</span></div><div><small>طلبات مكتملة</small><strong>٣٨٦</strong><span>↑ ٢٤٪ عن الشهر الماضي</span></div></div>
          <div className="analytics-chart"><div className="chart-y"><span>١٥٠</span><span>١٠٠</span><span>٥٠</span><span>٠</span></div><div className="chart-area"><div className="chart-grid-lines" /><svg viewBox="0 0 500 150" preserveAspectRatio="none" aria-label="رسم بياني للأداء"><path d="M0 120 C35 112, 48 98, 75 108 S110 85, 140 91 S180 58, 215 76 S255 45, 292 58 S330 33, 362 45 S400 20, 445 36 S475 18, 500 22" fill="none" stroke="#e46942" strokeWidth="3" /><path d="M0 120 C35 112, 48 98, 75 108 S110 85, 140 91 S180 58, 215 76 S255 45, 292 58 S330 33, 362 45 S400 20, 445 36 S475 18, 500 22 V150 H0Z" fill="url(#areaFill)" opacity=".22" /><defs><linearGradient id="areaFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#e46942" /><stop offset="100%" stopColor="#e46942" stopOpacity="0" /></linearGradient></defs></svg><div className="chart-x"><span>الأسبوع ١</span><span>الأسبوع ٢</span><span>الأسبوع ٣</span><span>الأسبوع ٤</span></div></div></div>
          <div className="analytics-foot"><span><i className="dot-coral" /> الإيراد</span><span><i className="dot-teal" /> الهدف الشهري</span><b>آخر تحديث قبل ٥ دقائق</b></div>
        </div>
      </div>
    </section>
  );
}

function TrackingSection() {
  const [trackingNumber, setTrackingNumber] = useState("");
  const [tracking, setTracking] = useState<Record<string, string> | null>(null);
  const [trackingError, setTrackingError] = useState("");
  const [loading, setLoading] = useState(false);
  const track = async () => {
    const id = trackingNumber.trim().replace(/^#?CF-/i, "");
    if (!/^\d+$/.test(id)) {
      setTracking(null);
      setTrackingError("أدخل رقم طلب صحيح مثل CF-2084");
      return;
    }
    setLoading(true);
    setTrackingError("");
    try {
      const response = await fetch(`${API_BASE}/api/service-requests/${id}`);
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(response.status === 404 ? "لم نعثر على هذا الطلب" : "تعذر جلب حالة الطلب");
      setTracking(payload);
    } catch (trackError) {
      setTracking(null);
      setTrackingError(trackError instanceof Error ? trackError.message : "تعذر جلب حالة الطلب");
    } finally {
      setLoading(false);
    }
  };
  return (
    <section className="tracking-section section-pad" id="tracking">
      <div className="page-shell tracking-grid">
        <div className="tracking-copy">
          <span className="eyebrow">تجربة عميل أهدأ</span>
          <h2>تتبّع الخدمة برقم الطلب. بلا حساب.</h2>
          <p>بعد التأكيد، يحصل العميل على رابط ورقم متابعة. يعرف هل الطلب مؤكد، مجدول، قيد التنفيذ أو مكتمل — ويعرف أن شركتك تتابع التفاصيل.</p>
          <div className="tracking-points"><span><CheckCircle2 size={16} /> يقلل اتصالات «وين وصل طلبي؟»</span><span><CheckCircle2 size={16} /> يرفع وضوح التجربة والثقة</span></div>
        </div>
        <div className="tracking-card" data-testid="card-order-tracking">
          <div className="tracking-card-head"><span className="mini-logo"><Workflow size={15} /></span><b>تتبع طلبك</b><span className="secure-label"><ShieldCheck size={12} /> آمن</span></div>
           <label>رقم الطلب<input value={trackingNumber} onChange={(event) => setTrackingNumber(event.target.value)} placeholder="مثال: CF-2084" aria-label="رقم الطلب" data-testid="input-tracking-number" /></label>
           <button onClick={track} disabled={loading} data-testid="button-track-order">{loading ? "جارٍ البحث..." : "عرض حالة الطلب"} <ArrowLeft size={16} /></button>
           {trackingError && <small className="form-note" role="alert" style={{ display: "block", color: "#b84d3d", marginTop: 10 }}>{trackingError}</small>}
           {tracking && <div className="tracking-result"><div className="result-top"><StatusPill>{tracking.status === "completed" ? "مكتمل" : tracking.status === "in_progress" ? "قيد التنفيذ" : tracking.status === "pending" ? "تم التأكيد" : tracking.status}</StatusPill><b>#{tracking.id}</b></div><p>{tracking.serviceType}{tracking.location ? ` · ${tracking.location}` : ""}</p><div className="progress-track"><span style={{ width: tracking.status === "completed" ? "100%" : tracking.status === "in_progress" ? "66%" : "33%" }} /></div><div className="progress-labels"><span>تم التأكيد</span><span>في الطريق</span><span>قيد التنفيذ</span><span>مكتمل</span></div></div>}
        </div>
      </div>
    </section>
  );
}

function FAQSection({ onDemo }: { onDemo: () => void }) {
  const questions = [
    ["هل CleanFlow Platform موقع لشركة تنظيف؟", "لا. هي منصة تشغيل تبيع لأصحاب ومديري شركات النظافة. تساعدك على إدارة الطلبات والفرق والعملاء والخدمات والتقارير من مكان واحد، بينما يبقى موقع شركتك واسمها وتجربتها تحت إدارتك."],
    ["هل تناسب شركة تبدأ بعدد فرق صغير؟", "نعم. تبدأ بما تحتاجه اليوم، ثم تتوسع معك. يمكنك تنظيم فريق أو أكثر، إضافة مناطق وخدمات وباقات، ومنح الموظفين الصلاحيات المناسبة مع نمو النشاط."],
    ["هل يمكن ربط واتساب؟", "تدعم المنصة تنظيم محادثات WhatsApp Business داخل سير العمل. يحدد فريقنا معك نوع الربط المناسب وحسابات شركتك قبل الإطلاق."],
    ["هل يستطيع العميل تتبع طلبه دون إنشاء حساب؟", "نعم. يحصل العميل على رقم الطلب أو رابط متابعة بعد الإرسال، ويستطيع معرفة الحالة والموعد والتفاصيل دون تسجيل دخول."],
    ["هل أستطيع إدارة خدمات مختلفة مثل المكيفات والرخام؟", "بالتأكيد. تنشئ لكل خدمة بياناتها وباقاتها ومسارها؛ من تنظيف المنازل والفلل والمجالس إلى ما بعد البناء والخزانات والمسابح والرخام ومكافحة الحشرات."],
    ["كم يستغرق تجهيز المنصة؟", "نبدأ بفهم طريقة عملك الحالية، ثم نجهز الكتالوج والأدوار ومسارات الطلب الأساسية. يختلف الوقت حسب حجم النشاط وعدد الخدمات والفرق، ونوضحه لك في العرض."],
  ];
  const [active, setActive] = useState<number | null>(0);
  return (
    <section className="section-pad faq-section" id="faq">
      <div className="page-shell faq-grid">
        <div className="faq-intro"><span className="eyebrow">أسئلة في محلها</span><h2>قبل أن تنقل التشغيل إلى مكان واحد.</h2><p>إذا لم تجد إجابتك هنا، احجز عرضاً ونناقش طريقة عملك الحالية بصراحة.</p><Button onClick={onDemo} testId="button-faq-demo">احجز جلسة تعريفية <ArrowLeft size={16} /></Button></div>
        <div className="faq-list">
          {questions.map(([question, answer], index) => (
            <div className={`faq-item ${active === index ? "is-open" : ""}`} key={question}>
              <button onClick={() => setActive(active === index ? null : index)} aria-expanded={active === index} data-testid={`button-faq-${index}`}><span>{question}</span><ChevronDown size={18} /></button>
              {active === index && <p data-testid={`text-faq-answer-${index}`}>{answer}</p>}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Footer({ onDemo }: { onDemo: () => void }) {
  const [companyName, setCompanyName] = useState("المنشأة")
  useEffect(() => {
    fetch("/api/settings", { headers: { Accept: "application/json" } })
      .then(response => response.ok ? response.json() : null)
      .then(data => {
        if (typeof data?.company_name === "string" && data.company_name.trim()) setCompanyName(data.company_name.trim())
      })
      .catch(() => {})
  }, [])
  return (
    <footer className="site-footer">
      <div className="page-shell footer-cta"><div><span className="eyebrow eyebrow-light">الخطوة التالية</span><h2>شغّل شركتك كما تستحق.</h2><p>عرض عملي مخصص لطريقة عملك في الرياض والسعودية.</p></div><Button onClick={onDemo} variant="primary" testId="button-footer-demo">اطلب عرض CleanFlow <ArrowLeft size={17} /></Button></div>
      <div className="page-shell footer-main"><Logo /><div className="footer-links"><a href="#platform" data-testid="link-footer-platform">المنصة</a><a href="#capabilities" data-testid="link-footer-capabilities">الإمكانات</a><a href="#insights" data-testid="link-footer-insights">التقارير</a><a href="#faq" data-testid="link-footer-faq">الأسئلة الشائعة</a><a href="/" data-testid="link-footer-company">موقع {companyName}</a></div><span className="copyright">CleanFlow Platform · تشغيل أوضح، نمو أهدأ</span></div>
    </footer>
  );
}

function HomePage() {
  const [demoOpen, setDemoOpen] = useState(false);
  return (
    <div className="texture" dir="rtl">
      <TopNav onDemo={() => setDemoOpen(true)} />
      <main>
        <Hero onDemo={() => setDemoOpen(true)} />
        <PlatformSection />
        <WorkflowSection />
        <CapabilitiesSection onDemo={() => setDemoOpen(true)} />
        <IndustrySection onDemo={() => setDemoOpen(true)} />
        <InsightsSection />
        <TrackingSection />
        <FAQSection onDemo={() => setDemoOpen(true)} />
      </main>
      <Footer onDemo={() => setDemoOpen(true)} />
      {demoOpen && <DemoModal onClose={() => setDemoOpen(false)} />}
    </div>
  );
}

function NotFound() {
  return <div className="not-found"><Logo /><span className="eyebrow">404</span><h1>هذه الصفحة خارج المسار.</h1><p>يبدو أن الرابط لا يقود إلى جزء من غرفة التشغيل.</p><a href="/" data-testid="link-not-found-home">العودة إلى الصفحة الرئيسية <ArrowLeft size={16} /></a></div>;
}

function App() {
  const platformBase = import.meta.env.BASE_URL.replace(/\/$/, '');
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
          <WouterRouter base={platformBase}>
          <Switch>
            <Route path="/" component={HomePage} />
            <Route component={NotFound} />
          </Switch>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;