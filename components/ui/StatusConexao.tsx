"use client";

import { useEffect, useState } from "react";
import { WifiOff, RefreshCw, CheckCircle2, AlertCircle } from "lucide-react";
import { estaOnline, ouvirConexao, ouvirFila, obterFila, sincronizarFila, type ItemFilaOffline } from "@/lib/offline";

export function StatusConexao() {
  const [online, setOnline] = useState<boolean>(true);
  const [fila, setFila] = useState<ItemFilaOffline[]>([]);
  const [sincronizando, setSincronizando] = useState<boolean>(false);
  const [notificacao, setNotificacao] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);

  useEffect(() => {
    setOnline(estaOnline());
    setFila(obterFila());

    const desinscreverConexao = ouvirConexao((conectado) => {
      setOnline(conectado);
      if (conectado) {
        // Quando a conexão volta, tenta sincronizar automaticamente
        realizarSincronizacao();
      }
    });

    const desinscreverFila = ouvirFila((itens) => {
      setFila(itens);
    });

    return () => {
      desinscreverConexao();
      desinscreverFila();
    };
  }, []);

  async function realizarSincronizacao() {
    if (sincronizando) return;
    setSincronizando(true);
    setNotificacao(null);

    const resultado = await sincronizarFila();
    setSincronizando(false);

    if (resultado.sucesso > 0) {
      setNotificacao({
        tipo: "ok",
        texto: `${resultado.sucesso} registro(s) sincronizado(s) com sucesso com o servidor!`,
      });
      setTimeout(() => setNotificacao(null), 6000);
    } else if (resultado.falhas > 0 && resultado.mensagens.length > 0) {
      setNotificacao({
        tipo: "erro",
        texto: resultado.mensagens[0] || "Houve uma falha ao enviar registros pendentes.",
      });
      setTimeout(() => setNotificacao(null), 8000);
    }
  }

  // Nada pendente e online -> não ocupa espaço na interface
  if (online && fila.length === 0 && !notificacao && !sincronizando) {
    return null;
  }

  return (
    <aside aria-label="Status de conexão e sincronização offline" className="w-full text-sm">
      {!online && (
        <div className="flex items-center justify-between gap-3 bg-amber-500 px-4 py-2 text-white">
          <div className="flex items-center gap-2">
            <WifiOff className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>
              <strong>Modo Offline:</strong> Você está sem internet. Suas ações (bem-estar, presenças) serão salvas no aparelho e enviadas quando você reconectar.
            </span>
          </div>
          {fila.length > 0 && (
            <span className="shrink-0 rounded bg-amber-700/60 px-2 py-0.5 text-xs font-semibold">
              {fila.length} pendente(s)
            </span>
          )}
        </div>
      )}

      {online && fila.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 bg-quadra-800 px-4 py-2 text-white">
          <div className="flex items-center gap-2">
            <RefreshCw className={`h-4 w-4 shrink-0 ${sincronizando ? "animate-spin" : ""}`} aria-hidden="true" />
            <span>
              Você tem <strong>{fila.length} registro(s) salvos no aparelho</strong> aguardando sincronização com o banco de dados.
            </span>
          </div>
          <button
            onClick={realizarSincronizacao}
            disabled={sincronizando}
            className="rounded bg-bola-500 px-3 py-1 text-xs font-bold text-white transition hover:opacity-90 disabled:opacity-50"
          >
            {sincronizando ? "Sincronizando..." : "Sincronizar agora"}
          </button>
        </div>
      )}

      {notificacao && (
        <div
          role="status"
          className={`flex items-center justify-between gap-2 px-4 py-2 text-xs font-medium ${
            notificacao.tipo === "ok" ? "bg-emerald-600 text-white" : "bg-rose-600 text-white"
          }`}
        >
          <div className="flex items-center gap-2">
            {notificacao.tipo === "ok" ? (
              <CheckCircle2 className="h-4 w-4 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0" />
            )}
            <span>{notificacao.texto}</span>
          </div>
          <button
            onClick={() => setNotificacao(null)}
            className="text-xs underline hover:opacity-80"
          >
            Fechar
          </button>
        </div>
      )}
    </aside>
  );
}
