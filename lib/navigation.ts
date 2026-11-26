import { Home, Users, CalendarDays, Dumbbell, PenTool, Activity, ClipboardList, BarChart3, UserCog, Weight, HeartPulse, Stethoscope, Target, Radar, Database, Settings, Contact2, Radio, Film, Presentation, type LucideIcon } from "lucide-react";
import type { Modulo } from "./permissions";

export interface ItemNav { rotulo: string; href: string; icone: LucideIcon; modulo?: Modulo; }
export interface GrupoNav { titulo?: string; itens: ItemNav[]; }

export const NAVEGACAO: GrupoNav[] = [
  { itens: [
    { rotulo: "Início", href: "/dashboard", icone: Home },
    { rotulo: "Equipes", href: "/equipas", icone: Users, modulo: "equipas" },
    { rotulo: "Dados", href: "/dados", icone: Contact2, modulo: "dados" },
  ]},
  { itens: [
    { rotulo: "Avaliações", href: "/avaliacoes", icone: ClipboardList, modulo: "avaliacoes" },
    { rotulo: "Shoot-out", href: "/shootout", icone: Target, modulo: "shootout" },
    { rotulo: "Calendário", href: "/calendario", icone: CalendarDays, modulo: "calendario" },
    { rotulo: "Exercícios", href: "/biblioteca", icone: Dumbbell, modulo: "biblioteca" },
    { rotulo: "Monitorização", href: "/monitorizacao", icone: Activity, modulo: "monitorizacao" },
    { rotulo: "Dores", href: "/dores", icone: Stethoscope, modulo: "dores" },
    { rotulo: "Meu bem-estar", href: "/meu-bem-estar", icone: HeartPulse, modulo: "bemestar" },
    { rotulo: "Musculação", href: "/musculacao", icone: Weight, modulo: "musculacao" },
    { rotulo: "Estatísticas", href: "/estatisticas", icone: BarChart3, modulo: "estatisticas" },
    { rotulo: "Prancheta", href: "/prancheta", icone: PenTool, modulo: "prancheta" },
  ]},
  { itens: [
    { rotulo: "Scout", href: "/scout", icone: Radar, modulo: "scout" },
    { rotulo: "Análise ao vivo", href: "/analise-jogo", icone: Radio, modulo: "analise_jogo" },
    { rotulo: "Vídeo & Tagging", href: "/video", icone: Film, modulo: "video" },
    { rotulo: "Apresentações", href: "/apresentacoes", icone: Presentation, modulo: "apresentacoes" },
  ]},
  { itens: [
    { rotulo: "Utilizadores", href: "/utilizadores", icone: UserCog, modulo: "utilizadores" },
    { rotulo: "Backup", href: "/backup", icone: Database, modulo: "backup" },
    { rotulo: "Configurações", href: "/configuracoes", icone: Settings, modulo: "configuracoes" },
  ]},
];
