"use client";

// Abre a janela de impressão do navegador; lá dá para escolher "Salvar como PDF".
export function BotaoImprimir({ rotulo = "Imprimir ou salvar em PDF" }: { rotulo?: string }) {
  return (
    <button type="button" onClick={() => window.print()} className="rounded-md border border-linha bg-white px-3 py-2 text-sm hover:bg-fundo print:hidden">
      {rotulo}
    </button>
  );
}
