"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, Check, X } from "lucide-react";
import { VAPID_PUBLIC_KEY } from "@/lib/webpush-constants";

function urlB64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function GerenciadorPermissaoPush() {
  const [suportado, setSuportado] = useState(false);
  const [permissao, setPermissao] = useState<NotificationPermission>("default");
  const [carregando, setCarregando] = useState(false);
  const [dispensado, setDispensado] = useState(false);
  const [sucesso, setSucesso] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator && "Notification" in window) {
      setSuportado(true);
      setPermissao(Notification.permission);

      // Verifica se o usuário já dispensou este aviso nesta sessão
      const foiDispensado = sessionStorage.getItem("handebol_push_dispensado");
      if (foiDispensado) setDispensado(true);

      // Se já está autorizado, garante que a subscrição esteja registrada
      if (Notification.permission === "granted") {
        inscreverDispositivoSilencioso();
      }
    }
  }, []);

  async function inscreverDispositivoSilencioso() {
    try {
      const reg = await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();

      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlB64ToUint8Array(VAPID_PUBLIC_KEY),
        });
      }

      const chaveJson = sub.toJSON();
      if (chaveJson.endpoint && chaveJson.keys) {
        await fetch("/api/notificacoes/inscrever", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            endpoint: sub.endpoint,
            keys: chaveJson.keys,
          }),
        });
      }
    } catch {
      // Falha silenciosa em background
    }
  }

  async function solicitarPermissao() {
    if (!suportado) return;
    setCarregando(true);

    try {
      const perm = await Notification.requestPermission();
      setPermissao(perm);

      if (perm === "granted") {
        await inscreverDispositivoSilencioso();
        setSucesso(true);
        setTimeout(() => setDispensado(true), 3500);
      }
    } catch {
      // Ignora erro
    } finally {
      setCarregando(false);
    }
  }

  function dispensar() {
    setDispensado(true);
    sessionStorage.setItem("handebol_push_dispensado", "1");
  }

  // Não exibe se não for suportado, se já tiver concedido ou se foi dispensado
  if (!suportado || permissao === "granted" || permissao === "denied" || dispensado) {
    return null;
  }

  return (
    <div
      role="region"
      aria-label="Aviso de notificações"
      className="relative flex items-center justify-between gap-3 rounded-lg border border-bola-200 bg-bola-50/90 px-4 py-3 text-xs shadow-sm transition"
    >
      <div className="flex items-center gap-2.5">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-bola-500 text-white">
          <Bell className="h-4 w-4" />
        </span>
        <div>
          <p className="font-bold text-tinta">Ativar Lembretes no Celular</p>
          <p className="text-suave">
            Receba notificações automáticas no seu celular nos dias de treino quando houver questionário de bem-estar pendente.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          disabled={carregando}
          onClick={solicitarPermissao}
          className="rounded bg-bola-500 px-3 py-1.5 font-bold text-white shadow transition hover:opacity-90 disabled:opacity-50"
        >
          {carregando ? "Ativando..." : sucesso ? <Check className="h-4 w-4" /> : "Ativar agora"}
        </button>
        <button
          type="button"
          onClick={dispensar}
          title="Dispensar aviso"
          className="rounded p-1 text-suave hover:bg-bola-100 hover:text-tinta"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
