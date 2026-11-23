import Link from "next/link";
import { CalendarDays, HeartPulse, PenTool, Target, Weight } from "lucide-react";
import { podeVer, type Modulo } from "@/lib/permissions";
import { FUSO } from "@/lib/datas";
import { hojeChave } from "@/lib/periodo";
import { dataBr } from "@/lib/fases";
import { ROTULO_TIPO } from "@/components/calendario/tipos";
import { DicaInstalar } from "@/components/ui/DicaInstalar";
import type { Perfil } from "@/lib/sessao";
import { carregarDesativados } from "@/lib/configuracoes";

const ATALHOS: { href: string; titulo: string; desc: string; icone: any; modulo: Modulo }[] = [
  { href: "/calendario", titulo: "Calendário", desc: "Treinos e jogos", icone: CalendarDays, modulo: "calendario" },
  { href: "/meu-bem-estar", titulo: "Meu bem-estar", desc: "Como você está hoje", icone: HeartPulse, modulo: "bemestar" },
  { href: "/musculacao", titulo: "Musculação", desc: "Seus treinos e retorno", icone: Weight, modulo: "musculacao" },
  { href: "/shootout", titulo: "Shoot-out", desc: "Batidas e ranking", icone: Target, modulo: "shootout" },
  { href: "/prancheta", titulo: "Prancheta", desc: "Jogadas e esquemas", icone: PenTool, modulo: "prancheta" },
];

const quando = (iso: string) =>
  new Intl.DateTimeFormat("pt-BR", { timeZone: FUSO, weekday: "short", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));

// Página inicial do atleta: boas-vindas, situação de hoje, atalhos, como o app funciona e instalação
export async function InicioAtleta({ supabase, perfil }: { supabase: any; perfil: Perfil }) {
  const desativados = await carregarDesativados();
  const off = (m: string) => desativados.includes(m);
  const hoje = hojeChave();
  const primeiroNome = perfil.nome.split(" ")[0];

  const [{ data: fases }, { data: minhas }, { data: respostaHoje }, { data: proximas }] = await Promise.all([
    supabase.from("fases_treinamento").select("id, nome, inicio, fim").gte("fim", hoje).order("inicio"),
    supabase.from("fase_convocados").select("fase_id").eq("atleta_id", perfil.id),
    supabase.from("respostas_questionario").select("id").eq("atleta_id", perfil.id).eq("dia", hoje).limit(1),
    supabase.from("sessoes").select("id, titulo, tipo, inicio, equipas(nome)").gte("inicio", new Date().toISOString()).order("inicio").limit(3),
  ]);

  const convocadoEm = new Set(((minhas ?? []) as any[]).map((c) => c.fase_id as string));
  const ativas = ((fases ?? []) as any[]).filter((f) => f.inicio <= hoje);
  const atual = ativas.find((f) => convocadoEm.has(f.id));
  const proximaFase = ((fases ?? []) as any[]).find((f) => f.inicio > hoje && convocadoEm.has(f.id));
  const respondeu = ((respostaHoje ?? []) as any[]).length > 0;
  const atalhos = ATALHOS.filter((a) => podeVer(perfil.papel, a.modulo) && !off(a.modulo));

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <h1 className="font-titulo text-3xl font-bold">Olá, {primeiroNome}!</h1>
        <p className="text-suave">Bem-vindo ao Handebol Hub, o app criado pela comissão técnica para acompanhar as fases de treinamento e o bem-estar dos atletas. Suas respostas ajudam a comissão a ajustar o trabalho e a cuidar de você.</p>
      </header>

      {!off("bemestar") && (
<section aria-label="Situação de hoje" className="rounded-lg border border-linha bg-white p-5">
        <h2 className="mb-2 font-titulo text-xl font-semibold">Hoje</h2>
        {atual ? (
          <div className="space-y-3">
            <p>Fase em andamento: <strong>{atual.nome}</strong> ({dataBr(atual.inicio)} a {dataBr(atual.fim)}). {respondeu ? "Você já respondeu o bem-estar de hoje. Obrigado!" : "Falta responder o seu bem-estar de hoje."}</p>
            <Link href="/meu-bem-estar" className={`inline-block rounded-md px-5 py-3 font-semibold ${respondeu ? "border border-linha bg-white hover:bg-fundo" : "bg-bola-500 text-white hover:opacity-90"}`}>
              {respondeu ? "Ver ou corrigir a resposta de hoje" : "Responder agora"}
            </Link>
          </div>
        ) : ativas.length > 0 ? (
          <p className="text-suave">Há uma fase de treinamento em andamento, mas você não está na lista de convocados. Se isso estiver errado, fale com a comissão técnica. Você continua vendo o calendário e os treinos.</p>
        ) : (
          <p className="text-suave">
            Não há fase de treinamento em andamento. Por isso o bem-estar e o RPE ficam fechados.
            {proximaFase ? ` Você está convocado para “${proximaFase.nome}”, que começa em ${dataBr(proximaFase.inicio)}.` : ""}
          </p>
        )}
      </section>
)}

      <section aria-label="Atalhos">
        <h2 className="mb-2 font-titulo text-xl font-semibold">Para onde você quer ir?</h2>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {atalhos.map(({ href, titulo, desc, icone: Icone }) => (
            <li key={href}>
              <Link href={href} className="flex h-full min-h-28 flex-col justify-between rounded-lg border border-linha bg-white p-4 hover:border-quadra-600">
                <Icone size={26} aria-hidden className="text-quadra-600" />
                <span>
                  <span className="block font-medium">{titulo}</span>
                  <span className="block text-sm text-suave">{desc}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {!off("calendario") && (
<section aria-label="Próximas sessões" className="rounded-lg border border-linha bg-white p-5">
        <h2 className="mb-3 font-titulo text-xl font-semibold">Próximas sessões</h2>
        {((proximas ?? []) as any[]).length === 0 ? (
          <p className="text-sm text-suave">Nenhuma sessão agendada por enquanto.</p>
        ) : (
          <ul className="space-y-3">
            {((proximas ?? []) as any[]).map((s) => (
              <li key={s.id} className="border-l-4 border-quadra-600 pl-3">
                <Link href={`/calendario/sessao/${s.id}`} className="font-medium leading-snug hover:underline">{s.titulo}</Link>
                <p className="text-sm text-suave">{ROTULO_TIPO[s.tipo] ?? s.tipo} · {quando(s.inicio)}{(Array.isArray(s.equipas) ? s.equipas[0] : s.equipas)?.nome ? ` · ${(Array.isArray(s.equipas) ? s.equipas[0] : s.equipas).nome}` : ""}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
)}

      <section aria-label="Como o app funciona" className="rounded-lg border border-linha bg-white p-5">
        <h2 className="mb-3 font-titulo text-xl font-semibold">Como o app funciona</h2>
        <dl className="space-y-3 text-sm">
          {!off("calendario") && (
<div>
            <dt className="font-medium">Calendário e RPE</dt>
            <dd className="text-suave">Veja os treinos e jogos marcados pela comissão e, dentro de cada sessão, os exercícios que foram selecionados para ela. Se você estiver convocado para a fase, ao sair do treino abra a sessão e registre o RPE: uma nota de 0 a 10 para o esforço da sessão inteira (0 é repouso e 10 é esforço máximo).</dd>
          </div>
)}
          {!off("bemestar") && (
<div>
            <dt className="font-medium">Meu bem-estar</dt>
            <dd className="text-suave">Nas fases de treinamento, responda uma vez por dia sobre sono, cansaço, dores e humor, com notas de 1 a 5 (5 é o melhor cenário). Leva menos de um minuto e ajuda a comissão a cuidar de você.</dd>
          </div>
)}
          {!off("musculacao") && (
<div>
            <dt className="font-medium">Musculação</dt>
            <dd className="text-suave">Registre os dias em que fez o treino de musculação da preparação física e conte como foi.</dd>
          </div>
)}
          {!off("shootout") && (
<div>
            <dt className="font-medium">Shoot-out</dt>
            <dd className="text-suave">Veja as suas batidas de shoot-out e o ranking da fase de treinamento. A comissão técnica faz os registros.</dd>
          </div>
)}
          {!off("prancheta") && (
<div>
            <dt className="font-medium">Prancheta</dt>
            <dd className="text-suave">Consulte as jogadas e os esquemas montados pela comissão.</dd>
          </div>
)}
        </dl>
        <p className="mt-4 border-t border-linha pt-3 text-sm text-suave">Suas respostas de bem-estar, RPE e dores são vistas apenas pela comissão técnica, pela gestão e pela direção. Os colegas não têm acesso.</p>
      </section>

      <DicaInstalar aberto />
    </div>
  );
}
