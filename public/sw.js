// Service Worker do Handebol Hub (PWA)
// Proteção de privacidade: Não armazena em cache dados sensíveis de saúde dos atletas nem rotas de API.
// Faz cache de arquivos estáticos da interface e exibe tela de fallback quando offline.

const CACHE_ESTATICO = "handebol-hub-static-v2";
const CACHE_OFFLINE = "handebol-hub-offline-v2";
const OFFLINE_URL = "/offline.html";

const ARQUIVOS_BASE = [
  OFFLINE_URL,
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

self.addEventListener("install", (evento) => {
  evento.waitUntil(
    caches.open(CACHE_OFFLINE).then((cache) => cache.addAll(ARQUIVOS_BASE))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (evento) => {
  evento.waitUntil(
    caches.keys().then((chaves) =>
      Promise.all(
        chaves
          .filter((k) => k !== CACHE_ESTATICO && k !== CACHE_OFFLINE)
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (evento) => {
  const url = new URL(evento.request.url);

  // Nunca intercepta requisições de API, mutações ou supabase
  if (url.pathname.startsWith("/api/") || evento.request.method !== "GET") {
    return;
  }

  // Navegações de página: Network First -> Fallback para página offline
  if (evento.request.mode === "navigate") {
    evento.respondWith(
      fetch(evento.request).catch(async () => {
        const cache = await caches.open(CACHE_OFFLINE);
        const respostaOffline = await cache.match(OFFLINE_URL);
        return respostaOffline || new Response("Sem conexão com a internet.", { status: 503, headers: { "Content-Type": "text/plain" } });
      })
    );
    return;
  }

  // Recursos estáticos do Next.js e ícones: Cache First / Stale-While-Revalidate seguro
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")) {
    evento.respondWith(
      caches.open(CACHE_ESTATICO).then(async (cache) => {
        const respostaEmCache = await cache.match(evento.request);
        if (respostaEmCache) return respostaEmCache;

        try {
          const respostaRede = await fetch(evento.request);
          if (respostaRede.status === 200) {
            cache.put(evento.request, respostaRede.clone());
          }
          return respostaRede;
        } catch {
          return respostaEmCache || new Response("", { status: 404 });
        }
      })
    );
  }
});

// Evento PUSH: Exibe notificação recebida em segundo plano
self.addEventListener("push", (evento) => {
  let dados = {
    title: "Handebol Hub - Lembrete",
    body: "Você tem um lembrete pendente no aplicativo.",
    url: "/meu-bem-estar",
  };

  if (evento.data) {
    try {
      const payload = evento.data.json();
      dados = Object.assign(dados, payload);
    } catch {
      dados.body = evento.data.text();
    }
  }

  const opcoes = {
    body: dados.body,
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    data: { url: dados.url || "/meu-bem-estar" },
    vibrate: [200, 100, 200],
    tag: dados.tag || "lembrete-bem-estar",
    renotify: true,
  };

  evento.waitUntil(self.registration.showNotification(dados.title, opcoes));
});

// Evento NOTIFICATIONCLICK: Redireciona o atleta diretamente para a tela do questionário
self.addEventListener("notificationclick", (evento) => {
  evento.notification.close();
  const urlAlvo = evento.notification.data?.url || "/meu-bem-estar";

  evento.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(urlAlvo) && "focus" in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlAlvo);
      }
    })
  );
});
