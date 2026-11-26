import Link from "next/link";
import { redirect } from "next/navigation";
import { obterPerfil } from "@/lib/sessao";
import { podeEditar } from "@/lib/permissions";
import {
  carregarEquipesAdversarias,
  carregarAtletasAdversarios,
} from "@/lib/scouting";
import { carregarAtletas, carregarGoleiros } from "@/lib/shootout";
import { FormularioRegistroAdversario } from "@/components/scouting/FormularioRegistroAdversario";
import { Aviso } from "@/components/ui/Aviso";
import { criarEquipeAdversaria, criarAtletaAdversario } from "@/app/(app)/shootout/adversarios/actions";
import { HelpCircle, ArrowLeft } from "lucide-react";

const campo = "mt-1 w-full rounded-md border border-linha bg-white px-3 py-2 text-sm";

export default async function RegistroScoutGeral({
  searchParams,
}: {
  searchParams: {
    equipe?: string;
    atleta?: string;
    aviso?: string;
    erro?: string;
    novaEquipe?: string;
    novoAtleta?: string;
    modo?: string;
  };
}) {
  const { supabase, perfil } = await obterPerfil();
  if (!podeEditar(perfil.papel, "scout")) redirect("/scout");

  const [equipes, atletasAdv, nossosAtletas, nossosGoleirosMap] = await Promise.all([
    carregarEquipesAdversarias(supabase),
    carregarAtletasAdversarios(supabase),
    carregarAtletas(supabase),
    carregarGoleiros(supabase),
  ]);

  const nossosGoleiros = [...nossosGoleirosMap.keys()].map((id) => ({
    id,
    nome: nossosAtletas.get(id)?.nome ?? "Goleiro",
  }));

  const ehModoShootout = searchParams.modo === "shootout";

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between border-b border-linha pb-3">
        <div>
          <h1 className="font-titulo text-3xl font-bold">
            {ehModoShootout ? "Registrar Batida de Shoot-out" : "Registrar Arremesso de Jogo"}
          </h1>
          <p className="text-suave text-sm">
            {ehModoShootout
              ? "Registre a decisão do cobrador rival contra goleiro de baliza ou saída."
              : "Mapeie o tipo de finalização, o setor de origem na quadra e o destino no gol."}
          </p>
        </div>
        <Link
          href={`/scout${ehModoShootout ? "?modo=shootout" : "?modo=jogo"}`}
          className="inline-flex items-center gap-1.5 rounded-md border border-linha bg-white px-3 py-1.5 text-xs font-semibold text-tinta hover:bg-fundo"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Voltar ao Scout
        </Link>
      </div>

      <Aviso key={Date.now()} mensagem={searchParams.erro ?? searchParams.aviso} tipo={searchParams.erro ? "erro" : "ok"} />

      {/* Formulário Principal de Registro */}
      <FormularioRegistroAdversario
        equipes={equipes}
        atletas={atletasAdv}
        nossosGoleiros={nossosGoleiros}
        equipeInicial={searchParams.equipe}
        atletaInicial={searchParams.atleta}
        origemInicial={ehModoShootout ? "shootout" : "jogo"}
      />

      {/* Guia Rápido e Didático de Uso para a Comissão Técnica */}
      <div className="rounded-xl border border-linha bg-fundo/60 p-4 text-xs space-y-2">
        <p className="font-bold text-tinta flex items-center gap-1.5">
          <HelpCircle className="h-4 w-4 text-quadra-600" /> Como registrar lances no Scout:
        </p>
        <div className="space-y-1.5 text-suave">
          <p>
            • <strong className="text-tinta">🤾 Arremesso de Jogo:</strong> Escolha a equipe e atleta adversário. Selecione o tipo de arremesso (Giro, Aérea, Especialista, 1pt ou 6m). Clique no setor da quadra onde o arremesso se originou (arremessos de 6m não possuem setor) e na região da baliza onde a bola foi. Por fim, marque se foi gol ou defesa.
          </p>
          <p>
            • <strong className="text-tinta">🎯 Shoot-out:</strong> Marque como o nosso goleiro atuou: se ficou na baliza (selecione o quadrante no gol) ou se saiu no atacante (selecione a técnica de evasão do rival: aérea, costela, cobertura, deita o corpo ou corrida para fuga).
          </p>
        </div>
      </div>

      {/* Formulários de Apoio: Cadastro Rápido de Equipe e Atleta */}
      <div className="grid gap-4 sm:grid-cols-2 pt-2">
        <section className="rounded-lg border border-linha bg-white p-4">
          <h3 className="font-semibold text-sm mb-2">Cadastrar nova equipe rival</h3>
          <form action={criarEquipeAdversaria} className="space-y-3">
            <input type="hidden" name="volta" value="/scout/registro" />
            <label className="block text-xs font-medium text-suave">
              Nome da equipe rival
              <input name="nome" required placeholder="Ex.: Niterói Handbeach" className={campo} />
            </label>
            <label className="block text-xs font-medium text-suave">
              Categoria / Gênero (opcional)
              <input name="categoria" placeholder="Ex.: Adulto Masculino" className={campo} />
            </label>
            <button className="rounded bg-quadra-900 px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90">
              Cadastrar equipe
            </button>
          </form>
        </section>

        <section className="rounded-lg border border-linha bg-white p-4">
          <h3 className="font-semibold text-sm mb-2">Cadastrar novo atleta rival</h3>
          <form action={criarAtletaAdversario} className="space-y-3">
            <input type="hidden" name="volta" value="/scout/registro" />
            <label className="block text-xs font-medium text-suave">
              Equipe do atleta
              <select name="equipe_id" required defaultValue={searchParams.equipe ?? ""} className={campo}>
                <option value="" disabled>Escolha a equipe</option>
                {equipes.map((e) => (
                  <option key={e.id} value={e.id}>{e.nome}</option>
                ))}
              </select>
            </label>
            <div className="grid grid-cols-3 gap-2">
              <label className="col-span-2 block text-xs font-medium text-suave">
                Nome do atleta
                <input name="nome" required placeholder="Ex.: Carlos Silva" className={campo} />
              </label>
              <label className="block text-xs font-medium text-suave">
                Nº
                <input name="numero" type="number" placeholder="10" className={campo} />
              </label>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <label className="block text-xs font-medium text-suave">
                Posição
                <select name="posicao" className={campo}>
                  <option value="">Não informar</option>
                  <option value="Especialista">Especialista</option>
                  <option value="Lateral">Lateral</option>
                  <option value="Pivô">Pivô</option>
                  <option value="Defensor">Defensor</option>
                  <option value="Goleiro">Goleiro</option>
                </select>
              </label>
              <label className="block text-xs font-medium text-suave">
                Braço dominante
                <select name="mao" className={campo}>
                  <option value="">Não informar</option>
                  <option value="destro">Destro</option>
                  <option value="canhoto">Canhoto</option>
                </select>
              </label>
            </div>
            <button className="rounded bg-quadra-900 px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90">
              Cadastrar atleta
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
