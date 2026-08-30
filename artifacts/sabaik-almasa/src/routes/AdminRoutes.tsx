import React, { lazy, Suspense } from "react"
import { Route, Switch } from "wouter"
import AdminLayout from "@/pages/admin/AdminLayout"

const AdminDashboard = lazy(() => import("@/pages/admin/Dashboard"))
const AdminRequests = lazy(() => import("@/pages/admin/Requests"))
const AdminWorkOrders = lazy(() => import("@/pages/admin/WorkOrders"))
const AdminConversations = lazy(() => import("@/pages/admin/Conversations"))
const AdminNotifications = lazy(() => import("@/pages/admin/Notifications"))
const AdminSlides = lazy(() => import("@/pages/admin/Slides"))
const AdminServices = lazy(() => import("@/pages/admin/Services"))
const AdminPackages = lazy(() => import("@/pages/admin/Packages"))
const AdminContainerSystem = lazy(() => import("@/pages/admin/ContainerSystem"))
const ContainerRecordProfile = lazy(() => import("@/pages/admin/ContainerRecordProfile").then(module => ({ default: module.ContainerRecordProfile })))
const ContractPrintPage = lazy(() => import("@/pages/admin/ContainerRecordProfile").then(module => ({ default: module.ContractPrintPage })))
const InvoicePrintPage = lazy(() => import("@/pages/admin/InvoicePrintPage"))
const AdminTestimonials = lazy(() => import("@/pages/admin/Testimonials"))
const AdminPartners = lazy(() => import("@/pages/admin/Partners"))
const AdminSiteSettings = lazy(() => import("@/pages/admin/SiteSettings"))
const AdminSEOPanel = lazy(() => import("@/pages/admin/SEOPanel"))
const AdminAds = lazy(() => import("@/pages/admin/Ads"))
const AdminAnalytics = lazy(() => import("@/pages/admin/Analytics"))
const AdminBlog = lazy(() => import("@/pages/admin/Blog"))
const AdminEmployees = lazy(() => import("@/pages/admin/Employees"))
const AdminRoles = lazy(() => import("@/pages/admin/RolesPermissions"))
const AdminProfile = lazy(() => import("@/pages/admin/AdminProfile"))
const DatabaseManager = lazy(() => import("@/pages/admin/DatabaseManager"))
const WhatsAppAdmin = lazy(() => import("@/pages/admin/WhatsApp"))
const AdminSeoPages = lazy(() => import("@/pages/admin/SeoPages"))
const AdminReviews = lazy(() => import("@/pages/admin/Reviews"))
const AdminStructuredContent = lazy(() => import("@/pages/admin/StructuredContent"))

export function AdminRoutes() {
  return (
    <AdminLayout>
      <Suspense fallback={<div className="min-h-[50vh] flex items-center justify-center"><div className="w-8 h-8 border-3 border-primary/20 border-t-primary rounded-full animate-spin" /></div>}>
        <Switch>
          <Route path="/admin" component={AdminDashboard} />
          <Route path="/admin/requests" component={AdminRequests} />
          <Route path="/admin/work-orders" component={AdminWorkOrders} />
          <Route path="/admin/conversations" component={AdminConversations} />
          <Route path="/admin/notifications" component={AdminNotifications} />
          <Route path="/admin/slides" component={AdminSlides} />
          <Route path="/admin/testimonials" component={AdminTestimonials} />
          <Route path="/admin/reviews" component={AdminReviews} />
          <Route path="/admin/partners" component={AdminPartners} />
          <Route path="/admin/services" component={AdminServices} />
          <Route path="/admin/cleaning-packages" component={AdminPackages} />
          <Route path="/admin/packages" component={AdminPackages} />
          <Route path="/admin/containers" component={AdminPackages} />
          <Route path="/admin/container-system" component={AdminContainerSystem} />
          <Route path="/admin/container-system/profile/customer/:id" component={() => <ContainerRecordProfile mode="customer" />} />
          <Route path="/admin/container-system/profile/employee/:id" component={() => <ContainerRecordProfile mode="employee" />} />
          <Route path="/admin/container-system/profile/container/:id" component={() => <ContainerRecordProfile mode="container" />} />
          <Route path="/admin/container-system/contract/:id/print" component={ContractPrintPage} />
          <Route path="/admin/container-system/invoice/:id/details" component={InvoicePrintPage} />
          <Route path="/admin/container-system/invoice/:id/print" component={InvoicePrintPage} />
          <Route path="/admin/ads" component={AdminAds} />
          <Route path="/admin/analytics" component={AdminAnalytics} />
          <Route path="/admin/blog" component={AdminBlog} />
          <Route path="/admin/seo-pages" component={AdminSeoPages} />
          <Route path="/admin/settings" component={AdminSiteSettings} />
          <Route path="/admin/seo" component={AdminSEOPanel} />
          <Route path="/admin/structured-content" component={AdminStructuredContent} />
          <Route path="/admin/employees" component={AdminEmployees} />
          <Route path="/admin/roles-permissions" component={AdminRoles} />
          <Route path="/admin/profile" component={AdminProfile} />
          <Route path="/admin/database" component={DatabaseManager} />
          <Route path="/admin/whatsapp" component={WhatsAppAdmin} />
        </Switch>
      </Suspense>
    </AdminLayout>
  )
}
