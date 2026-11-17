import Link from "next/link";
import { DIAS_SEMANA, doisDigitos } from "@/lib/datas";

interface Props {
  mesTexto: string;                                                   // AAAA-MM
  registros: Record<string, { rpe: number | null; dor: string }>;     // por dia (AAAA-MM-DD)
  hoje: string;
  diaSelecionado: string;
  href: (mes: string, dia: string) => string;
}

export function CalendarioForca({ mesTexto, registros, hoje, diaSelecionado, href }: Props) {
  const [ano, mes] = mesTexto.split("-").map(Number);
  const primeiro = new Date(Date.UTC(ano, mes - 1, 1)).getUTCDay();
  const diasNoMes = new Date(Date.UTC(ano, mes, 0)).getUTCDate();
  const celulas: (number | null)[] = [...Array(primeiro).fill(null), ...Array.from({ length: diasNoMes }, (_, i) => i + 1)];
  while (celulas.length % 7) celulas.push(null);

  return (
    <div className="overflow-x-auto rounded-lg border border-linha bg-white">
      <div className="grid min-w-0 grid-cols-7">
        {DIAS_SEMANA.map((d) => <div key={d} className="border-b border-linha px-1 py-2 text-center text-xs font-medium text-suave">{d}</div>)}
        {celulas.map((dia, i) => {
          if (!dia) return <div key={i} className="min-h-16 border-b border-r border-linha bg-fundo" />;
          const chave = `${mesTexto}-${doisDigitos(dia)}`;
          const reg = registros[chave];
          const futuro = chave > hoje;
          const selecionado = chave === diaSelecionado;
          const conteudo = (
            <>
              <span className={`text-sm ${chave === hoje ? "font-bold" : ""}`}>{dia}</span>
              {reg && (
                <span className="mt-1 block rounded bg-emerald-700 px-1 py-0.5 text-center text-[11px] leading-tight text-white">
                  <span aria-hidden>✓</span>
                  <span className="hidden sm:inline"> Feito{reg.rpe !== null ? ` · RPE ${reg.rpe}` : ""}</span>
                  <span className="sr-only">Feito{reg.rpe !== null ? `, RPE ${reg.rpe}` : ""}</span>
                </span>
              )}
            </>
          );
          const base = `min-h-16 border-b border-r border-linha p-1.5 ${selecionado ? "outline outline-2 -outline-offset-2 outline-quadra-600" : ""}`;
          return futuro ? (
            <div key={i} className={`${base} text-suave`} aria-label={`Dia ${dia}, ainda não chegou`}>{conteudo}</div>
          ) : (
            <Link key={i} href={`${href(mesTexto, chave)}#registro`} className={`${base} block hover:bg-fundo`} aria-label={`Dia ${dia}${reg ? ", treino registrado" : ", sem registro"}`} aria-current={selecionado ? "date" : undefined}>{conteudo}</Link>
          );
        })}
      </div>
    </div>
  );
}
