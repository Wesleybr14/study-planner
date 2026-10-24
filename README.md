# 📚 Study Planner

App web que gera **roteiros de estudo personalizados com IA** e organiza automaticamente
vídeos e livros sobre o tema — com metas, anotações e flashcards de revisão.

## ✨ Funcionalidades

- 🔐 Cadastro e login (Supabase)
- 🤖 Roteiro de estudo gerado por IA (Google Gemini), do básico ao avançado
- 🎬 Busca automática de vídeos (YouTube Data API), assistíveis **na própria página**
- 📖 Livros automáticos via Open Library (confiável, sem chave) + Google Books, com **leitor embutido**
- 📥 Recomendação prioriza livros **gratuitos** — com PDF baixável, leitura online ou empréstimo grátis
- 🔬 Artigos científicos gratuitos (arXiv, Europe PMC, DOAJ) com resumo e PDF
- 📁 **Abra um livro/artigo que já está no seu computador**: nos blocos de **Livros** e **Artigos** dá para adicionar **PDF ou EPUB** do seu PC (fica salvo no navegador, via IndexedDB) e ler embutido — PDF no visualizador nativo, **EPUB** com índice/próxima-anterior/ajuste de letra. Você pode **arrastar e soltar** o arquivo direto sobre o bloco. O botão **☁️ Salvar na nuvem** envia o arquivo para o Supabase Storage, deixando-o disponível em **qualquer aparelho** onde você fizer login.
- 📂 **Bloco "📁 Meus arquivos"**: reúne num só lugar todos os PDFs/EPUBs que você adicionou ao tópico (livros **e** artigos), com abrir, **renomear**, **baixar de volta para o PC**, remover, enviar para a nuvem, **excluir em lote** (com "☑️ Selecionar") e **filtro por nome** — tudo com **arrastar-e-soltar**. Também aparece como aba **📁 Arquivos** no painel lateral.
- 🗂️ **Painel lateral por tópico**: reúne vídeos, livros, artigos, anotações, flashcards e quiz sem sair da página
- 🧩 **Workspace em blocos** (estilo _snap_): abra com o botão **⛶ Expandir** e organize os blocos de vídeo, livro, artigos, **meus arquivos**, notas, flashcards e quiz **arrastando e redimensionando** livremente (alças nos **4 cantos e 4 laterais**), ou escolhendo um **layout pronto**. Dentro de cada bloco dá para **trocar qual vídeo/livro/artigo aparece**, **ocultar** blocos que você não quer ver (e mostrá-los de novo depois) e usar **⛶ (ou duplo-clique no cabeçalho) para encaixar o bloco na grade em tela cheia** — volta com **Esc**. O botão **🧲 Encaixar todos** reorganiza e **redimensiona** os blocos para preencherem a grade **sem lacunas** (ajusta altura/largura de cada um). O tema (claro/escuro/sistema) também fica disponível no cabeçalho do workspace.
- 💾 **Arranjos por tópico**: cada tópico guarda o seu próprio arranjo (edite à mão ou aplique um layout pronto). Você também pode **salvar arranjos com um nome** na sua biblioteca e escolher, no seletor _Arranjo_, qual usar em cada tópico ("situação"). O botão **📌 Aplicar a todos** replica o arranjo atual para **todos os tópicos** de uma vez. Os tópicos com arranjo próprio ganham um indicador **🧩** na lista. Tudo fica salvo **na nuvem** (coluna `preferencias.layout`)
- 🔄 Botão para regenerar as buscas de vídeos/livros/artigos de um roteiro (útil para roteiros antigos)
- 📊 Acompanhamento de progresso por tópico
- 🎯 Metas/prazos com contagem de dias restantes
- 📅 Cronograma automático (distribui os tópicos pelos dias até a meta)
- 📝 **Anotações por tópico (editor tipo caderno)**: ferramentas para criar **títulos**, **tópicos em lista**, **tarefas** que ficam **riscadas ao concluir** (checkboxes clicáveis), **negrito**, **itálico**, **riscar** e **grifar**. Alterna entre **Editar** e **Visualizar**.
- 🃏 Flashcards de revisão gerados por IA — com **exportação em CSV** (compatível com Anki: `Frente,Verso`)
- 🔁 Revisão espaçada (SM-2) — os cards voltam no intervalo ideal
- ⏱ Cronômetro de estudo e Pomodoro (25/5)
- 📊 Estatísticas: tempo estudado, sequência de dias (streak), gráfico de 7 dias, **tempo por roteiro** e **histórico de sessões** (inclui sessões livres)
- ❓ Quiz de múltipla escolha gerado por IA
- 🔎 **Busca/filtro no painel** por título, descrição ou `#tag`
- 🏷 **Tags nos roteiros** — organize e filtre seus roteiros (ex.: `#faculdade`, `#concurso`)
- 📄 **Duplicar tópico** com um clique (copia anotações, flashcards e escolhas)
- ↕️ **Reordenar tópicos** na lista (mover para cima/baixo)
- 🎯 **Modo foco (Zen)** — esconde o menu para estudar sem distrações (tecla `F`)
- ⌨️ **Atalhos de teclado** (`F` foco, `?` ajuda, `Esc` fechar, `Espaço` inicia/pausa o cronômetro quando ele está em foco)
- ⬇️ **Exportar anotações** em Markdown (`.md`) e PDF
- 💾 **Backup/Restore** — exporte e importe todos os seus dados em `.json` (página ⚙️ Ajustes)
- 🌙 Tema claro/escuro/sistema
- 🖥️ Layout responsivo: barra lateral no desktop e navegação inferior no celular

## 🛠️ Tecnologias

- **Next.js 16** + TypeScript + Tailwind CSS
- **Supabase** — login e banco de dados (PostgreSQL)
- **Google Gemini** — geração de roteiros, flashcards e quiz
- **YouTube Data API** — vídeos
- **Open Library / Internet Archive** + **Google Books API** — livros (Open Library não exige chave)
- **arXiv**, **Europe PMC** e **DOAJ** — artigos científicos de acesso aberto (sem chave de API)
- **epub.js** + **IndexedDB** — leitura de **EPUB** e arquivos locais (PDF/EPUB) do computador
- **Supabase Storage** — guarda na nuvem os arquivos que você optar por enviar

## 🚀 Como rodar localmente

### 1. Configurar as chaves de API

Copie `.env.example` para `.env.local` e preencha:

```
GEMINI_API_KEY=...
YOUTUBE_API_KEY=...
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

O `.env.example` também descreve as variáveis opcionais.

### 2. Configurar o banco no Supabase

As migrações ficam em `supabase/migrations/` e são aplicadas pelo
[Supabase CLI](https://supabase.com/docs/guides/cli), já instalado como
dependência do projeto (`npx supabase`). Na primeira vez:

```bash
npx supabase login                      # abre o navegador para autorizar
npx supabase link --project-ref SEU-REF # SEU-REF é o trecho antes de .supabase.co na URL do projeto
```

Depois, sempre que houver migração nova:

```bash
npm run db:status   # lista as migrações: aplicadas (Remote) e locais (Local)
npm run db:push     # aplica só as que faltam, em ordem
```

Sem o CLI, dá para colar cada arquivo de `supabase/migrations/` no
**SQL Editor** do Supabase, em ordem, mas aí o controle do que já rodou é manual.

Em **Authentication > URL Configuration**, inclua a URL `/login` do seu domínio e
do ambiente local nas URLs de redirecionamento (necessário para "Esqueci minha senha").

### 3. Instalar e rodar

```bash
npm install
npm run dev
```

Abra http://localhost:3000

## ☁️ Publicar na Vercel

1. Suba o projeto para o GitHub (veja abaixo).
2. Acesse https://vercel.com e faça login com o GitHub.
3. Clique em **Add New > Project** e importe o repositório.
4. Em **Environment Variables**, cadastre as mesmas variáveis do `.env.local`:
   - `GEMINI_API_KEY`
   - `YOUTUBE_API_KEY`
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - opcionais: `GOOGLE_BOOKS_API_KEY` e `GEMINI_MODELS` (veja `.env.example`)
5. Clique em **Deploy**. A Vercel te dá um link público.

> Alternativa por terminal: `npx vercel` e siga as instruções.

## 🐙 Subir para o GitHub

```bash
git remote add origin https://github.com/SEU-USUARIO/study-planner.git
git branch -M main
git push -u origin main
```

## 📁 Estrutura

```
study-planner/
├── app/                    # páginas (login, dashboard, tema, cronometro, revisao, estatisticas, configuracoes)
│   └── api/                # rotas: gemini, youtube, books, artigos, flashcards, quiz
├── components/             # AppShell, TopicoDrawer, WorkspaceBlocos, BottomNav, ThemeToggle, Cronometro, LeitorArquivo, SeletorArquivos, SoltarArquivos
│   └── blocos/             # blocos reutilizáveis: vídeo, livro, artigos, arquivos, notas, flashcards, quiz
├── lib/                    # supabase, gemini, youtube, books, artigos, arquivos, layout, prazo, cronograma, revisao
├── supabase/
│   ├── config.toml         # configuração do Supabase CLI
│   └── migrations/         # migrações do banco, em ordem
├── .env.example            # modelo das variáveis
└── .env.local              # suas chaves (NÃO vai pro Git)
```

## ✅ Verificações

```bash
npm ci
npm run check
npm run build
```

`check` executa ESLint, Prettier, TypeScript e testes. Os testes de banco usam PostgreSQL
local em memória (PGlite), com usuários e schemas de teste, sem tocar no Supabase
real. Cobrem quotas, isolamento, conflito de versão e rollback da restauração.
Os testes de UI autenticada e de envio real de e-mail devem ser feitos em uma
conta de homologação após aplicar a migração.

O parser XML do EPUB foi atualizado via override, com teste de compatibilidade.
`npm audit` verifica os pacotes de produção e de desenvolvimento. O lint usa o
parser TypeScript e as regras de React Hooks diretamente, sem a cadeia legada de
glob do eslint-config-next.

O CI (`.github/workflows/ci.yml`) roda `npm run check` e `npm run build` a cada push.
`npm run format` aplica o Prettier.

## 📝 Histórico de mudanças

Detalhes de cada versão (cotas, backup v2, sala de estudo, modo Expandir…) estão
em [CHANGELOG.md](CHANGELOG.md).
