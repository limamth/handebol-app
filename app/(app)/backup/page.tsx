import { redirect } from "next/navigation";
import { obterPerfil } from "@/lib/sessao";
import { podeVer } from "@/lib/permissions";
import { FUSO } from "@/lib/datas";

const quando = (iso: string) => new Intl.DateTimeFormat("pt-BR", { timeZone: FUSO, dateStyle: "short", timeStyle: "short" }).format(new Date(iso));
const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://SEU-PROJETO.supabase.co";

export default async function Backup() {
  const { supabase, perfil } = await obterPerfil();
  if (!podeVer(perfil.papel, "backup")) redirect("/dashboard");

  const { data: ultimos } = await supabase.from("registro_backup").select("id, feito_em, linhas").order("feito_em", { ascending: false }).limit(5);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <h1 className="font-titulo text-3xl font-bold">Backup dos dados</h1>
        <p className="text-suave">Uma cópia de tudo o que está no app (atletas, sessões, bem-estar, testes, shoot-out e o restante), para o caso de perda de dados.</p>
      </header>

      <section className="rounded-lg border border-linha bg-white p-5">
        <h2 className="mb-2 font-titulo text-xl font-semibold">Baixar backup agora</h2>
        <a href="/backup/arquivo" download className="inline-block rounded-md bg-bola-500 px-5 py-3 font-semibold text-white hover:opacity-90">Baixar backup</a>
        <p className="mt-3 text-sm text-suave">O arquivo reúne dados de saúde dos atletas. Guarde-o em um lugar protegido, só seu, e não o envie por aplicativos de mensagem. Faça um backup toda semana e também antes e depois de cada fase de treinamento.</p>
        <h3 className="mt-4 font-medium">Últimos backups</h3>
        {(ultimos ?? []).length === 0 ? <p className="text-sm text-suave">Nenhum backup baixado ainda.</p> : (
          <ul className="mt-1 text-sm">
            {(ultimos as any[]).map((b) => <li key={b.id}>{quando(b.feito_em)} · {b.linhas} registros</li>)}
          </ul>
        )}
      </section>

      <section className="rounded-lg border border-linha bg-white p-5">
        <h2 className="mb-2 font-titulo text-xl font-semibold">Como restaurar</h2>
        <ol className="list-decimal space-y-1 pl-5 text-sm">
          <li>Crie um projeto novo e vazio no Supabase e rode, na ordem, todos os arquivos da pasta <code>supabase/migrations</code> do projeto.</li>
          <li>No terminal do VS Code, na pasta do app, rode (troque pelos seus valores; a chave <em>service_role</em> está em Project Settings → API e é secreta):
            <pre className="mt-1 overflow-x-auto rounded-md bg-fundo p-2 text-xs">{`$env:SUPABASE_URL="https://SEU-NOVO-PROJETO.supabase.co"\n$env:SUPABASE_SERVICE_ROLE_KEY="sua-chave-service-role"\nnode scripts/restaurar-backup.mjs "C:\\caminho\\backup-handebol-hub-AAAA-MM-DD.json"`}</pre>
          </li>
          <li>O script mostra um código de acesso para cada gestor. Use-o em “primeiro acesso” na tela de entrada. Os demais usuários recebem códigos novos em Utilizadores.</li>
          <li>Atualize o endereço e as chaves do projeto no arquivo <code>.env.local</code> e reinicie o app.</li>
        </ol>
        <p className="mt-2 text-sm text-suave">Faça um ensaio de restauração uma vez, em um projeto de teste, para saber que funciona antes de precisar.</p>
      </section>

      <section className="rounded-lg border border-linha bg-white p-5">
        <h2 className="mb-2 font-titulo text-xl font-semibold">Manter o projeto ativo (evitar a pausa)</h2>
        <p className="text-sm">O plano gratuito do Supabase pausa o projeto quando passa uma semana com pouco uso. Para isso não acontecer entre as fases, configure uma chamada agendada a cada 2 ou 3 dias em um serviço gratuito de agendamento, como o cron-job.org:</p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
          <li>Endereço: <code className="break-all">{url}/rest/v1/rpc/ping</code></li>
          <li>Método: <strong>POST</strong>. Corpo: <code>{"{}"}</code></li>
          <li>Cabeçalhos: <code>apikey</code> com a mesma chave pública do <code>.env.local</code> e <code>Content-Type: application/json</code>. Se der erro 401 e a chave começar com <code>eyJ</code>, acrescente <code>Authorization: Bearer</code> e a mesma chave.</li>
          <li>Ao testar, a resposta correta é <code>true</code>.</li>
        </ul>
        <p className="mt-2 text-sm text-suave">A documentação do Supabase diz que poucas requisições por dia costumam bastar, mas não é garantia. Por isso o backup continua importante.</p>
      </section>
    </div>
  );
}
