// Dados fictícios para o MVP visual. Trocar por consultas ao Supabase na Etapa 1.
export const resumo = {
  atletasAtivos: 18,
  sessoesSemana: 6,
  presencaMedia: 91,
  wellnessMedio: 3.9, // escala 1 a 5
  alertas: 3,
};

export const cargaSemanal = [
  { dia: "Seg", ua: 420 }, { dia: "Ter", ua: 560 }, { dia: "Qua", ua: 300 },
  { dia: "Qui", ua: 610 }, { dia: "Sex", ua: 480 }, { dia: "Sáb", ua: 720 }, { dia: "Dom", ua: 0 },
]; // UA = RPE da sessão x duração em minutos

export const proximasSessoes = [
  { id: "1", titulo: "Treino tático: defesa 6:0", tipo: "treino", quando: "Hoje, 18:30", equipa: "Adulto masculino" },
  { id: "2", titulo: "Força e potência", tipo: "treino", quando: "Amanhã, 07:00", equipa: "Adulto masculino" },
  { id: "3", titulo: "Jogo: 8ª rodada", tipo: "jogo", quando: "Sáb, 16:00", equipa: "Adulto masculino" },
];

export const alertasAtletas = [
  { id: "a", atleta: "Atleta 7", motivo: "Wellness abaixo de 2,5 por 3 dias" },
  { id: "b", atleta: "Atleta 12", motivo: "Carga semanal 40% acima da média" },
  { id: "c", atleta: "Atleta 3", motivo: "Sem resposta ao questionário hoje" },
];
