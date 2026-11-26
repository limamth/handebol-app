import type { FormaTelestracao } from "./video-tagging";

export type TemaApresentacao = "escuro" | "quadra" | "claro";
export type TipoSlide = "capa" | "texto" | "video_corte" | "imagem";
export type FonteSlide = "padrao" | "moderna" | "classica" | "mono" | "impacto";
export type TamanhoTituloSlide = "sm" | "md" | "lg" | "xl";
export type TamanhoTextoSlide = "sm" | "md" | "lg";
export type AlinhamentoSlide = "left" | "center" | "right";

export interface SlideEstilo {
  corFundo?: string | null;
  gradienteFundo?: string | null;
  corTitulo?: string | null;
  corTexto?: string | null;
  corDestaque?: string | null;
  fonte?: FonteSlide;
  tamanhoTitulo?: TamanhoTituloSlide;
  tamanhoTexto?: TamanhoTextoSlide;
  alinhamento?: AlinhamentoSlide;
}

export interface Apresentacao {
  id: string;
  clube_id: string;
  titulo: string;
  descricao?: string | null;
  tema: TemaApresentacao;
  compartilhado_atletas: boolean;
  google_slides_url?: string | null;
  pdf_storage_path?: string | null;
  pdf_nome?: string | null;
  pdf_tamanho_bytes?: number | null;
  criado_em: string;
  atualizado_em: string;
}

/**
 * Converte um link de compartilhamento do Google Slides ou Google Drive
 * em URL própria para exibição em iframe dentro do app.
 */
export function converterUrlDriveParaEmbed(urlRaw?: string | null): string | null {
  const url = (urlRaw ?? "").trim();
  if (!url) return null;

  // Já é embed ou preview
  if (url.includes("/embed") || url.includes("/preview")) {
    return url;
  }

  // Google Slides: https://docs.google.com/presentation/d/<ID>/edit...
  const matchSlides = url.match(/docs\.google\.com\/presentation\/d\/([a-zA-Z0-9_-]+)/);
  if (matchSlides?.[1]) {
    return `https://docs.google.com/presentation/d/${matchSlides[1]}/embed?start=false&loop=false&delayms=3000`;
  }

  // Google Drive file: https://drive.google.com/file/d/<ID>/view...
  const matchDriveFile = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (matchDriveFile?.[1]) {
    return `https://drive.google.com/file/d/${matchDriveFile[1]}/preview`;
  }

  // Google Drive open?id=<ID>
  const matchOpenId = url.match(/drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/);
  if (matchOpenId?.[1]) {
    return `https://drive.google.com/file/d/${matchOpenId[1]}/preview`;
  }

  return url;
}

export interface ApresentacaoSlide {
  id: string;
  clube_id: string;
  apresentacao_id: string;
  ordem: number;
  tipo: TipoSlide;
  titulo?: string | null;
  subtitulo?: string | null;
  conteudo?: string | null;
  imagem_url?: string | null;
  projeto_video_id?: string | null;
  tag_video_id?: string | null;
  video_tempo_inicio?: number | null;
  video_tempo_fim?: number | null;
  estilo?: SlideEstilo | null;
  criado_em: string;
  // Dados enriquecidos para exibição do vídeo e telestração
  projeto_video?: {
    id: string;
    titulo: string;
    tipo_fonte: "local" | "youtube";
    url_video?: string | null;
    nome_arquivo?: string | null;
  } | null;
  tag_video?: {
    id: string;
    categoria: string;
    cor: string;
    tempo_inicio: number;
    tempo_fim: number;
    atleta_nome?: string | null;
    observacao?: string | null;
    desenho_tempo?: number | null;
    desenho_dados?: FormaTelestracao[] | null;
  } | null;
}

export const ESTILOS_TEMA: Record<
  TemaApresentacao,
  { rotulo: string; bg: string; texto: string; subtexto: string; destaque: string; borda: string }
> = {
  escuro: {
    rotulo: "Escuro (Cinema)",
    bg: "bg-slate-950",
    texto: "text-white",
    subtexto: "text-slate-300",
    destaque: "text-bola-400",
    borda: "border-slate-800",
  },
  quadra: {
    rotulo: "Quadra (Brasil / Azul)",
    bg: "bg-quadra-900",
    texto: "text-white",
    subtexto: "text-quadra-100",
    destaque: "text-bola-400",
    borda: "border-quadra-700",
  },
  claro: {
    rotulo: "Claro (Limpo)",
    bg: "bg-white",
    texto: "text-tinta",
    subtexto: "text-suave",
    destaque: "text-bola-600",
    borda: "border-linha",
  },
};

export const FONTES_SLIDE: Record<FonteSlide, { rotulo: string; css: string }> = {
  padrao: { rotulo: "Padrão (Sistema)", css: "inherit" },
  moderna: { rotulo: "Moderna (Sans)", css: "'Inter', system-ui, -apple-system, sans-serif" },
  classica: { rotulo: "Clássica (Serif)", css: "Georgia, 'Times New Roman', serif" },
  mono: { rotulo: "Técnica (Mono)", css: "ui-monospace, SFMono-Regular, Menlo, monospace" },
  impacto: { rotulo: "Impacto (Placar)", css: "'Arial Black', Impact, system-ui, sans-serif" },
};

export const GRADIENTES_FUNDO: { id: string; rotulo: string; css: string }[] = [
  { id: "none", rotulo: "Cor sólida", css: "" },
  { id: "azul_quadra", rotulo: "Azul Quadra", css: "linear-gradient(135deg, #0b2545 0%, #134074 55%, #1d5ca8 100%)" },
  { id: "escuro_cinema", rotulo: "Cinema Escuro", css: "linear-gradient(135deg, #020617 0%, #0f172a 60%, #1e293b 100%)" },
  { id: "energia_bola", rotulo: "Energia Laranja", css: "linear-gradient(135deg, #1e1b4b 0%, #7c2d12 65%, #c2410c 100%)" },
  { id: "esmeralda", rotulo: "Verde Tático", css: "linear-gradient(135deg, #022c22 0%, #064e3b 60%, #047857 100%)" },
  { id: "claro_suave", rotulo: "Claro Suave", css: "linear-gradient(135deg, #ffffff 0%, #f1f5f9 100%)" },
];
