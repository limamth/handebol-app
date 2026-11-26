export interface BotaoTagging {
  id: string;
  rotulo: string;
  cor: string;
  preRoll: number; // segundos antes do clique
  postRoll: number; // segundos depois do clique
  atalho: string; // tecla rápida (1-9)
}

export interface ProjetoVideo {
  id: string;
  clube_id: string;
  titulo: string;
  tipo_fonte: "local" | "youtube";
  url_video?: string | null;
  nome_arquivo?: string | null;
  duracao_segundos?: number | null;
  partida_analise_id?: string | null;
  botoes_config?: BotaoTagging[] | null;
  compartilhado_atletas?: boolean;
  criado_em: string;
}

export type TipoFormaTelestracao = "seta" | "circulo" | "linha" | "texto";

export interface FormaTelestracao {
  id: string;
  tipo: TipoFormaTelestracao;
  cor: string;
  x1: number; // 0..100 (%)
  y1: number; // 0..100 (%)
  x2?: number; // 0..100 (%)
  y2?: number; // 0..100 (%)
  pontos?: { x: number; y: number }[]; // para linha livre
  texto?: string;
}

export interface TagVideo {
  id: string;
  clube_id: string;
  projeto_id: string;
  categoria: string;
  cor: string;
  tempo_inicio: number;
  tempo_fim: number;
  atleta_nome?: string | null;
  observacao?: string | null;
  desenho_tempo?: number | null;
  desenho_dados?: FormaTelestracao[] | null;
  criado_em: string;
}

export interface PlaylistVideo {
  id: string;
  clube_id: string;
  projeto_id: string;
  nome: string;
  tag_ids: string[];
  criado_em: string;
}

export const BOTOES_TAGGING_PADRAO: BotaoTagging[] = [
  { id: "ataque", rotulo: "Ataque Posicional", cor: "#0284c7", preRoll: 5, postRoll: 3, atalho: "1" },
  { id: "gol", rotulo: "Gol", cor: "#16a34a", preRoll: 5, postRoll: 2, atalho: "2" },
  { id: "defesa", rotulo: "Defesa", cor: "#1e3a8a", preRoll: 5, postRoll: 3, atalho: "3" },
  { id: "contra_ataque", rotulo: "Contra-Ataque", cor: "#d97706", preRoll: 4, postRoll: 4, atalho: "4" },
  { id: "turnover", rotulo: "Turnover / Erro", cor: "#9333ea", preRoll: 4, postRoll: 2, atalho: "5" },
  { id: "goleiro", rotulo: "Defesa Goleiro", cor: "#0d9488", preRoll: 4, postRoll: 3, atalho: "6" },
  { id: "6m", rotulo: "Tiro de 6m", cor: "#e11d48", preRoll: 4, postRoll: 3, atalho: "7" },
  { id: "shootout", rotulo: "Shoot-out", cor: "#ea580c", preRoll: 3, postRoll: 4, atalho: "8" },
  { id: "destaque", rotulo: "Observação", cor: "#475569", preRoll: 5, postRoll: 5, atalho: "9" },
];

export function extrairYoutubeId(url: string): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;

  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/live\/)([a-zA-Z0-9_-]{11})/,
    /[?&]v=([a-zA-Z0-9_-]{11})/,
  ];
  for (const p of patterns) {
    const m = trimmed.match(p);
    if (m?.[1]) return m[1];
  }
  return null;
}

export function formatarTempo(segundos: number, comDecimais = false): string {
  if (!Number.isFinite(segundos) || segundos < 0) return "00:00";
  const hrs = Math.floor(segundos / 3600);
  const mins = Math.floor((segundos % 3600) / 60);
  const secs = Math.floor(segundos % 60);
  const dec = Math.floor((segundos % 1) * 10);

  const base =
    hrs > 0
      ? `${String(hrs).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`
      : `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;

  return comDecimais ? `${base}.${dec}` : base;
}

export function parsearTempo(texto: string): number | null {
  const clean = texto.trim();
  if (!clean) return null;
  if (/^\d+(\.\d+)?$/.test(clean)) return Number(clean);

  const parts = clean.split(":").map(Number);
  if (parts.some((n) => !Number.isFinite(n))) return null;
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return null;
}
