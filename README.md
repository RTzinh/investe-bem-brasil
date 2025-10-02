# Investe Bem Brasil

Aplicação completa de finanças pessoais com dashboard interativo, controle de transações, orçamentos, metas, investimentos com streaming em tempo real e assistente IA educacional.

## Tecnologias principais

- Front-end: Vite + React + TypeScript + Tailwind + shadcn/ui + Recharts + React Query
- Back-end: Express + Socket.IO + SQLite (better-sqlite3)
- IA: Google Gemini (via `@google/generative-ai`)

## Pré-requisitos

- Node.js (>= 18)
- npm (>= 9)

## Configuração

1. Instale dependências:

   ```bash
   npm install
   ```

2. Configure variáveis de ambiente:

   ```bash
   cp .env.example .env
   cp server/.env.example server/.env
   ```

   Ajuste conforme necessário:

   - `VITE_API_URL`: URL base da API (padrão `http://localhost:4000/api`)
   - `VITE_SOCKET_URL`: URL do websocket de investimentos
   - `GEMINI_API_KEY`: chave da API Gemini para o assistente IA

3. (Opcional) ajuste porta ou outros parâmetros no `server/.env`.

## Executando o projeto

### Backend

```bash
npm run server
```

O servidor Express será iniciado em `http://localhost:4000`, com base SQLite armazenada em `server/data/investebem.db`.

### Frontend

Em outro terminal:

```bash
npm run dev
```

A interface Vite ficará disponível em `http://localhost:5173` consumindo a API do backend.

## Funcionalidades implementadas

- **Dashboard**: visão geral consolidada (investimentos, transações recentes, alertas sugeridos)
- **Transações**: listagem com filtros, importação CSV, exportação, criação manual e indicadores automáticos
- **Orçamentos**: acompanhamento por categoria, alertas (80% e excedido), notas e metas
- **Metas**: cadastro, acompanhamento de progresso, aportes adicionais e painel de status
- **Investimentos**: carteira com atualização em tempo real via Socket.IO, distribuição por classe, registro de operações e gráfico de preços
- **Relatórios**: fluxo de caixa, distribuição de despesas por categoria e exportação CSV
- **Assistente IA**: chat educacional conectado à API Gemini com histórico de mensagens

## Observações

- O banco SQLite já vem populado com dados exemplo; pode ser reiniciado removendo `server/data/investebem.db`.
- Para ambientes de produção configure variáveis de ambiente seguras e rode o backend com um process manager (PM2, Docker, etc.).
- A chave Gemini deve ser mantida em local seguro; o arquivo `.env` não deve ser commitado.

## Scripts úteis

| Comando              | Descrição                                       |
| -------------------- | ----------------------------------------------- |
| `npm run dev`        | Inicia o frontend Vite                          |
| `npm run server`     | Inicia o backend Express                        |
| `npm run server:dev` | Inicia o backend com hot-reload (`tsx --watch`) |
| `npm run build`      | Build do frontend                              |
| `npm run preview`    | Preview do build do frontend                   |

---

Made with ❤️ para uma gestão financeira integrada.
