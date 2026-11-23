import Link from "next/link";
import { obterPerfil } from "@/lib/sessao";
import { podeVer } from "@/lib/permissions";
import { rotuloDoModulo } from "@/lib/configuracoes";

export default async function Desativado({ searchParams }: { searchParams: { m?: string } }) {
  const { perfil } = await obterPerfil();
  const equipe = podeVer(perfil.papel, "configuracoes");

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <h1 className="font-titulo text-3xl font-bold">Função desativada</h1>
      <p className="rounded-lg border border-dashed border-linha bg-white p-6 text-suave">
        {searchParams.m ? `A função “${rotuloDoModulo(searchParams.m)}”` : "Esta função"} está desativada no momento.
        {equipe ? " Você pode ativá-la de novo em Configurações." : " Em caso de dúvida, fale com a comissão técnica."}
      </p>
      <p className="space-x-4 text-sm">
        <Link href="/dashboard" className="text-quadra-600 underline">Voltar ao início</Link>
        {equipe && <Link href="/configuracoes" className="text-quadra-600 underline">Abrir Configurações</Link>}
      </p>
    </div>
  );
}
