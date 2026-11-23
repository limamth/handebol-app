"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { ListaNavegacao } from "./ListaNavegacao";
import type { Papel } from "@/types";

// Menu em gaveta para telas pequenas (no computador o menu lateral continua fixo)
export function MenuMovel({ papel, desativados = [] }: { papel: Papel; desativados?: string[] }) {
  const [aberto, setAberto] = useState(false);
  const pathname = usePathname();
  const botaoAbrir = useRef<HTMLButtonElement>(null);
  const botaoFechar = useRef<HTMLButtonElement>(null);

  useEffect(() => { setAberto(false); }, [pathname]);   // fecha ao navegar

  useEffect(() => {
    if (!aberto) return;
    botaoFechar.current?.focus();
    const aoTecla = (e: KeyboardEvent) => { if (e.key === "Escape") setAberto(false); };
    document.addEventListener("keydown", aoTecla);
    const antes = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", aoTecla);
      document.body.style.overflow = antes;
      botaoAbrir.current?.focus();
    };
  }, [aberto]);

  return (
    <>
      <button ref={botaoAbrir} type="button" onClick={() => setAberto(true)} aria-label="Abrir menu" aria-expanded={aberto}
        className="flex h-11 w-11 items-center justify-center rounded-md border border-linha md:hidden print:hidden">
        <Menu size={22} aria-hidden />
      </button>

      {aberto && (
        <div className="fixed inset-0 z-40 md:hidden print:hidden" role="dialog" aria-modal="true" aria-label="Menu principal">
          <div className="absolute inset-0 bg-black/50" onClick={() => setAberto(false)} aria-hidden />
          <div className="absolute left-0 top-0 flex h-full w-72 max-w-[85%] flex-col bg-quadra-900 text-white shadow-xl">
            <div className="flex h-16 items-center justify-between px-4">
              <span className="font-titulo text-2xl font-bold tracking-wide">Handebol Hub</span>
              <button ref={botaoFechar} type="button" onClick={() => setAberto(false)} aria-label="Fechar menu" className="flex h-11 w-11 items-center justify-center rounded-md hover:bg-quadra-800">
                <X size={22} aria-hidden />
              </button>
            </div>
            <ListaNavegacao papel={papel} desativados={desativados} />
          </div>
        </div>
      )}
    </>
  );
}
