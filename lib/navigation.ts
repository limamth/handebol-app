import { Home, Users, CalendarDays, Dumbbell, PenTool, Activity, ClipboardList, BarChart3, UserCog, Weight, HeartPulse, Stethoscope, Target, Database, Settings, type LucideIcon } from "lucide-react";
import type { Modulo } from "./permissions";

export interface ItemNav { rotulo: string; href: string; icone: LucideIcon; modulo?: Modulo; }
export interface GrupoNav { titulo?: string; itens: ItemNav[]; }

export const NAVEGACAO: GrupoNav[] = [
  { itens: [
    { rotulo: "Início", href: "/dashboard", icone: Home },
    { rotulo: "Equipas", href: "/equipas", icone: Users, modulo: "equipas" },
  ]},
  { titulo: "Dia a dia", itens: [
    { rotulo: "Calendário", href: "/calendario", icone: CalendarDays, modulo: "calendario" },
    { rotulo: "Musculação", href: "/musculacao", icone: Weight, modulo: "musculacao" },
    { rotulo: "Shoot-out", href: "/shootout", icone: Target, modulo: "shootout" },
    { rotulo: "Meu bem-estar", href: "/meu-bem-estar", icone: HeartPulse, modulo: "bemestar" },
    { rotulo: "Monitorização", href: "/monitorizacao", icone: Activity, modulo: "monitorizacao" },
    { rotulo: "Dores", href: "/dores", icone: Stethoscope, modulo: "dores" },
    { rotulo: "Avaliações", href: "/avaliacoes", icone: ClipboardList, modulo: "avaliacoes" },
    { rotulo: "Estatísticas", href: "/estatisticas", icone: BarChart3, modulo: "estatisticas" },
    { rotulo: "Utilizadores", href: "/utilizadores", icone: UserCog, modulo: "utilizadores" },
    { rotulo: "Backup", href: "/backup", icone: Database, modulo: "backup" },
    { rotulo: "Configurações", href: "/configuracoes", icone: Settings, modulo: "configuracoes" },
  ]},
  { titulo: "Biblioteca", itens: [
    { rotulo: "Exercícios", href: "/biblioteca", icone: Dumbbell, modulo: "biblioteca" },
    { rotulo: "Prancheta", href: "/prancheta", icone: PenTool, modulo: "prancheta" },
  ]},
];
