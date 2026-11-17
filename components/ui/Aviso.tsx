"use client";

import { useEffect, useState } from "react";

// Aviso em pop-up (canto superior direito). Some sozinho depois de alguns segundos.
export function Aviso({ mensagem, tipo = "ok" }: { mensagem?: string; tipo?: "ok" | "erro" }) {
  const [aberto, setAberto] = useState(Boolean(mensagem));

  useEffect(() => {
    if (!mensagem) return;
    setAberto(true);
    // Tira o aviso do endereço para ele não reaparecer ao atualizar a página
    const url = new URL(window.location.href);
    ["aviso", "erro", "salvo"].forEach((p) => url.searchParams.delete(p));
    window.history.replaceState(null, "", url.toString());
    const t = setTimeout(() => setAberto(false), 7000);
    return () => clearTimeout(t);
  }, [mensagem]);

  if (!aberto || !mensagem) return null;
  return (
    <div role={tipo === "erro" ? "alert" : "status"} className={`fixed left-4 right-4 top-4 z-50 flex items-start sm:left-auto sm:max-w-sm gap-3 rounded-lg border-l-4 bg-white p-4 shadow-lg ${tipo === "erro" ? "border-bola-500" : "border-emerald-600"}`}>
      <p className="text-sm">{mensagem}</p>
      <button type="button" onClick={() => setAberto(false)} aria-label="Fechar aviso" className="text-suave hover:text-tinta">✕</button>
    </div>
  );
}
