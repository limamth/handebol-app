# Handebol Hub: arquitetura inicial

## Decisões de stack
- **Next.js 14 (App Router) + TypeScript + Tailwind**: como você sugeriu.
- **Supabase** (Postgres + Auth + Storage + RLS): entrega login, banco relacional e upload de vídeo sem você montar backend. Dá para trocar por Node puro depois, porque o schema é SQL padrão.
- **Multi-clube desde o dia 1** (`clube_id` em tudo): custa pouco agora e evita reescrever o banco se virar produto.

## Estrutura de pastas
```
app/
  (app)/                  # área logada, compartilha Sidebar + Topbar
    dashboard/
    equipas/              # Etapa 1
    calendario/           # Etapa 2
    biblioteca/           # Etapa 3
    prancheta/            # Etapa 3
    monitorizacao/        # Etapa 4
    avaliacoes/           # Etapa 4
  (auth)/login/           # Etapa 1
components/
  layout/                 # Sidebar, Topbar
  dashboard/              # cartões e gráficos
  ui/                     # botões, tabelas, modais reutilizáveis
lib/
  supabase/               # clientes browser/servidor
  permissions.ts          # matriz papel x módulo (já incluída)
  navigation.ts           # menu declarativo (já incluído)
types/
supabase/
  schema.sql              # modelo relacional (já incluído)
  migrations/             # a partir da Etapa 1, use migrations versionadas
```
Cada módulo vive na própria pasta em `app/(app)/<modulo>` e, quando crescer, ganha `components/<modulo>/` e `lib/<modulo>/`. Assim dá para construir e testar um por vez.

## Modelo de dados (resumo)
`clubes` → `equipas` ← `membros_equipa` → `usuarios` (papel)
`equipas` → `sessoes` → `sessao_exercicios` → `exercicios` → `diagramas` (JSON)
`sessoes` → `presencas`, `rpe_sessao` (carga = RPE × minutos)
`definicoes_teste` → `resultados_teste` → `usuarios`
`questionarios` → `respostas_questionario` → `usuarios`

Ideias-chave: o desenho tático é um JSON com frames (permite animação depois sem mudar o banco), a carga é coluna calculada, e as respostas de questionário são JSON para você criar perguntas novas sem migrar tabela.

## Roadmap
| Etapa | Entrega | Pronto quando |
|---|---|---|
| 0 | Layout, navegação, dashboard com dados fictícios | Roda localmente (este código) |
| 1 | Auth Supabase, equipas, usuários, papéis, lista e ficha do atleta, RLS | Treinador entra, cria equipa e cadastra atletas |
| 2 | Calendário (mês/semana), criar sessão/jogo, anexar exercícios, presença | Planeja a semana inteira |
| 3 | Biblioteca de exercícios com filtros e pastas, prancheta 2D (arrastar jogadores, setas, frames) | Monta um exercício com diagrama |
| 4 | RPE pós-sessão, testes físicos com histórico, questionário de bem-estar pelo celular, alertas | Dashboard mostra carga e alertas reais |
| 5 | Relatórios em PDF, estatísticas de equipa, exportar/importar CSV | Relatório mensal em um clique |
| 6 | Vídeo (upload, marcações com tempo, clipes por jogada), integração com sensores/GPS | Marca lances de um jogo |
| 7 | Mensagens, notificações, app instalável (PWA) | Atleta recebe aviso de treino |

## Próximo passo sugerido
Etapa 1. Preciso saber só uma coisa: você quer começar com **Supabase** (mais rápido) ou **Node + Postgres próprio**?

## Como rodar
```
npm install
npm run dev
```
Abra http://localhost:3000.
