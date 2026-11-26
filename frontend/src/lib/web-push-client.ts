function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/")
  const raw = atob(base64)
  const output = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i += 1) {
    output[i] = raw.charCodeAt(i)
  }
  return output
}

export async function ensurePushServiceWorker(): Promise<ServiceWorkerRegistration> {
  if (!("serviceWorker" in navigator)) {
    throw new Error("Service Worker не поддерживается в этом браузере")
  }
  const registration = await navigator.serviceWorker.register("/sw.js")
  await navigator.serviceWorker.ready
  return registration
}

export async function subscribeBrowserPush(
  vapidPublicKey: string,
): Promise<PushSubscription> {
  if (!("PushManager" in window)) {
    throw new Error("Web Push не поддерживается в этом браузере")
  }
  const permission = await Notification.requestPermission()
  if (permission !== "granted") {
    throw new Error(
      permission === "denied"
        ? "Разрешение на уведомления отклонено в настройках браузера"
        : "Разрешение на уведомления не выдано",
    )
  }

  const registration = await ensurePushServiceWorker()
  const existing = await registration.pushManager.getSubscription()
  if (existing) {
    return existing
  }

  return registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(
      vapidPublicKey,
    ) as BufferSource,
  })
}

export async function unsubscribeBrowserPush(): Promise<string | null> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    return null
  }
  const registration = await navigator.serviceWorker.getRegistration()
  const subscription = await registration?.pushManager.getSubscription()
  if (!subscription) return null
  const endpoint = subscription.endpoint
  await subscription.unsubscribe()
  return endpoint
}

export function pushSubscriptionToPayload(subscription: PushSubscription) {
  const json = subscription.toJSON()
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
    throw new Error("Неполная push-подписка")
  }
  return {
    endpoint: json.endpoint,
    keys: {
      p256dh: json.keys.p256dh,
      auth: json.keys.auth,
    },
    userAgent:
      typeof navigator !== "undefined" ? navigator.userAgent : undefined,
  }
}
