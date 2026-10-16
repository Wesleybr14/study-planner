# 📚 Study Planner

App web que gera **roteiros de estudo personalizados com IA** e organiza automaticamente
vídeos, livros e materiais sobre o tema.

## ✨ Funcionalidades

- Cadastro e login (Supabase)
- Roteiro de estudo gerado por IA (Google Gemini) com tópicos do básico ao avançado
- Busca automática de vídeos (YouTube) e livros (Google Books) por tópico
- Acompanhamento de progresso

## 🛠️ Tecnologias

- **Next.js + TypeScript + Tailwind CSS**
- **Supabase** — login e banco de dados
- **Google Gemini** — geração dos roteiros
- **YouTube Data API** + **Google Books API** — recursos

## 🚀 Como rodar

### 1. Configurar as chaves de API
Edite o arquivo `.env.local` e cole suas chaves:
```
GEMINI_API_KEY=...
YOUTUBE_API_KEY=...
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

### 2. Configurar o banco no Supabase
No painel do Supabase, abra **SQL Editor > New query**, cole o conteúdo de
`supabase-setup.sql` e clique em **Run**.

### 3. Instalar e rodar
```bash
npm install
npm run dev
```
Abra http://localhost:3000

## 📁 Estrutura

```
study-planner/
├── app/            # páginas (login, dashboard, tema)
│   └── api/        # rotas que chamam a IA e as APIs de busca
├── lib/            # conexões (supabase, gemini, youtube, googlebooks)
├── supabase-setup.sql
└── .env.local      # suas chaves (não vai pro Git)
```
