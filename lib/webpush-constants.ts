// Constantes públicas de Web Push seguras para uso tanto no cliente quanto no servidor.
// Não possui nenhuma dependência do Node.js nem de bibliotecas de servidor.

export const VAPID_PUBLIC_KEY =
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
  "BDOObb_aMkwTzpydrTW9w21VLfO0T_ABteYu-GshGeEZxUnvVsIwNjOamarbO2GOLHxfYlxidyilrzadzcxYbWY";
