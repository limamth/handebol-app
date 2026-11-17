"use client";

import { useEffect, useState } from "react";

// Passo a passo para instalar o app / criar o atalho; some sozinho quando o app já está instalado
export function DicaInstalar({ aberto = false }: { aberto?: boolean }) {
  const [mostrar, setMostrar] = useState(false);
  useEffect(() => {
    const instalado = window.matchMedia("(display-mode: standalone)").matches || (navigator as any).standalone === true;
    setMostrar(!instalado);
  }, []);
  if (!mostrar) return null;

  return (
    <details open={aberto} className="rounded-lg border border-linha bg-white p-4 text-sm print:hidden">
      <summary className="cursor-pointer font-medium">Instalar o app / criar atalho na tela inicial do celular</summary>
      <div className="mt-3 space-y-4">
        <div>
          <p className="font-medium">iPhone (use o Safari)</p>
          <ol className="list-decimal space-y-1 pl-5">
            <li>Toque no botão de compartilhar (um quadrado com uma seta para cima).</li>
            <li>Role a lista e toque em “Adicionar à Tela de Início”.</li>
            <li>Toque em “Adicionar”.</li>
          </ol>
        </div>
        <div>
          <p className="font-medium">Android (use o Chrome)</p>
          <ol className="list-decimal space-y-1 pl-5">
            <li>Toque no menu ⋮ (três pontos), no canto superior direito.</li>
            <li>Toque em “Instalar app” ou “Adicionar à tela inicial”.</li>
            <li>Confirme.</li>
          </ol>
        </div>
        <p className="text-suave">Depois é só abrir pelo ícone “Handebol Hub” na tela inicial: o app abre em tela cheia, como um aplicativo, sem precisar de loja.</p>
      </div>
    </details>
  );
}
