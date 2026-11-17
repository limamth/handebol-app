import { redirect } from "next/navigation";
import { obterPerfil } from "@/lib/sessao";
import { podeEditar, podeVer } from "@/lib/permissions";
import { AbasShootout } from "@/components/shootout/AbasShootout";

export default async function ShootoutLayout({ children }: { children: React.ReactNode }) {
  const { perfil } = await obterPerfil();
  if (!podeVer(perfil.papel, "shootout")) redirect("/dashboard");

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <header>
        <h1 className="font-titulo text-3xl font-bold">Shoot-out</h1>
        <p className="text-suave">Batidas, aproveitamento e rankings por fase de treinamento.</p>
      </header>
      <AbasShootout editar={podeEditar(perfil.papel, "shootout")} />
      {children}
    </div>
  );
}
