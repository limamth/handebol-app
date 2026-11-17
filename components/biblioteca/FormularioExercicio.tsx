import { ROTULO_OBJETIVO } from "./rotulos";

const campo = "mt-1 w-full rounded-md border border-linha bg-white px-3 py-2.5";

export interface ValoresExercicio {
  titulo?: string; objetivo?: string; pasta?: string | null; descricao?: string | null;
  duracao_min?: number | null; intensidade_alvo?: number | null; jogadores_min?: number | null;
  materiais?: string[] | null; tags?: string[] | null; diagrama_id?: string | null; video_url?: string | null;
}

interface Props {
  action: (formData: FormData) => void | Promise<void>;
  jogadas: { id: string; titulo: string }[];
  rotuloBotao: string;
  valores?: ValoresExercicio;
}

// Formulário compartilhado entre "Novo exercício" e "Editar exercício"
export function FormularioExercicio({ action, jogadas, rotuloBotao, valores = {} }: Props) {
  return (
    <form action={action} className="grid gap-4 rounded-lg border border-linha bg-white p-5 sm:grid-cols-2">
      <label className="block text-sm font-medium sm:col-span-2">Título
        <input name="titulo" required defaultValue={valores.titulo ?? ""} className={campo} placeholder="Ex.: Finalização com giro após passe do pivô" />
      </label>
      <label className="block text-sm font-medium">Objetivo
        <select name="objetivo" defaultValue={valores.objetivo ?? "tecnico"} className={campo}>
          {Object.entries(ROTULO_OBJETIVO).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </label>
      <label className="block text-sm font-medium">Pasta
        <input name="pasta" defaultValue={valores.pasta ?? ""} className={campo} placeholder="Ex.: Ataque posicionado" />
      </label>
      <label className="block text-sm font-medium sm:col-span-2">Descrição e instruções
        <textarea name="descricao" rows={5} defaultValue={valores.descricao ?? ""} className={campo} />
      </label>
      <label className="block text-sm font-medium">Duração (minutos)
        <input name="duracao" type="number" min={1} max={180} defaultValue={valores.duracao_min ?? ""} className={campo} />
      </label>
      <label className="block text-sm font-medium">Intensidade alvo (1 a 10)
        <input name="intensidade" type="number" min={1} max={10} defaultValue={valores.intensidade_alvo ?? ""} className={campo} />
      </label>
      <label className="block text-sm font-medium">Mínimo de atletas
        <input name="jogadores" type="number" min={1} max={30} defaultValue={valores.jogadores_min ?? ""} className={campo} />
      </label>
      <label className="block text-sm font-medium">Materiais (separe por vírgula)
        <input name="materiais" defaultValue={(valores.materiais ?? []).join(", ")} className={campo} placeholder="Bolas, coletes, cones" />
      </label>
      <label className="block text-sm font-medium sm:col-span-2">Tags (separe por vírgula)
        <input name="tags" defaultValue={(valores.tags ?? []).join(", ")} className={campo} placeholder="contra-ataque, 2 contra 1" />
      </label>
      <label className="block text-sm font-medium">Jogada da prancheta
        <select name="diagrama" defaultValue={valores.diagrama_id ?? ""} className={campo}>
          <option value="">Sem diagrama</option>
          {jogadas.map((j) => <option key={j.id} value={j.id}>{j.titulo}</option>)}
        </select>
      </label>
      <label className="block text-sm font-medium">Link de vídeo (opcional)
        <input name="video" type="url" defaultValue={valores.video_url ?? ""} className={campo} />
      </label>
      <div className="sm:col-span-2">
        <button className="rounded-md bg-bola-500 px-5 py-2.5 font-semibold text-white hover:opacity-90">{rotuloBotao}</button>
      </div>
    </form>
  );
}
