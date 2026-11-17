import Link from "next/link";
import { obterPerfil } from "@/lib/sessao";
import { podeEditar } from "@/lib/permissions";
import { QuadraEstatica } from "@/components/prancheta/Quadra";
import type { DadosTaticos } from "@/lib/prancheta";

export default async function Prancheta() {
  const { supabase, perfil } = await obterPerfil();
  const { data: jogadas } = await supabase.from("diagramas").select("id, titulo, dados").order("criado_em", { ascending: false });

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-titulo text-3xl font-bold">Prancheta</h1>
        {podeEditar(perfil.papel, "prancheta") && (
          <Link href="/prancheta/novo" className="rounded-md bg-bola-500 px-5 py-2.5 font-semibold text-white hover:opacity-90">Nova jogada</Link>
        )}
      </div>

      {(jogadas ?? []).length === 0 ? (
        <p className="rounded-lg border border-dashed border-linha bg-white p-6 text-suave">Nenhuma jogada salva ainda.</p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(jogadas as any[]).map((j) => (
            <li key={j.id}>
              <Link href={`/prancheta/${j.id}`} className="block rounded-lg border border-linha bg-white p-3 hover:border-quadra-600">
                <QuadraEstatica frame={(j.dados as DadosTaticos).frames[0]} />
                <p className="mt-2 font-medium">{j.titulo}</p>
                <p className="text-sm text-suave">{(j.dados as DadosTaticos).frames.length} quadro(s)</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
