"use client";

import { useRouter } from "next/navigation";

// Troca a sessão do Registro rápido e atualiza os contadores
export function SeletorSessao({ sessoes, atual, outros }: { sessoes: { id: string; rotulo: string }[]; atual: string; outros: Record<string, string> }) {
  const router = useRouter();
  return (
    <label className="block text-sm font-medium">Sessão
      <select value={atual} onChange={(e) => { const p = new URLSearchParams(outros); p.set("sessao", e.target.value); router.push(`/shootout/registro?${p}`); }}
        className="mt-1 w-full rounded-md border border-linha bg-white px-3 py-3">
        {sessoes.map((s) => <option key={s.id} value={s.id}>{s.rotulo}</option>)}
      </select>
    </label>
  );
}
