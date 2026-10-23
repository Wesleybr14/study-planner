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

### 2. Configurar o banco no Supabase

No painel do Supabase, abra **SQL Editor > New query**, cole o conteúdo de
`supabase-setup.sql` e clique em **Run**.
Se você já tinha criado a tabela antes, rode também `supabase-migration-2.sql`
(prazo), `supabase-migration-3.sql` (sessões de estudo), `supabase-migration-4.sql`
(arranjo do workspace em blocos), `supabase-migration-5.sql` (tags nos roteiros) e
`supabase-migration-6.sql` (bucket + tabela para **arquivos do usuário** — livros/artigos do PC).
A migração 6 cria o bucket privado `arquivos` no Supabase Storage; sem ela, o botão
**☁️ Salvar na nuvem** não funciona (mas os arquivos locais no navegador continuam funcionando).

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
4. Em **Environment Variables**, cadastre as **mesmas 4 variáveis** do `.env.local`:
   - `GEMINI_API_KEY`
   - `YOUTUBE_API_KEY`
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
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
├── supabase-setup.sql      # criação das tabelas
├── supabase-migration-2.sql# migração (prazo)
├── supabase-migration-3.sql# migração (sessões de estudo)
├── supabase-migration-4.sql# migração (arranjo do workspace em blocos)
├── supabase-migration-5.sql# migração (tags nos roteiros)
├── supabase-migration-6.sql# migração (arquivos do usuário: bucket + metadados)
├── .env.example            # modelo das variáveis
└── .env.local              # suas chaves (NÃO vai pro Git)
```

## Atualização de confiabilidade e planejamento

Antes de usar esta versão, execute `supabase-migration-7.sql` no SQL Editor do seu
projeto Supabase, após as migrações anteriores. Ela adiciona o perfil de estudo,
controle de versão para evitar sobrescritas entre abas, cotas de API por usuário
e a função de restauração transacional. Não exige chave `service_role` no app.
As APIs recusam chamadas quando a migração não está disponível. Os roteiros existentes continuam acessíveis antes da migração: o salvamento usa comparação do JSON de tópicos quando a coluna `versao` ainda não existe. O novo campo de disponibilidade permanece dependente da migração.

- Cotas por hora: 20 chamadas de IA e 200 buscas por usuário. Contadores ficam no
  banco e funcionam mesmo com várias instâncias do servidor.
- Tópicos antigos recebem UUID e um slot permanente (`recursoIndex`) ao abrir o
  roteiro. O slot preserva os vínculos de arquivos, sessões e layouts antigos.
  Reordenar mantém esses vínculos; duplicar cria uma identidade independente.
- O perfil inclui nível, objetivo, idioma, horas por semana e dias disponíveis.
  Ajuste meta e disponibilidade dentro do roteiro. Tópicos longos são divididos
  em sessões e cargas inviáveis ficam sinalizadas no painel diário.
- Anotações salvam após 600 ms sem digitação. Um rascunho local protege edições
  ainda não sincronizadas. A interface informa salvamento e falha.
- Quizzes e tentativas ficam salvos no tópico. O painel sugere reforço abaixo de
  70% de acertos e permite continuar o último tópico aberto.
- O cronômetro usa horários reais e preserva o estado por usuário e tópico neste
  navegador. Blocos Pomodoro concluídos aguardam início manual da próxima fase.
  A sessão possui ID fixo para impedir duplicação em uma nova tentativa de envio.
- Backup v2 inclui roteiros, preferências, sessões, quizzes e os bytes de arquivos
  locais deste navegador e da nuvem. Backups v1 continuam aceitos, sem os dados
  que o formato antigo não exportava. A importação remapeia IDs e vínculos, valida
  conteúdo e prepara os arquivos antes da transação no banco. Limite de importação:
  300 MB. Arquivos locais de outros navegadores precisam ser exportados lá.
  Se a conexão cair durante a confirmação, confira os dados antes de repetir a
  importação; arquivos preparados são preservados quando o resultado é incerto.
- Em Supabase > Authentication > URL Configuration, inclua a URL `/login` do seu
  domínio e do ambiente local nas URLs de redirecionamento. O fluxo “Esqueci minha
  senha” depende dessa configuração e do envio de e-mails do Supabase.

### Verificações

```bash
npm ci
npm run check
npm run build
```

`check` executa ESLint, TypeScript e testes. Os testes de banco usam PostgreSQL
local em memória (PGlite), com usuários e schemas de teste, sem tocar no Supabase
real. Cobrem quotas, isolamento, conflito de versão e rollback da restauração.
Os testes de UI autenticada e de envio real de e-mail devem ser feitos em uma
conta de homologação após aplicar a migração.

O parser XML do EPUB foi atualizado via override, com teste de compatibilidade.
`npm audit` verifica os pacotes de produção e de desenvolvimento. O lint usa o
parser TypeScript e as regras de React Hooks diretamente, sem a cadeia legada de
glob do eslint-config-next.

### Modo Expandir

O espaço expandido mantém o conteúdo dos blocos ao alternar entre grade e foco. As abas superiores permitem focar um recurso; Esc restaura a grade e, na grade, fecha a expansão. Em **Editar layout**, arraste os títulos ou as bordas. Com o título em foco, use setas para mover e Shift + setas para redimensionar. **Organizar blocos** reorganiza a grade; **Desfazer** reverte a última alteração. No celular, os blocos aparecem em uma coluna.

Os ajustes são guardados imediatamente neste navegador, por usuário, e sincronizados com `preferencias.layout`. Se a sincronização falhar, um aviso permite tentar novamente e a cópia local é recuperada na próxima abertura.

### Sala de estudo

Abrir um roteiro retoma o último tópico neste navegador. A sala combina material principal (vídeos, livros, artigos e arquivos) com caderno lateral (notas, flashcards e quiz). O roteiro é recolhível, o caderno tem largura ajustável e o cronômetro fica no menu Tempo de foco. Concluir tópico e Anterior/Próximo permitem estudar sem voltar à lista. O Modo de blocos permanece disponível como alternativa.

A retomada local guarda o tópico, abas, seleção de material, largura do caderno e posição de EPUBs. Rascunhos de notas continuam protegidos pelo salvamento local existente. O minuto de vídeos e a página do visualizador PDF nativo ainda não são restaurados. No celular, Material e Caderno e prática alternam sem desmontar o conteúdo. Somente materiais visitados são carregados.
