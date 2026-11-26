/* lineup24 service worker — Web Push */
self.addEventListener("push", (event) => {
  let data = {
    title: "lineup24",
    body: "Новый сигнал",
    url: "/dashboard/signals",
  }
  try {
    if (event.data) {
      data = { ...data, ...event.data.json() }
    }
  } catch {
    // keep defaults
  }

  event.waitUntil(
    self.registration.showNotification(data.title || "lineup24", {
      body: data.body || "Новый сигнал",
      data: { url: data.url || "/dashboard/signals", betId: data.betId },
      icon: "/favicon.ico",
      badge: "/favicon.ico",
    }),
  )
})

self.addEventListener("notificationclick", (event) => {
  event.notification.close()
  const targetUrl =
    (event.notification.data && event.notification.data.url) ||
    "/dashboard/signals"

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ("focus" in client) {
          client.navigate(targetUrl)
          return client.focus()
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl)
      }
      return undefined
    }),
  )
})
