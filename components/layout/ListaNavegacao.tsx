"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAVEGACAO } from "@/lib/navigation";
import { podeVer } from "@/lib/permissions";
import type { Papel } from "@/types";

// "desativados": funções desligadas em Configurações. A equipe as vê acinzentadas (sem clique); o atleta nem as vê.
export function ListaNavegacao({ papel, desativados = [] }: { papel: Papel; desativados?: string[] }) {
  const pathname = usePathname();
  const veDesativadas = podeVer(papel, "configuracoes");

  return (
    <nav className="flex-1 space-y-6 overflow-y-auto px-3 pb-6" aria-label="Navegação principal">
      {NAVEGACAO.map((grupo, i) => {
        const itens = grupo.itens.filter((it) => !it.modulo || (podeVer(papel, it.modulo) && (veDesativadas || !desativados.includes(it.modulo))));
        if (itens.length === 0) return null;
        return (
          <div key={i}>
            {grupo.titulo && <p className="px-3 pb-2 text-xs font-medium text-white/50">{grupo.titulo}</p>}
            <ul className="space-y-1">
              {itens.map(({ rotulo, href, icone: Icone, modulo }) => {
                if (modulo && desativados.includes(modulo)) {
                  return (
                    <li key={href}>
                      <span aria-disabled="true" title="Função desativada em Configurações" className="flex cursor-not-allowed items-center gap-3 rounded-md px-3 py-3 text-[15px] text-white/35 md:py-2.5">
                        <Icone size={20} aria-hidden />
                        {rotulo}
                        <span className="ml-auto text-[11px]">desativada</span>
                      </span>
                    </li>
                  );
                }
                const ativo = pathname === href || pathname.startsWith(href + "/");
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      aria-current={ativo ? "page" : undefined}
                      className={`flex items-center gap-3 rounded-md px-3 py-3 text-[15px] transition-colors md:py-2.5 ${
                        ativo ? "bg-bola-500 font-semibold text-white" : "text-white/80 hover:bg-quadra-800"
                      }`}
                    >
                      <Icone size={20} aria-hidden />
                      {rotulo}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </nav>
  );
}
