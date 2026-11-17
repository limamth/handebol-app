import { ListaNavegacao } from "./ListaNavegacao";
import type { Papel } from "@/types";

export function Sidebar({ papel }: { papel: Papel }) {
  return (
    <aside className="hidden w-64 shrink-0 flex-col bg-quadra-900 text-white md:flex print:hidden">
      <div className="flex h-16 items-center px-6 font-titulo text-2xl font-bold tracking-wide">Handebol Hub</div>
      <ListaNavegacao papel={papel} />
    </aside>
  );
}
