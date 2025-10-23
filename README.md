# Investe Bem Brasil

Plataforma de inteligencia patrimonial que combina automacao financeira, monitoramento de investimentos em tempo real e uma camada de IA explicavel para apoiar decisoes de investidores e consultores.

## Visao Geral

- **Dashboard unificado**: transacoes, orcamentos, metas, carteira e alertas em uma unica experiencia React + Tailwind.
- **Backends especializados**  
  - **Express + SQLite** (Node.js) para operacoes transacionais, streaming via Socket.IO e autenticacao por chave.  
  - **FastAPI + SQLModel** (Python) para monitoramento inteligente, metricas quantitativas e insights Gemini.
- **IA explicavel**: chat financeiro com fallback educacional, insights automaticos e explicacao de alertas.
- **Seguranca embutida**: rate limiting, validacao com Zod, logging estruturado (Pino) e proxy seguro para o servico de IA.

## Arquitetura em Alto Nivel

| Camada | Tecnologias | Responsabilidades |
| ------ | ------------ | ----------------- |
| Front-end | Vite, React 18, TypeScript, shadcn/ui, React Query | UI responsiva, orquestracao de dados, integracao com Socket.IO |
| API Express | Express 5, better-sqlite3, Socket.IO, Zod | CRUDs financeiros, importacao CSV, autenticacao via API Key, streaming de carteira |
| API FastAPI | FastAPI, SQLModel, Pandas, Gemini | Coleta de mercado, metricas quantitativas, rebalanceamento e insights de IA |
| Persistencia | SQLite compartilhado (`backend/app/db/investebem.db`) | Dados transacionais e de monitoramento em um unico arquivo (WAL ativo) |

## Principais Capacidades

- Dashboard financeiro com visao de receitas, despesas, metas e carteira consolidada.
- Importacao de extratos CSV com sanitizacao automatica.
- Orcamentos, metas e investimentos com calculo de status, historicos e alertas.
- Streaming de precos (Socket.IO) sincronizado com metricas reais do FastAPI.
- Insights de IA e chat financeiro utilizando Google Gemini via backend Python.

## Seguranca Operacional

- Toda rota Express exige `x-api-key` (ou `Authorization: Bearer`) usando `SERVER_API_KEY`.
- Rate limiting (120 req/min) e Helmet habilitados por padrao.
- Validacao com Zod para evitar entradas inconsistentes.
- Logs estruturados com Pino e `pino-pretty` em modo desenvolvimento.
- O front nunca acessa o Gemini diretamente; tudo passa pelo proxy seguro.

## Requisitos

- Node.js >= 18 e npm >= 9  
- Python >= 3.11  
- (Opcional) Docker e Docker Compose

## Configuracao Rapida

```bash
npm install
cp .env.example .env
cp server/.env.example server/.env
cp backend/.env.example backend/.env
```

1. Defina uma chave segura (>=16 caracteres) para `SERVER_API_KEY` e replique em `VITE_SERVER_API_KEY`.
2. Ajuste `SQLITE_PATH` caso queira armazenar o banco em outro local.
3. Preencha `GEMINI_API_KEY` no `.env` do FastAPI para habilitar IA.

### Variaveis relevantes

| Variavel | Contexto | Descricao |
| -------- | -------- | --------- |
| `SERVER_API_KEY` | Express | Chave obrigatoria para todas as rotas (enviada via `x-api-key`). |
| `VITE_SERVER_API_KEY` | Front-end | Usada para popular o cabecalho automaticamente. |
| `VITE_API_URL` / `VITE_SOCKET_URL` | Front-end | Endpoints para REST e Socket.IO (padrao `http://localhost:4000`). |
| `FASTAPI_BASE_URL` | Express | URL para delegar chamadas inteligentes (`http://localhost:8000/api/v1`). |
| `GEMINI_API_KEY` | FastAPI | Chave do Google Gemini utilizada nos fluxos de IA. |

## Execucao Local

### Backend FastAPI

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate      # Windows
# source .venv/bin/activate   # Linux/macOS
pip install -e .
uvicorn app.main:app --reload --port 8000
```

### Backend Express

```bash
npm run server
```

O Express e o FastAPI compartilham o SQLite em `backend/app/db/investebem.db`. Ajuste `SQLITE_PATH` se necessario.

### Front-end Vite

```bash
npm run dev
```

Interface disponivel em `http://localhost:5173`.

### Execucao integrada (Docker Compose)

```bash
SERVER_API_KEY=troque-esta-chave docker compose up --build
```

Servicos expostos:

- `frontend` -> `http://localhost:5173`
- `api` (Express + Socket.IO) -> `http://localhost:4000`
- `fastapi` -> `http://localhost:8000`

`shared-db` e o volume nomeado que sincroniza o SQLite entre os containers.

## Acesso a API

Exemplo de chamada autenticada:

```bash
curl -H "x-api-key: Rn77sv5rxZMkhHRz" http://localhost:4000/api/transactions
```

Sem o cabecalho o servidor responde `{"message":"Unauthorized request"}`.

Ferramentas uteis:

- Postman/Insomnia: configurar `x-api-key` nos cabecalhos.
- Console do navegador:
  ```js
  fetch('http://localhost:4000/api/transactions', {
    headers: { 'x-api-key': 'sua-chave' },
  }).then(r => r.json()).then(console.log);
  ```

## Qualidade e Observabilidade

| Comando | Descricao |
| ------- | --------- |
| `npm run lint` | ESLint cobrindo front e backend |
| `npm run test` | Vitest + Supertest com cobertura V8 |
| `npm run build` | Build de producao do front |

- CI (`.github/workflows/ci.yml`) executa lint, testes e build em pushes/PRs.
- Rate limiting, Helmet e logs estruturados ativos por padrao.

## Roadmap Sugerido

- Autenticacao por usuario/cliente com controle de permissoes.
- Observabilidade completa (Prometheus + Grafana) e alarmes.
- Integracao com provedores Open Finance e APIs bancarias.
- SDK publico e documentacao de parceiros.

## Suporte e Contribuicao

1. Abra uma issue descrevendo contexto, logs e passos para reproduzir.
2. Antes de enviar PR, execute `npm run lint && npm run test`.
3. Use os arquivos `.env.example` como referencia de configuracao.

---

Projeto orientado para planejamento financeiro inteligente com foco em auditoria, seguranca e colaboracao entre equipes de tecnologia e investimentos.
