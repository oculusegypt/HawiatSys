import React, { lazy, Suspense } from "react"
import { Route, Redirect, Switch, useRoute } from "wouter"
import Home from "@/pages/Home"

const Blog = lazy(() => import("@/pages/Blog"))
const BlogPost = lazy(() => import("@/pages/BlogPost"))
const AboutPage = lazy(() => import("@/pages/AboutPage"))
const ContactPage = lazy(() => import("@/pages/ContactPage"))
const PartnersPage = lazy(() => import("@/pages/PartnersPage"))
const PackagesPage = lazy(() => import("@/pages/PackagesPage"))
const PackageDetail = lazy(() => import("@/pages/PackageDetail"))
const ServiceDetail = lazy(() => import("@/pages/ServiceDetail"))
const ServicesPage = lazy(() => import("@/pages/ServicesPage"))
const WhyUsLeadership = lazy(() => import("@/pages/WhyUsLeadership"))
const WhyUsWhatWe = lazy(() => import("@/pages/WhyUsWhatWe"))
const WhyUsCommitment = lazy(() => import("@/pages/WhyUsCommitment"))
const WhyUsExperience = lazy(() => import("@/pages/WhyUsExperience"))
const PricingPage = lazy(() => import("@/pages/PricingPage"))
const NeighborhoodPage = lazy(() => import("@/pages/NeighborhoodPage"))
const AreasIndexPage = lazy(() => import("@/pages/AreasIndexPage"))
const FaqPage = lazy(() => import("@/pages/FaqPage"))
const PrivacyPage = lazy(() => import("@/pages/PrivacyPage"))
const TermsPage = lazy(() => import("@/pages/TermsPage"))
const Chat = lazy(() => import("@/pages/Chat"))
const SeoPage = lazy(() => import("@/pages/SeoPage"))
const SeoPagesIndexPage = lazy(() => import("@/pages/SeoPagesIndexPage"))
const NotFound = lazy(() => import("@/pages/not-found"))

export function PublicRoutes() {
  return (
    <Suspense fallback={<div className="min-h-[50vh] flex items-center justify-center"><div className="w-8 h-8 border-3 border-primary/20 border-t-primary rounded-full animate-spin" /></div>}>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/blog/:slug" component={BlogPost} />
        <Route path="/blog" component={Blog} />
        <Route path="/المدونة" component={Blog} />
        <Route path="/المدونة/:slug" component={BlogPost} />
        <Route path="/news/:slug">
          {() => { const [, p] = useRoute("/news/:slug"); return <Redirect to={`/blog/${p?.slug ?? ""}`} /> }}
        </Route>
        <Route path="/news"><Redirect to="/blog" /></Route>

        <Route path="/about" component={AboutPage} />
        <Route path="/about/" component={AboutPage} />
        <Route path="/من-نحن" component={AboutPage} />

        <Route path="/contact" component={ContactPage} />
        <Route path="/contact/" component={ContactPage} />
        <Route path="/اتصل-بنا" component={ContactPage} />

        <Route path="/faq" component={FaqPage} />
        <Route path="/faq/" component={FaqPage} />
        <Route path="/الأسئلة-الشائعة" component={FaqPage} />

        <Route path="/privacy" component={PrivacyPage} />
        <Route path="/privacy/" component={PrivacyPage} />
        <Route path="/privacy-policy"><Redirect to="/privacy" /></Route>
        <Route path="/privacy-policy/"><Redirect to="/privacy" /></Route>
        <Route path="/سياسة-الخصوصية" component={PrivacyPage} />

        <Route path="/terms" component={TermsPage} />
        <Route path="/terms/" component={TermsPage} />
        <Route path="/terms-and-conditions"><Redirect to="/terms" /></Route>
        <Route path="/terms-and-conditions/"><Redirect to="/terms" /></Route>
        <Route path="/الشروط-والأحكام" component={TermsPage} />

        <Route path="/partners" component={PartnersPage} />
        <Route path="/partners/" component={PartnersPage} />

        <Route path="/services" component={ServicesPage} />
        <Route path="/services/" component={ServicesPage} />
        <Route path="/services/:slug" component={ServiceDetail} />
        <Route path="/services/:slug/" component={ServiceDetail} />
        <Route path="/خدماتنا/:slug" component={ServiceDetail} />

        <Route path="/pricing" component={PricingPage} />
        <Route path="/pricing/" component={PricingPage} />
        <Route path="/الأسعار" component={PricingPage} />

        <Route path="/cleaning-packages" component={PackagesPage} />
        <Route path="/cleaning-packages/:slug" component={PackageDetail} />
        <Route path="/container/:slug" component={PackageDetail} />
        <Route path="/containers" component={PackagesPage} />
        <Route path="/containers/" component={PackagesPage} />
        <Route path="/containers/debris" component={PackagesPage} />
        <Route path="/containers/waste" component={PackagesPage} />
        <Route path="/containers/contracts" component={PackagesPage} />
        <Route path="/containers/contract" component={PackagesPage} />
        <Route path="/containers/:slug" component={PackageDetail} />
        <Route path="/containers/:slug/" component={PackageDetail} />
        <Route path="/container/:slug/" component={PackageDetail} />
        <Route path="/containers/:category" component={PackagesPage} />
        <Route path="/حاويات/:category" component={PackagesPage} />
        <Route path="/packages" component={PackagesPage} />
        <Route path="/packages/" component={PackagesPage} />

        <Route path="/areas" component={AreasIndexPage} />
        <Route path="/areas/" component={AreasIndexPage} />
        <Route path="/المناطق" component={AreasIndexPage} />
        <Route path="/areas/:slug" component={NeighborhoodPage} />
        <Route path="/areas/:slug/" component={NeighborhoodPage} />
        <Route path="/الأحياء/:slug" component={NeighborhoodPage} />

        <Route path="/page/:slug" component={SeoPage} />
        <Route path="/page/:slug/" component={SeoPage} />
        <Route path="/pages" component={SeoPagesIndexPage} />
        <Route path="/pages/" component={SeoPagesIndexPage} />
        <Route path="/pages/:slug" component={SeoPage} />
        <Route path="/pages/:slug/" component={SeoPage} />
        <Route path="/صفحة/:slug" component={SeoPage} />
        <Route path="/صفحات/:slug" component={SeoPage} />

        <Route path="/why-us/leadership" component={WhyUsLeadership} />
        <Route path="/why-us/what-we-do" component={WhyUsWhatWe} />
        <Route path="/why-us/commitment" component={WhyUsCommitment} />
        <Route path="/why-us/experience" component={WhyUsExperience} />

        <Route path="/chat" component={Chat} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  )
}
