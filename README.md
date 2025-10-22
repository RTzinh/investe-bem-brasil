# Investe Bem Brasil

Aplicacao de financas pessoais e inteligencia patrimonial com dashboard interativo, automacoes de orcamento, metas, investimentos e uma camada de IA que gera insights explicaveis.

## Tecnologias principais

- Front-end: Vite, React, TypeScript, Tailwind, shadcn/ui, Recharts, React Query
- Backend (legado): Express, Socket.IO, SQLite (better-sqlite3)
- Backend (monitoramento inteligente): Python 3.11, FastAPI, SQLModel, Pandas, Gemini
- IA: Google Gemini (SDK JS no front e API REST no backend Python)

## Pre-requisitos

- Node.js >= 18 e npm >= 9 para front-end e servidor Express
- Python >= 3.11 para o backend FastAPI

## Configuracao inicial

```bash
npm install
cp .env.example .env
cp server/.env.example server/.env
```

### Variaveis relevantes

- `VITE_API_URL`: URL base da API (padrao `http://localhost:4000/api` ou `http://localhost:8000/api/v1`)
- `VITE_SOCKET_URL`: URL do websocket de investimentos (padrao `http://localhost:4000`)
- `GEMINI_API_KEY`: chave Google Gemini usada pelo front-end

## Executando o projeto

### Backend Express (existente)

```bash
npm run server
```

Servidor disponível em `http://localhost:4000` com base SQLite em `server/data/investebem.db`.

### Backend FastAPI (monitoramento inteligente)

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate          # Windows
# source .venv/bin/activate     # Linux/macOS
pip install -e .
cp .env.example .env
uvicorn app.main:app --reload --port 8000
```

Rotas principais em `http://localhost:8000/api/v1`:

- `GET /health` - health-check do servico
- `GET /assets` - lista ativos monitorados e metricas calculadas
- `POST /assets/{symbol}/refresh` - coleta intraday/EOD (Yahoo/Alpaca)
- `GET /portfolio/snapshot` - carteira consolidada e desvios de alocacao
- `POST /portfolio/rebalance` - sugestoes de trades considerando custo minimo
- `GET /alerts` - alertas inteligentes (variacao, volume, rebalance, etc.)
- `POST /insights` - resumos explicaveis de relatorios/noticias via Gemini

O scheduler interno atualiza precos, recalcula metricas, detecta anomalias e gera alertas conforme `SCHEDULER_TICK_SECONDS` definido no `.env` do backend.

### Front-end Vite

```bash
npm run dev
```

A interface sobe em `http://localhost:5173`. Ajuste `VITE_API_URL` para direcionar chamadas ao backend FastAPI se desejar consumir os novos endpoints.

## Modulos principais do backend Python

- **Ingestao de dados**: integra Yahoo Finance (EOD) e Alpaca (opcional) para importar OHLCV, volume e corporate actions.
- **Analise quantitativa**: calcula retorno, volatilidade anualizada, drawdown, beta, Sharpe, ATR e volume medio.
- **Deteccao de eventos**: identifica variacoes percentuais, rompimentos de ATR e picos de volume com alertas estruturados.
- **Interpretacao IA**: usa Gemini para explicar alertas e resumir documentos/noticias com contexto e impacto.
- **Rebalanceamento**: monta snapshot da carteira, compara com pesos alvo e sugere trades com custo estimado.
- **Alertas**: persiste alertas, permite confirmacao, envia email opcional (SMTP) e gera explicacoes via IA.

## Roadmap e diferenciais sugeridos

- **Perfilagem dinamica do investidor**: questionario gamificado que ajusta automaticamente risco alvo, bandas de alocacao e linguagem das recomendacoes.
- **Simulador de cenarios macro**: stress tests para choques de juros, eventos geopoliticos ou halving de cripto com impacto projetado em volatilidade e drawdown.
- **Score ESG e tematico**: consolidar dados publicos (CVM, relatórios de sustentabilidade) para priorizar empresas com melhor perfil socioambiental.
- **Recomendacoes fiscais inteligentes**: motor de tax-loss harvesting que sugere vendas/compensacoes respeitando janelas de restricao.
- **Knowledge base autoatualizavel**: pipeline que resume atas do COPOM, FED e cartas de gestores gerando briefing semanal no app.
- **Localizacao multilanguage**: toggle pt-BR/en-US com traducao contextual para alertas, onboarding e chat educacional.
- **Companion PWA**: Progressive Web App com push notifications para alertas criticos e tarefas de rebalanceamento.
- **Integraçao Open Finance**: importacao automatica de extratos via Open Finance Brasil para manter patrimonio sincronizado.

## Scripts uteis

| Comando                        | Descricao                                 |
| ------------------------------ | ----------------------------------------- |
| `npm run dev`                  | Inicia o front-end Vite                   |
| `npm run server`               | Inicia o backend Express                  |
| `npm run server:dev`           | Express com hot reload                    |
| `npm run build`                | Build do front-end                        |
| `npm run preview`              | Preview do build                          |
| `uvicorn app.main:app --reload`| Sobe o backend FastAPI (ajuste porta)     |

---

Made with foco em planejamento financeiro inteligente.
