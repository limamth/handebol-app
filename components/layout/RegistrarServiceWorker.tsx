"use client";

import { useEffect } from "react";

// Só em produção: em desenvolvimento o service worker atrapalharia a atualização automática das telas.
export function RegistrarServiceWorker() {
  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);
  return null;
}
