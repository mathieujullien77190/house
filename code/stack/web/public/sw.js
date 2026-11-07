// Le service worker de House : il ne sert qu'à afficher les notifications de mouvement (Android n'accepte pas new Notification),
// et à ramener sur la WebApp au clic. Aucun cache, aucune interception du réseau.
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      const open = windows[0]
      return open ? open.focus() : self.clients.openWindow('/')
    }),
  )
})
