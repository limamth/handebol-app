"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ABAS = [
  { href: "/shootout", rotulo: "Visão geral", exato: true },
  { href: "/shootout/ranking", rotulo: "Ranking" },
  { href: "/shootout/fases", rotulo: "Fases" },
  { href: "/shootout/batidas", rotulo: "Batidas" },
  { href: "/shootout/sessoes", rotulo: "Sessões" },
  { href: "/shootout/goleiros", rotulo: "Goleiros" },
];

export function AbasShootout({ editar }: { editar: boolean }) {
  const pathname = usePathname();
  const abas = editar ? [{ href: "/shootout/registro", rotulo: "Registro" }, ...ABAS] : ABAS;
  return (
    <nav aria-label="Seções do Shoot-out" className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
      {abas.map((a: any) => {
        const ativa = a.exato ? pathname === a.href : pathname === a.href || pathname.startsWith(a.href + "/");
        return (
          <Link key={a.href} href={a.href} aria-current={ativa ? "page" : undefined}
            className={`whitespace-nowrap rounded-full border px-4 py-2 text-sm ${ativa ? "border-quadra-900 bg-quadra-900 text-white" : "border-linha bg-white"}`}>{a.rotulo}</Link>
        );
      })}
    </nav>
  );
}
