import type { Papel } from "@/types";
import { sair } from "@/app/(auth)/login/actions";
import { ROTULO_PAPEL } from "@/lib/papeis";
import { MenuMovel } from "./MenuMovel";

export function Topbar({ nome, papel }: { nome: string; papel: Papel }) {
  const iniciais = nome.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
  return (
    <header className="flex h-16 items-center justify-between border-b border-linha bg-white px-4 md:px-6 print:hidden">
      <div className="flex items-center gap-3 md:hidden">
        <MenuMovel papel={papel} />
        <span className="font-titulo text-xl font-bold">Handebol Hub</span>
      </div>
      <div className="hidden md:block" />
      <div className="flex items-center gap-3">
        <div className="hidden text-right leading-tight sm:block">
          <p className="text-sm font-semibold">{nome}</p>
          <p className="text-xs text-suave">{ROTULO_PAPEL[papel]}</p>
        </div>
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-quadra-900 text-sm font-semibold text-white" title={nome}>{iniciais}</span>
        <form action={sair}><button className="px-2 py-3 text-sm text-suave underline">Sair</button></form>
      </div>
    </header>
  );
}
