import Link from "next/link";
import { obterPerfil } from "@/lib/sessao";
import { InicioAtleta } from "./InicioAtleta";
import { CartaoIndicador } from "@/components/dashboard/CartaoIndicador";
import { GraficoCarga } from "@/components/dashboard/GraficoCarga";
import { calcularMonitorizacao } from "@/lib/monitorizacao";
import { FUSO, mesVizinho } from "@/lib/datas";
import { hojeChave, inicioDaSemana, inicioDoDia, somarDias } from "@/lib/periodo";

const quando = (iso: string) => new Intl.DateTimeFormat("pt-BR", { timeZone: FUSO, weekday: "short", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));

export default async function Dashboard() {
  const { supabase, perfil } = await obterPerfil();
  if (perfil.papel === "atleta") return <InicioAtleta supabase={supabase} perfil={perfil} />;

  // Lembrete para o gestor: faz tempo desde o último backup?
  let diasDesdeBackup: number | null = null;
  let backupAtrasado = false;
  if (perfil.papel === "gestor") {
    const { data: ultimo, error: erroBackup } = await supabase.from("registro_backup").select("feito_em").order("feito_em", { ascending: false }).limit(1).maybeSingle();
    if (!erroBackup) {
      diasDesdeBackup = ultimo ? Math.floor((Date.now() - new Date(ultimo.feito_em).getTime()) / 86400000) : null;
      backupAtrasado = diasDesdeBackup === null || diasDesdeBackup >= 14;
    }
  }
  const hoje = hojeChave();
  const segunda = inicioDaSemana(hoje);
  const [ano, mes] = hoje.split("-").map(Number);
  const mesAtual = hoje.slice(0, 7);
  const mesSeguinte = mesVizinho(ano, mes, 1);

  const [{ count: atletas }, { count: sessoesSemana }, { data: presencas }, { data: proximas }, monitor] = await Promise.all([
    supabase.from("usuarios").select("id", { count: "exact", head: true }).eq("papel", "atleta").eq("ativo", true),
    supabase.from("sessoes").select("id", { count: "exact", head: true }).gte("inicio", inicioDoDia(segunda)).lt("inicio", inicioDoDia(somarDias(segunda, 7))),
    supabase.from("presencas").select("status, sessoes!inner(inicio)").gte("sessoes.inicio", inicioDoDia(`${mesAtual}-01`)).lt("sessoes.inicio", inicioDoDia(`${mesSeguinte}-01`)),
    supabase.from("sessoes").select("id, titulo, inicio, equipas(nome)").gte("inicio", new Date().toISOString()).order("inicio").limit(4),
    calcularMonitorizacao(supabase),
  ]);

  const registros = presencas ?? [];
  const presentes = registros.filter((p) => p.status === "presente").length;
  const presenca = registros.length ? `${Math.round((presentes / registros.length) * 100)}%` : "-";

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <h1 className="font-titulo text-3xl font-bold">Visão geral</h1>

      {perfil.papel === "gestor" && backupAtrasado && (
        <p role="status" className="rounded-md bg-bola-100 px-4 py-3 text-sm">
          {diasDesdeBackup === null ? "Ainda não há backup dos dados." : `Faz ${diasDesdeBackup} dias desde o último backup.`}{" "}
          <Link href="/backup" className="font-medium text-quadra-600 underline">Fazer backup agora</Link>
        </p>
      )}

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <CartaoIndicador rotulo="Atletas ativos" valor={String(atletas ?? 0)} />
        <CartaoIndicador rotulo="Sessões nesta semana" valor={String(sessoesSemana ?? 0)} />
        <CartaoIndicador rotulo="Presença no mês" valor={presenca} detalhe={registros.length ? `${registros.length} registros` : "Sem presenças registradas"} />
        <CartaoIndicador rotulo="Atletas em alerta" valor={String(new Set(monitor.alertas.map((a) => a.atletaId)).size)} detalhe="Veja a lista abaixo" destaque />
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-lg border border-linha bg-white p-5 lg:col-span-2">
          <h2 className="mb-3 font-titulo text-xl font-semibold">Carga da semana (média por atleta)</h2>
          <GraficoCarga dados={monitor.diario} />
        </div>
        <div className="rounded-lg border border-linha bg-white p-5">
          <h2 className="mb-3 font-titulo text-xl font-semibold">Próximas sessões</h2>
          {(proximas ?? []).length === 0 ? <p className="text-sm text-suave">Nenhuma sessão agendada. <Link href="/calendario" className="text-quadra-600 underline">Abrir calendário</Link></p> : (
            <ul className="space-y-3">
              {(proximas as any[]).map((s) => (
                <li key={s.id} className="border-l-4 border-quadra-600 pl-3">
                  <Link href={`/calendario/sessao/${s.id}`} className="font-medium leading-snug hover:underline">{s.titulo}</Link>
                  <p className="text-sm text-suave">{quando(s.inicio)} · {s.equipas?.nome}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="rounded-lg border border-linha bg-white p-5">
        <h2 className="mb-3 font-titulo text-xl font-semibold">Atletas que pedem atenção</h2>
        {monitor.alertas.length === 0 ? <p className="text-sm text-suave">Nenhum alerta no momento.</p> : (
          <ul className="divide-y divide-linha">
            {monitor.alertas.map((a, i) => (
              <li key={i} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <Link href={`/atletas/${a.atletaId}`} className="font-medium text-quadra-600 underline">{a.atleta}</Link>
                <span className="text-sm text-suave">{a.motivo}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
