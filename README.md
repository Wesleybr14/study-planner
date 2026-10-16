# 📚 Study Planner

App web que gera **roteiros de estudo personalizados com IA** e organiza automaticamente
vídeos e livros sobre o tema — com metas, anotações e flashcards de revisão.

## ✨ Funcionalidades

- 🔐 Cadastro e login (Supabase)
- 🤖 Roteiro de estudo gerado por IA (Google Gemini), do básico ao avançado
- 🎬 Busca automática de vídeos (YouTube Data API)
- 📖 Busca automática de livros (Google Books API)
- 📊 Acompanhamento de progresso por tópico
- 🎯 Metas/prazos com contagem de dias restantes
- 📅 Cronograma automático (distribui os tópicos pelos dias até a meta)
- 📝 Anotações pessoais por tópico
- 🃏 Flashcards de revisão gerados por IA
- 🔁 Revisão espaçada (SM-2) — os cards voltam no intervalo ideal
- ⏱ Cronômetro de estudo e Pomodoro (25/5)
- 📊 Estatísticas: tempo estudado, sequência de dias (streak) e gráfico de 7 dias
- ❓ Quiz de múltipla escolha gerado por IA
- 🌙 Tema claro/escuro
- 📱 Layout adaptado para celular

## 🛠️ Tecnologias

- **Next.js 16** + TypeScript + Tailwind CSS
- **Supabase** — login e banco de dados (PostgreSQL)
- **Google Gemini** — geração de roteiros e flashcards
- **YouTube Data API** + **Google Books API** — recursos

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
(prazo) e `supabase-migration-3.sql` (sessões de estudo).

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
├── app/                    # páginas (login, dashboard, tema, revisao, estatisticas)
│   └── api/                # rotas: gemini, youtube, books, flashcards, quiz
├── components/             # ThemeToggle, BottomNav, Cronometro
├── lib/                    # supabase, gemini, youtube, googlebooks, prazo, cronograma, revisao
├── supabase-setup.sql      # criação das tabelas
├── supabase-migration-2.sql# migração (prazo)
├── supabase-migration-3.sql# migração (sessões de estudo)
├── .env.example            # modelo das variáveis
└── .env.local              # suas chaves (NÃO vai pro Git)
```
