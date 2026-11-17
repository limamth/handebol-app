import Link from "next/link";
import { criarClienteServidor } from "@/lib/supabase/server";
import { entrar, criarClube, criarContaComCodigo } from "./actions";

const TITULOS: Record<string, { titulo: string; texto: string }> = {
  entrar: { titulo: "Entrar", texto: "Acesse com o e-mail cadastrado." },
  criar: { titulo: "Criar seu clube", texto: "Você será o gestor e poderá cadastrar a comissão técnica e os atletas." },
  codigo: { titulo: "Primeiro acesso", texto: "Use o código de acesso que o gestor ou a comissão técnica gerou para você." },
};

export default async function Login({ searchParams }: { searchParams: { modo?: string; erro?: string } }) {
  const { data: podeCriar } = await criarClienteServidor().rpc("pode_criar_clube");
  const modo = searchParams.modo === "codigo" || (searchParams.modo === "criar" && podeCriar) ? searchParams.modo : "entrar";
  const campo = "mt-1 w-full rounded-md border border-linha bg-white px-3 py-2.5";
  const acao = modo === "criar" ? criarClube : modo === "codigo" ? criarContaComCodigo : entrar;
  const novaConta = modo !== "entrar";

  return (
    <main className="flex min-h-screen items-center justify-center bg-quadra-900 p-6">
      <div className="w-full max-w-sm rounded-lg bg-white p-8">
        <h1 className="font-titulo text-3xl font-bold">{TITULOS[modo].titulo}</h1>
        <p className="mt-1 text-sm text-suave">{TITULOS[modo].texto}</p>

        {searchParams.erro && <p role="alert" className="mt-4 rounded-md bg-bola-100 px-3 py-2 text-sm">{searchParams.erro}</p>}

        <form action={acao} className="mt-6 space-y-4">
          {modo === "criar" && (
            <>
              <label className="block text-sm font-medium">Seu nome
                <input name="nome" required className={campo} autoComplete="name" />
              </label>
              <label className="block text-sm font-medium">Nome do clube
                <input name="clube" required className={campo} />
              </label>
            </>
          )}
          {modo === "codigo" && (
            <label className="block text-sm font-medium">Código de acesso
              <input name="codigo" required className={`${campo} font-mono uppercase tracking-widest`} autoComplete="off" maxLength={12} />
            </label>
          )}
          <label className="block text-sm font-medium">E-mail
            <input name="email" type="email" required className={campo} autoComplete="email" />
          </label>
          <label className="block text-sm font-medium">{novaConta ? "Crie uma senha" : "Senha"}
            <input name="senha" type="password" required className={campo} autoComplete={novaConta ? "new-password" : "current-password"} />
          </label>
          <button className="w-full rounded-md bg-bola-500 py-2.5 font-semibold text-white hover:opacity-90">
            {modo === "criar" ? "Criar clube" : modo === "codigo" ? "Criar minha conta" : "Entrar"}
          </button>
        </form>

        <div className="mt-5 space-y-1 text-center text-sm text-suave">
          {novaConta ? (
            <p>Já tem conta? <Link href="/login" className="font-medium text-quadra-600 underline">Entrar</Link></p>
          ) : (
            <>
              <p>Tenho um código de acesso: <Link href="/login?modo=codigo" className="font-medium text-quadra-600 underline">primeiro acesso</Link></p>
              {podeCriar && <p>Primeira vez aqui? <Link href="/login?modo=criar" className="font-medium text-quadra-600 underline">Criar um clube</Link></p>}
            </>
          )}
        </div>
      </div>
    </main>
  );
}
