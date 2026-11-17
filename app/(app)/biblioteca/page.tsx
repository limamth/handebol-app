import Link from "next/link";
import { obterPerfil } from "@/lib/sessao";
import { redirect } from "next/navigation";
import { podeEditar, podeVer } from "@/lib/permissions";
import { COR_OBJETIVO, ROTULO_OBJETIVO } from "@/components/biblioteca/rotulos";

export default async function Biblioteca({ searchParams }: { searchParams: { objetivo?: string; q?: string; erro?: string } }) {
  const { supabase, perfil } = await obterPerfil();
  if (!podeVer(perfil.papel, "biblioteca")) redirect("/dashboard");
  const objetivo = searchParams.objetivo && ROTULO_OBJETIVO[searchParams.objetivo] ? searchParams.objetivo : "";
  const q = (searchParams.q ?? "").trim();

  let consulta = supabase.from("exercicios").select("id, titulo, objetivo, duracao_min, intensidade_alvo, tags, pasta").order("titulo");
  if (objetivo) consulta = consulta.eq("objetivo", objetivo);
  if (q) consulta = consulta.ilike("titulo", `%${q}%`);
  const { data: exercicios } = await consulta;

  const href = (o: string) => `/biblioteca?${new URLSearchParams({ ...(o ? { objetivo: o } : {}), ...(q ? { q } : {}) })}`;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-titulo text-3xl font-bold">Exercícios</h1>
        {podeEditar(perfil.papel, "biblioteca") && (
          <Link href="/biblioteca/novo" className="rounded-md bg-bola-500 px-5 py-2.5 font-semibold text-white hover:opacity-90">Novo exercício</Link>
        )}
      </div>

      {searchParams.erro && <p role="alert" className="rounded-md bg-bola-100 px-3 py-2 text-sm">{searchParams.erro}</p>}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav aria-label="Filtrar por objetivo" className="flex flex-wrap gap-2">
          {[["", "Todos"], ...Object.entries(ROTULO_OBJETIVO)].map(([k, v]) => (
            <Link key={k} href={href(k)} aria-current={objetivo === k ? "page" : undefined}
              className={`rounded-full border px-4 py-1.5 text-sm ${objetivo === k ? "border-quadra-900 bg-quadra-900 text-white" : "border-linha bg-white"}`}>{v}</Link>
          ))}
        </nav>
        <form action="/biblioteca" className="flex gap-2">
          {objetivo && <input type="hidden" name="objetivo" value={objetivo} />}
          <input name="q" defaultValue={q} placeholder="Buscar pelo título" aria-label="Buscar exercício" className="rounded-md border border-linha bg-white px-3 py-2 text-sm" />
          <button className="rounded-md border border-linha bg-white px-3 py-2 text-sm">Buscar</button>
        </form>
      </div>

      {(exercicios ?? []).length === 0 ? (
        <p className="rounded-lg border border-dashed border-linha bg-white p-6 text-suave">Nenhum exercício encontrado.</p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(exercicios as any[]).map((e) => (
            <li key={e.id}>
              <Link href={`/biblioteca/${e.id}`} className="block h-full rounded-lg border border-linha bg-white p-5 hover:border-quadra-600">
                <span className={`inline-block rounded px-2 py-0.5 text-xs ${COR_OBJETIVO[e.objetivo]}`}>{ROTULO_OBJETIVO[e.objetivo]}</span>
                <p className="mt-2 font-titulo text-xl font-semibold leading-tight">{e.titulo}</p>
                <p className="mt-1 text-sm text-suave">
                  {[e.duracao_min && `${e.duracao_min} min`, e.intensidade_alvo && `intensidade ${e.intensidade_alvo}/10`, e.pasta].filter(Boolean).join(" · ")}
                </p>
                {e.tags?.length > 0 && <p className="mt-2 text-xs text-suave">{e.tags.join(" · ")}</p>}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
