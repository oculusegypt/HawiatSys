/* Web Push service worker for CleanFlow admin notifications. */
self.addEventListener("install", () => {
  void self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "إشعار جديد", message: event.data?.text?.() || "" };
  }

  event.waitUntil((async () => {
    const visibleClients = await self.clients.matchAll({
      type: "window",
      includeUncontrolled: true,
    });
    const visibleAdmin = visibleClients.find(client =>
      client.visibilityState === "visible" && new URL(client.url).pathname.startsWith("/admin")
    );
    if (visibleAdmin) {
      visibleAdmin.postMessage({ type: "admin:push-notification", notification: data });
      return;
    }

    const title = data.title || "إشعار جديد";
    const targetPath = data.refType === "service_request" && data.refId
      ? `/admin/requests?open=${encodeURIComponent(data.refId)}`
      : data.refType === "conversation" && data.refId
        ? `/admin/conversations?open=${encodeURIComponent(data.refId)}`
        : data.refType === "whatsapp" && data.refId
          ? `/admin/whatsapp?open=${encodeURIComponent(data.refId)}`
          : "/admin/notifications";
    const options = {
      body: data.message || "لديك إشعار جديد في لوحة الإدارة",
      // Keep notification assets square so Android does not crop the identity.
      icon: new URL("notification-icon.png", self.registration.scope).href,
      badge: new URL("notification-icon.png", self.registration.scope).href,
      dir: "rtl",
      lang: "ar",
      tag: data.id ? `cleanflow-notification-${data.id}` : "cleanflow-notification",
      renotify: true,
      silent: false,
      data: { url: targetPath, notificationId: data.id, refId: data.refId, refType: data.refType },
    };

    await self.registration.showNotification(title, options);
  })());
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = new URL(event.notification.data?.url || "/admin/notifications", self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      const existing = clients.find((client) => "focus" in client);
      if (existing) {
        return existing.navigate(targetUrl).then(() => existing.focus());
      }
      return self.clients.openWindow(targetUrl);
    }),
  );
});