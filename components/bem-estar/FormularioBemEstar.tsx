"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, AlertCircle, WifiOff, CloudUpload } from "lucide-react";
import { adicionarFila, obterFila, ouvirFila, type DadosBemEstarOffline } from "@/lib/offline";

interface Pergunta {
  chave: string;
  pergunta: string;
  dica?: string;
  min: number;
  max: number;
}

interface Props {
  perguntas: Pergunta[];
  respostasIniciais: Record<string, number>;
  jaRespondeu: boolean;
  dia: string;
}

export function FormularioBemEstar({ perguntas, respostasIniciais, jaRespondeu, dia }: Props) {
  const [respostas, setRespostas] = useState<Record<string, number>>(respostasIniciais);
  const [salvando, setSalvando] = useState(false);
  const [salvoOffline, setSalvoOffline] = useState(false);
  const [mensagem, setMensagem] = useState<{ tipo: "ok" | "erro" | "offline"; texto: string } | null>(null);

  useEffect(() => {
    // Verifica se já existe um rascunho offline para o dia de hoje
    const verificarRascunhoOffline = () => {
      const fila = obterFila();
      const pendente = fila.find((i) => i.tipo === "bem_estar" && (i.dados as DadosBemEstarOffline).dia === dia);
      if (pendente) {
        setRespostas((pendente.dados as DadosBemEstarOffline).respostas);
        setSalvoOffline(true);
      }
    };

    verificarRascunhoOffline();
    return ouvirFila(verificarRascunhoOffline);
  }, [dia]);

  function alterarNota(chave: string, valor: number) {
    setRespostas((prev) => ({ ...prev, [chave]: valor }));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMensagem(null);

    // Validação
    for (const p of perguntas) {
      if (!respostas[p.chave]) {
        setMensagem({ tipo: "erro", texto: `Por favor, avalie a pergunta: "${p.pergunta}".` });
        return;
      }
    }

    // Se estiver explicitamente offline:
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      adicionarFila({
        tipo: "bem_estar",
        descricao: `Meu bem-estar (${dia})`,
        dados: { dia, respostas },
      });
      setSalvoOffline(true);
      setMensagem({
        tipo: "offline",
        texto: "Você está sem internet. Suas respostas de hoje foram salvas no seu aparelho e serão sincronizadas assim que a conexão voltar!",
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
              id: "envio_direto_" + Date.now(),
              tipo: "bem_estar",
              descricao: `Meu bem-estar (${dia})`,
              dados: { dia, respostas },
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
        setMensagem({ tipo: "ok", texto: "Bem-estar de hoje registrado com sucesso. Obrigado!" });
      }
    } catch {
      // Se a conexão oscilou ou deu erro de rede, salva offline
      adicionarFila({
        tipo: "bem_estar",
        descricao: `Meu bem-estar (${dia})`,
        dados: { dia, respostas },
      });
      setSalvoOffline(true);
      setMensagem({
        tipo: "offline",
        texto: "A conexão falhou durante o envio. Suas respostas foram salvas com segurança no aparelho e serão enviadas automaticamente.",
      });
    } finally {
      setSalvando(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 rounded-lg border border-linha bg-white p-5">
      {salvoOffline && (
        <div className="flex items-center gap-2 rounded-md bg-amber-50 p-3 text-xs text-amber-800 border border-amber-200">
          <WifiOff className="h-4 w-4 shrink-0 text-amber-600" />
          <span>
            <strong>Salvo localmente no aparelho:</strong> Suas respostas estão guardadas e aguardando conexão para envio.
          </span>
        </div>
      )}

      {mensagem && (
        <div
          role="alert"
          className={`flex items-start gap-2 rounded-md p-3 text-sm ${
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

      {perguntas.map((p) => (
        <fieldset key={p.chave} className="space-y-1">
          <legend className="font-medium text-tinta">{p.pergunta}</legend>
          {p.dica && <p className="text-xs text-suave">{p.dica}</p>}
          <div className="flex gap-2 pt-1">
            {[1, 2, 3, 4, 5].map((n) => {
              const selecionado = respostas[p.chave] === n;
              return (
                <label key={n} className="flex-1">
                  <input
                    type="radio"
                    name={`r_${p.chave}`}
                    value={n}
                    required
                    checked={selecionado}
                    onChange={() => alterarNota(p.chave, n)}
                    className="peer sr-only"
                  />
                  <span
                    className={`block cursor-pointer rounded-md border py-3 text-center font-medium transition ${
                      selecionado
                        ? "border-quadra-600 bg-quadra-600 text-white shadow-sm"
                        : "border-linha bg-white text-tinta hover:bg-fundo"
                    }`}
                  >
                    {n}
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>
      ))}

      <button
        type="submit"
        disabled={salvando}
        className="w-full rounded-md bg-bola-500 py-3 font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
      >
        {salvando
          ? "Salvando..."
          : jaRespondeu || salvoOffline
          ? "Atualizar resposta de hoje"
          : "Salvar bem-estar de hoje"}
      </button>
    </form>
  );
}
