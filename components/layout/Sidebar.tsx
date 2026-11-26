import { LogoBHHub } from "@/components/ui/LogoBHHub";
import { ListaNavegacao } from "./ListaNavegacao";
import type { Papel } from "@/types";

export function Sidebar({ papel, desativados = [] }: { papel: Papel; desativados?: string[] }) {
  return (
    <aside className="hidden w-64 shrink-0 flex-col bg-quadra-900 text-white md:flex print:hidden">
      <div className="flex h-16 items-center px-6">
        <LogoBHHub variante="escura" tamanho="md" />
      </div>
      <ListaNavegacao papel={papel} desativados={desativados} />
    </aside>
  );
}
