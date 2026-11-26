"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, AlertCircle, WifiOff, CloudUpload } from "lucide-react";
import { adicionarFila, obterFila, ouvirFila, type DadosPresencasOffline } from "@/lib/offline";

interface AtletaPresenca {
  id: string;
  nome: string;
  camisa?: number | null;
}

interface Props {
  sessaoId: string;
  sessaoTitulo: string;
  atletas: AtletaPresenca[];
  statusIniciais: Record<string, string>;
  editar: boolean;
  rotuloPresenca: Record<string, string>;
}

export function FormularioPresencas({
  sessaoId,
  sessaoTitulo,
  atletas,
  statusIniciais,
  editar,
  rotuloPresenca,
}: Props) {
  const [status, setStatus] = useState<Record<string, string>>(statusIniciais);
  const [salvando, setSalvando] = useState(false);
  const [salvoOffline, setSalvoOffline] = useState(false);
  const [mensagem, setMensagem] = useState<{ tipo: "ok" | "erro" | "offline"; texto: string } | null>(null);

  useEffect(() => {
    // Verifica se já existe um rascunho offline para esta sessão
    const verificarRascunhoOffline = () => {
      const fila = obterFila();
      const pendente = fila.find((i) => i.tipo === "presencas" && (i.dados as DadosPresencasOffline).sessaoId === sessaoId);
      if (pendente) {
        const dados = pendente.dados as DadosPresencasOffline;
        const novoStatus = { ...statusIniciais };
        dados.presencas.forEach((p) => {
          novoStatus[p.atleta_id] = p.status;
        });
        dados.limpar.forEach((id) => {
          delete novoStatus[id];
        });
        setStatus(novoStatus);
        setSalvoOffline(true);
      }
    };

    verificarRascunhoOffline();
    return ouvirFila(verificarRascunhoOffline);
  }, [sessaoId, statusIniciais]);

  function alterarPresenca(atletaId: string, novoValor: string) {
    setStatus((prev) => ({
      ...prev,
      [atletaId]: novoValor,
    }));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMensagem(null);

    const presencas: { sessao_id: string; atleta_id: string; status: string }[] = [];
    const limpar: string[] = [];

    atletas.forEach((a) => {
      const val = status[a.id];
      if (val) {
        presencas.push({ sessao_id: sessaoId, atleta_id: a.id, status: val });
      } else {
        limpar.push(a.id);
      }
    });

    // Se estiver explicitamente offline:
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      adicionarFila({
        tipo: "presencas",
        descricao: `Presenças: ${sessaoTitulo}`,
        dados: { sessaoId, presencas, limpar },
      });
      setSalvoOffline(true);
      setMensagem({
        tipo: "offline",
        texto: "Você está sem internet. A chamada desta sessão foi salva no seu aparelho e será sincronizada assim que você reconectar!",
      });
      return;
    }

    setSalvando(true);

    try {
      const res = await fetch("/api/offline/sincronizar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itens: [
            {
              id: "presenca_direta_" + Date.now(),
              tipo: "presencas",
              descricao: `Presenças: ${sessaoTitulo}`,
              dados: { sessaoId, presencas, limpar },
            },
          ],
        }),
      });

      if (!res.ok) {
        const erroJson = await res.json().catch(() => ({}));
        throw new Error(erroJson.erro || "Falha ao enviar ao servidor.");
      }

      const dados = await res.json();
      if (dados.erros && dados.erros.length > 0) {
        setMensagem({ tipo: "erro", texto: dados.erros[0].mensagem });
      } else {
        setSalvoOffline(false);
        setMensagem({ tipo: "ok", texto: "Presenças salvas com sucesso!" });
      }
    } catch {
      // Salva na fila offline se houver queda de rede
      adicionarFila({
        tipo: "presencas",
        descricao: `Presenças: ${sessaoTitulo}`,
        dados: { sessaoId, presencas, limpar },
      });
      setSalvoOffline(true);
      setMensagem({
        tipo: "offline",
        texto: "A conexão falhou durante o envio. As presenças foram salvas com segurança no aparelho e serão sincronizadas automaticamente.",
      });
    } finally {
      setSalvando(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-linha bg-white p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-titulo text-xl font-semibold">Presença</h2>
        {salvoOffline && (
          <span className="flex items-center gap-1 rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
            <WifiOff className="h-3 w-3" /> Salvo no aparelho (offline)
          </span>
        )}
      </div>

      {mensagem && (
        <div
          role="alert"
          className={`mb-4 flex items-start gap-2 rounded-md p-3 text-sm ${
            mensagem.tipo === "ok"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : mensagem.tipo === "offline"
              ? "bg-blue-50 text-blue-900 border border-blue-200"
              : "bg-rose-50 text-rose-800 border border-rose-200"
          }`}
        >
          {mensagem.tipo === "ok" && <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />}
          {mensagem.tipo === "offline" && <CloudUpload className="h-5 w-5 shrink-0 text-blue-600" />}
          {mensagem.tipo === "erro" && <AlertCircle className="h-5 w-5 shrink-0 text-rose-600" />}
          <div className="flex-1">{mensagem.texto}</div>
        </div>
      )}

      {atletas.length === 0 ? (
        <p className="text-suave">Esta equipa ainda não tem atletas cadastrados.</p>
      ) : (
        <ul className="divide-y divide-linha">
          {atletas.map((a) => (
            <li key={a.id} className="flex items-center justify-between gap-3 py-2.5">
              <span className="font-medium text-tinta">
                {a.camisa ? `${a.camisa} · ` : ""}
                {a.nome}
              </span>
              <select
                value={status[a.id] ?? ""}
                onChange={(e) => alterarPresenca(a.id, e.target.value)}
                disabled={!editar || salvando}
                aria-label={`Presença de ${a.nome}`}
                className="rounded-md border border-linha bg-white px-2 py-1.5 text-sm disabled:bg-fundo"
              >
                <option value="">Não registrado</option>
                {Object.entries(rotuloPresenca).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </li>
          ))}
        </ul>
      )}

      {editar && atletas.length > 0 && (
        <button
          type="submit"
          disabled={salvando}
          className="mt-4 rounded-md bg-bola-500 px-5 py-2.5 font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
        >
          {salvando ? "Salvando..." : "Salvar presenças"}
        </button>
      )}
    </form>
  );
}
