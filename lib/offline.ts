export type TipoItemOffline = "bem_estar" | "presencas";

export interface DadosBemEstarOffline {
  dia: string;
  respostas: Record<string, number>;
}

export interface DadosPresencasOffline {
  sessaoId: string;
  presencas: { sessao_id: string; atleta_id: string; status: string }[];
  limpar: string[];
}

export interface ItemFilaOffline {
  id: string;
  tipo: TipoItemOffline;
  criadoEm: string;
  descricao: string;
  dados: DadosBemEstarOffline | DadosPresencasOffline;
}

const CHAVE_STORAGE = "handebol_hub_fila_offline";
const EVENTO_FILA = "handebol_hub_fila_alterada";
const EVENTO_SINCRONIZACAO = "handebol_hub_sincronizacao";

export function obterFila(): ItemFilaOffline[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CHAVE_STORAGE);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function salvarFila(itens: ItemFilaOffline[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CHAVE_STORAGE, JSON.stringify(itens));
    window.dispatchEvent(new CustomEvent(EVENTO_FILA, { detail: itens }));
  } catch (e) {
    console.error("Falha ao salvar fila offline:", e);
  }
}

export function adicionarFila(item: Omit<ItemFilaOffline, "id" | "criadoEm">): ItemFilaOffline {
  const novo: ItemFilaOffline = {
    ...item,
    id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `offline_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    criadoEm: new Date().toISOString(),
  };
  const fila = obterFila();
  // Se for do mesmo tipo e mesmo contexto (ex: mesmo dia de bem-estar ou mesma sessão de presenças), substitui o item pendente anterior
  const filtrada = fila.filter((antigo) => {
    if (antigo.tipo !== novo.tipo) return true;
    if (novo.tipo === "bem_estar") {
      return (antigo.dados as DadosBemEstarOffline).dia !== (novo.dados as DadosBemEstarOffline).dia;
    }
    if (novo.tipo === "presencas") {
      return (antigo.dados as DadosPresencasOffline).sessaoId !== (novo.dados as DadosPresencasOffline).sessaoId;
    }
    return true;
  });
  salvarFila([...filtrada, novo]);
  return novo;
}

export function removerItemFila(id: string): void {
  const fila = obterFila();
  salvarFila(fila.filter((i) => i.id !== id));
}

export function limparFila(): void {
  salvarFila([]);
}

export function ouvirFila(callback: (itens: ItemFilaOffline[]) => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = () => callback(obterFila());
  window.addEventListener(EVENTO_FILA, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(EVENTO_FILA, handler);
    window.removeEventListener("storage", handler);
  };
}

export function estaOnline(): boolean {
  if (typeof window === "undefined") return true;
  return navigator.onLine;
}

export function ouvirConexao(callback: (online: boolean) => void): () => void {
  if (typeof window === "undefined") return () => {};
  const aoMudar = () => callback(navigator.onLine);
  window.addEventListener("online", aoMudar);
  window.addEventListener("offline", aoMudar);
  return () => {
    window.removeEventListener("online", aoMudar);
    window.removeEventListener("offline", aoMudar);
  };
}

export interface ResultadoSincronizacao {
  total: number;
  sucesso: number;
  falhas: number;
  mensagens: string[];
}

export async function sincronizarFila(): Promise<ResultadoSincronizacao> {
  if (typeof window === "undefined") return { total: 0, sucesso: 0, falhas: 0, mensagens: [] };
  if (!navigator.onLine) {
    return { total: 0, sucesso: 0, falhas: 0, mensagens: ["Sem conexão com a internet no momento."] };
  }

  const fila = obterFila();
  if (fila.length === 0) {
    return { total: 0, sucesso: 0, falhas: 0, mensagens: [] };
  }

  try {
    const res = await fetch("/api/offline/sincronizar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itens: fila }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.erro || "Falha na sincronização.");
    }

    const dados = await res.json();
    const sincronizados: string[] = dados.sincronizados ?? [];
    const erros: { id: string; mensagem: string }[] = dados.erros ?? [];

    // Remove os itens que foram processados com sucesso
    const filaAtual = obterFila();
    const idsRemover = new Set(sincronizados);
    // Também remove itens com erro definitivo (ex.: dados inválidos) para não travar a fila
    erros.forEach((e) => {
      if (e.mensagem.includes("inválid") || e.mensagem.includes("não permitid") || e.mensagem.includes("expirad")) {
        idsRemover.add(e.id);
      }
    });

    const restante = filaAtual.filter((i) => !idsRemover.has(i.id));
    salvarFila(restante);

    const mensagens = [
      ...sincronizados.map(() => "Item sincronizado com sucesso."),
      ...erros.map((e) => `Erro: ${e.mensagem}`),
    ];

    window.dispatchEvent(new CustomEvent(EVENTO_SINCRONIZACAO, {
      detail: { sucesso: sincronizados.length, falhas: erros.length }
    }));

    return {
      total: fila.length,
      sucesso: sincronizados.length,
      falhas: erros.length,
      mensagens,
    };
  } catch (erro: any) {
    return {
      total: fila.length,
      sucesso: 0,
      falhas: fila.length,
      mensagens: [erro.message || "Erro de conexão ao sincronizar."],
    };
  }
}
