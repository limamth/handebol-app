import webpush from "web-push";
import { VAPID_PUBLIC_KEY } from "./webpush-constants";

export { VAPID_PUBLIC_KEY };

export const VAPID_PRIVATE_KEY =
  process.env.VAPID_PRIVATE_KEY ||
  "mw90jbfoXylKMgMhQRvYotwBV6pd8S4ukpIP4-TDcWY";

export const VAPID_SUBJECT =
  process.env.VAPID_SUBJECT || "mailto:notificacoes@handebolapp.com.br";

// Configura o cliente web-push uma vez
try {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
} catch (e) {
  // Ignora se já estiver inicializado
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

export async function enviarNotificacaoPush(
  inscricao: {
    endpoint: string;
    p256dh: string;
    auth: string;
  },
  payload: PushPayload
): Promise<{ ok: boolean; status?: number; erro?: string }> {
  try {
    const subscription = {
      endpoint: inscricao.endpoint,
      keys: {
        p256dh: inscricao.p256dh,
        auth: inscricao.auth,
      },
    };

    await webpush.sendNotification(subscription, JSON.stringify(payload), {
      TTL: 60 * 60 * 24, // 24 horas de tempo de vida
      urgency: "high",
    });

    return { ok: true };
  } catch (err: any) {
    const statusCode = err?.statusCode || 500;
    return { ok: false, status: statusCode, erro: err?.message || "Erro ao enviar push" };
  }
}
