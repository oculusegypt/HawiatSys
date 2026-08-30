import * as React from "react"
import { Link } from "wouter"
import { Phone, Mail, MapPin, Map, Facebook, Instagram, Youtube, Twitter, Music2, Ghost, Linkedin, ExternalLink } from "lucide-react"
import { formatSaudiPhone, getSafeGoogleBusinessProfileUrl, getSafeMapEmbedUrl, useSiteSettings } from "@/context/SiteSettingsContext"

export function Footer() {
  const siteSettings = useSiteSettings()
  const [mapLoadFailed, setMapLoadFailed] = React.useState(false)
  const phones = siteSettings.phones
  const googleBusinessProfile = getSafeGoogleBusinessProfileUrl(siteSettings.googleBusinessProfile)
  const mapOptions = {
    latitude: siteSettings.latitude,
    longitude: siteSettings.longitude,
    address: [siteSettings.address, siteSettings.city, siteSettings.region].filter(Boolean).join("، "),
    companyName: siteSettings.companyName,
  }
  const mapEmbed = getSafeMapEmbedUrl(mapLoadFailed ? "" : siteSettings.mapEmbed, mapOptions)
  const description = siteSettings.footerDescription
  const address = [siteSettings.address, siteSettings.city, siteSettings.region]
    .filter(Boolean)
    .join("، ")
  const socialItems = [
    { key: "facebook", label: "فيسبوك", href: siteSettings.socialLinks.facebook, Icon: Facebook },
    { key: "x", label: "منصة X", href: siteSettings.socialLinks.x, Icon: Twitter },
    { key: "instagram", label: "إنستجرام", href: siteSettings.socialLinks.instagram, Icon: Instagram },
    { key: "tiktok", label: "تيك توك", href: siteSettings.socialLinks.tiktok, Icon: Music2 },
    { key: "snapchat", label: "سناب شات", href: siteSettings.socialLinks.snapchat, Icon: Ghost },
    { key: "youtube", label: "يوتيوب", href: siteSettings.socialLinks.youtube, Icon: Youtube },
    { key: "linkedin", label: "LinkedIn", href: siteSettings.socialLinks.linkedin, Icon: Linkedin },
  ].filter((item) => Boolean(item.href))

  return (
    <footer className="bg-primary text-white pt-16 pb-8">
      <div className="container mx-auto px-4 md:px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">

          <div className="space-y-4">
            {siteSettings.isLoaded && siteSettings.logoUrl ? (
              <img src={siteSettings.logoUrl} alt={`شعار ${siteSettings.companyName}`} width={220} height={80} className="h-16 w-auto mb-4 object-contain" />
            ) : (
              <h3 className="text-2xl font-bold text-white mb-4">{siteSettings.companyName || "تأجير الحاويات بالرياض"}</h3>
            )}
             {description && <p className="text-gray-300 text-sm leading-relaxed">{description}</p>}
            <div className="pt-2" aria-label="حسابات التواصل الاجتماعي">
                {socialItems.length > 0 && <p className="mb-2 text-xs font-bold text-gray-400">حساباتنا على وسائل التواصل</p>}
               <div className="flex flex-wrap gap-2">
                {socialItems.map(({ key, label, href, Icon }) => (
                  <a
                    key={key}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                     aria-label={label}
                     title={label}
                    className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 text-gray-300 transition-all hover:-translate-y-0.5 hover:border-secondary hover:bg-secondary hover:text-primary"
                  >
                    <Icon size={18} />
                  </a>
                ))}
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-xl font-bold mb-6 text-secondary relative inline-block">
              روابط سريعة
              <span className="absolute bottom-0 right-0 w-1/2 h-1 bg-secondary rounded-full -mb-2"></span>
            </h3>
            <ul className="space-y-3">
              <li><Link href="/"><span className="text-gray-300 hover:text-white transition-colors cursor-pointer block">الرئيسية</span></Link></li>
              <li><Link href="/about"><span className="text-gray-300 hover:text-white transition-colors cursor-pointer block">من نحن</span></Link></li>
               <li><Link href="/containers" className="text-gray-300 hover:text-white transition-colors block">الحاويات المتاحة</Link></li>
               <li><Link href="/services" className="text-gray-300 hover:text-white transition-colors block">الخدمات الميدانية</Link></li>
              <li><Link href="/faq"><span className="text-gray-300 hover:text-white transition-colors cursor-pointer block font-semibold text-secondary">الأسئلة الشائعة (FAQ)</span></Link></li>
              <li><Link href="/pricing"><span className="text-gray-300 hover:text-white transition-colors cursor-pointer block">أسعار الحاويات</span></Link></li>
              <li><Link href="/areas"><span className="text-gray-300 hover:text-white transition-colors cursor-pointer block">تغطية أحياء الرياض</span></Link></li>
              <li><Link href="/blog"><span className="text-gray-300 hover:text-white transition-colors cursor-pointer block">المدونة والمقالات</span></Link></li>
              <li><Link href="/contact"><span className="text-gray-300 hover:text-white transition-colors cursor-pointer block font-semibold text-secondary">اتصل بنا</span></Link></li>
            </ul>
          </div>

            <div>
            <h3 className="text-xl font-bold mb-6 text-secondary relative inline-block">
               الحاويات والخدمات
              <span className="absolute bottom-0 right-0 w-1/2 h-1 bg-secondary rounded-full -mb-2"></span>
            </h3>
            <ul className="space-y-3">
               <li><Link href="/containers"><span className="text-gray-300 hover:text-white transition-colors cursor-pointer block">استعراض الحاويات</span></Link></li>
               <li><Link href="/services"><span className="text-gray-300 hover:text-white transition-colors cursor-pointer block">استعراض الخدمات</span></Link></li>
               <li><Link href="/pricing"><span className="text-gray-300 hover:text-white transition-colors cursor-pointer block">أسعار الحاويات</span></Link></li>
               <li><Link href="/contact" className="text-gray-300 hover:text-white transition-colors block">اطلب الخدمة الآن</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-xl font-bold mb-6 text-secondary relative inline-block">
              معلومات التواصل
              <span className="absolute bottom-0 right-0 w-1/2 h-1 bg-secondary rounded-full -mb-2"></span>
            </h3>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <MapPin className="text-secondary shrink-0 mt-1" size={20} />
                 {address && <span className="text-gray-300">{address}</span>}
              </li>
              {phones.length > 0 && (
                <li className="flex items-start gap-3">
                  <Phone className="text-secondary shrink-0 mt-1" size={20} />
                  <div className="flex flex-col gap-1">
                    {phones.map(ph => (
                      <a key={ph} href={`tel:${ph}`}
                        className="text-gray-300 hover:text-white transition-colors"
                        dir="ltr">
                        {formatSaudiPhone(ph)}
                      </a>
                    ))}
                  </div>
                </li>
              )}
                {googleBusinessProfile && (
                  <li className="flex items-start gap-3">
                    <Map className="text-secondary shrink-0 mt-1" size={20} />
                    <a
                      href={googleBusinessProfile}
                      itemProp="sameAs"
                      data-google-business-profile="true"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-300 hover:text-white transition-colors inline-flex items-center gap-1"
                    >
                      ملفنا على Google Business Profile <ExternalLink size={13} aria-hidden="true" />
                    </a>
                  </li>
                )}
                {siteSettings.email && <li className="flex items-center gap-3">
                <Mail className="text-secondary shrink-0" size={20} />
                 <a href={`mailto:${siteSettings.email}`} className="text-gray-300 hover:text-white transition-colors">{siteSettings.email}</a>
               </li>}
            </ul>
          </div>

        </div>

         <div className="border-t border-white/10 pt-5 mb-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
           <span className="text-xs text-gray-400">حلول رقمية وتشغيلية للشركات الطموحة</span>
            <a href="https://aiservx.com" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-secondary hover:text-white font-bold text-sm transition-colors" data-testid="link-aiservx-footer">
              <span>aiservx.com</span> <span className="text-gray-400 font-normal">مطوّر النظام</span>
           </a>
         </div>

        {/* Google Maps */}
        {mapEmbed && (
          <div className="mb-10">
            <div className="flex items-center gap-2 mb-4">
              <Map size={18} className="text-secondary" />
              <h3 className="text-lg font-bold text-secondary">موقعنا على الخريطة</h3>
            </div>
            <div className="rounded-2xl overflow-hidden border-2 border-white/10 shadow-xl">
              <iframe
                src={mapEmbed}
                width="100%"
                height="280"
                 className="block h-[280px] w-full border-0"
                allowFullScreen
                loading="lazy"
                referrerPolicy="strict-origin-when-cross-origin"
                onError={() => setMapLoadFailed(true)}
                title={`موقع ${siteSettings.companyName} على الخريطة`}
              />
            </div>
          </div>
        )}

        {/* Neighborhoods */}
        <div className="mb-10 pt-6 border-t border-white/10">
          <h3 className="text-base font-bold mb-4 text-secondary">خدمات تأجير الحاويات في أحياء ومناطق الرياض</h3>
          <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-gray-400">
            {[
              { href: "/areas",                      text: "كل مناطق الخدمة" },
              { href: "/areas/شمال-الرياض",         text: "شمال الرياض" },
              { href: "/areas/جنوب-الرياض",         text: "جنوب الرياض" },
              { href: "/areas/شرق-الرياض",          text: "شرق الرياض"  },
              { href: "/areas/غرب-الرياض",          text: "غرب الرياض"  },
              { href: "/areas/وسط-الرياض",          text: "وسط الرياض"  },
              { href: "/areas/حي-الملقا",           text: "حي الملقا"   },
              { href: "/areas/حي-الياسمين",         text: "حي الياسمين" },
              { href: "/areas/حي-النرجس",           text: "حي النرجس"   },
              { href: "/areas/حي-العارض",           text: "حي العارض"   },
              { href: "/areas/حي-حطين",             text: "حي حطين"     },
              { href: "/areas/حي-الصحافة",          text: "حي الصحافة"  },
              { href: "/areas/حي-النفل",            text: "حي النفل"    },
              { href: "/areas/حي-بدر",              text: "حي بدر"      },
              { href: "/areas/حي-الحائر",           text: "حي الحائر"   },
              { href: "/areas/حي-القادسية",         text: "حي القادسية" },
              { href: "/areas/حي-النسيم",           text: "حي النسيم"   },
              { href: "/areas/حي-الروضة",           text: "حي الروضة"   },
            ].map(l => (
              <a key={l.href} href={l.href} className="hover:text-white transition-colors">{l.text}</a>
            ))}
          </div>
        </div>

        <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-gray-400 text-sm">
             جميع الحقوق محفوظة © {new Date().getFullYear()} {siteSettings.companyName ? `لـ ${siteSettings.companyName}` : ""}
          </p>
          <div className="flex flex-wrap gap-4 text-sm text-gray-400">
            <Link href="/faq"><span className="hover:text-white cursor-pointer">الأسئلة الشائعة</span></Link>
            <Link href="/privacy"><span className="hover:text-white cursor-pointer">سياسة الخصوصية</span></Link>
            <Link href="/terms"><span className="hover:text-white cursor-pointer">الشروط والأحكام</span></Link>
            <Link href="/contact"><span className="hover:text-white cursor-pointer">اتصل بنا</span></Link>
            <Link href="/about"><span className="hover:text-white cursor-pointer">من نحن</span></Link>
            <Link href="/pricing"><span className="hover:text-white cursor-pointer">الأسعار</span></Link>
            <Link href="/blog"><span className="hover:text-white cursor-pointer">المدونة</span></Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
