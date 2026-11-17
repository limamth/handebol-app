import { sair } from "@/app/(auth)/login/actions";

export default function SemAcesso() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-quadra-900 p-6">
      <div className="w-full max-w-sm rounded-lg bg-white p-8">
        <h1 className="font-titulo text-3xl font-bold">Conta sem acesso</h1>
        <p className="mt-2 text-sm text-suave">Esta conta não tem acesso no momento: ela pode não estar ligada a um clube ou ter sido desativada. Fale com o gestor. Se for o seu primeiro acesso, peça o código, saia e crie a conta com ele.</p>
        <form action={sair} className="mt-6"><button className="w-full rounded-md bg-bola-500 py-2.5 font-semibold text-white hover:opacity-90">Sair</button></form>
      </div>
    </main>
  );
}
