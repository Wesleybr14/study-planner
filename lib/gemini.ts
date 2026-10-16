const GEMINI_KEY = process.env.GEMINI_API_KEY;

// Modelos em ordem de preferência. Se um estiver sobrecarregado/indisponível,
// o app tenta o próximo automaticamente. (A disponibilidade do nível gratuito
// varia, por isso mantemos vários.)
const MODELOS = [
  "gemini-3.5-flash-lite",
  "gemini-3.8-flash",
  "gemini-3.6-flash",
  "gemini-flash-latest",
  "gemini-flash-lite-latest",
];

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function chamarGemini(prompt: string): Promise<any> {
  if (!GEMINI_KEY) throw new Error("GEMINI_API_KEY não configurada no .env.local");

  const corpo = JSON.stringify({
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { responseMimeType: "application/json" },
  });

  let ultimoErro = "Erro desconhecido";

  for (const modelo of MODELOS) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent`;

    for (let tentativa = 1; tentativa <= 3; tentativa++) {
      let res: Response;
      try {
        res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-goog-api-key": GEMINI_KEY },
          body: corpo,
        });
      } catch (e: any) {
        ultimoErro = `Falha de conexão: ${e.message}`;
        await sleep(tentativa * 1500);
        continue;
      }

      if (res.ok) {
        const data = await res.json();
        const texto = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!texto) throw new Error("Gemini não retornou conteúdo");
        return JSON.parse(texto);
      }

      const detalhe = await res.text();

      // 503/429 = servidor sobrecarregado ou limite de uso -> tenta de novo
      if (res.status === 503 || res.status === 429) {
        ultimoErro = res.status === 429
          ? "Limite de uso gratuito atingido. Aguarde um minuto e tente novamente."
          : "O serviço da IA está sobrecarregado no momento.";
        await sleep(tentativa * 2000);
        continue;
      }

      // 404 = modelo indisponível -> tenta o próximo modelo
      if (res.status === 404) {
        ultimoErro = `Modelo ${modelo} indisponível`;
        break;
      }

      // Outros erros são permanentes (ex.: chave inválida)
      throw new Error(`Erro do Gemini (${res.status}): ${detalhe}`);
    }
  }

  throw new Error(ultimoErro);
}

export async function gerarRoteiro(tema: string) {
  const prompt = `Você é um professor especialista. Crie um roteiro de estudo completo sobre o tema: "${tema}".

Responda APENAS com um JSON válido, sem texto fora dele, no formato:
{
  "tema": "${tema}",
  "descricao": "uma frase sobre o tema",
  "topicos": [
    {
      "titulo": "nome do tópico",
      "nivel": "iniciante|intermediario|avancado",
      "descricao": "o que se estuda neste tópico",
      "duracaoEstimada": "ex: 4 horas",
      "buscaVideos": "termo curto de busca para youtube",
      "buscaLivros": "termo curto de busca para livros"
    }
  ]
}

Crie entre 6 e 10 tópicos, do básico ao avançado, em ordem lógica de aprendizado.`;

  return chamarGemini(prompt);
}

export async function gerarFlashcards(titulo: string, descricao: string) {
  const prompt = `Você é um professor. Crie 5 flashcards de revisão sobre o tópico "${titulo}".
Contexto do tópico: ${descricao}

Cada flashcard tem uma pergunta (frente) e uma resposta curta (verso).

Responda APENAS com um JSON válido, sem texto fora dele, no formato:
{
  "flashcards": [
    { "frente": "pergunta", "verso": "resposta" }
  ]
}`;

  const resultado = await chamarGemini(prompt);
  return resultado?.flashcards ?? [];
}

export async function gerarQuiz(titulo: string, descricao: string) {
  const prompt = `Você é um professor. Crie um quiz de 4 perguntas de múltipla escolha sobre o tópico "${titulo}".
Contexto do tópico: ${descricao}

Cada pergunta deve ter 4 alternativas, sendo apenas uma correta.

Responda APENAS com um JSON válido, sem texto fora dele, no formato:
{
  "perguntas": [
    {
      "pergunta": "texto da pergunta",
      "opcoes": ["alternativa A", "alternativa B", "alternativa C", "alternativa D"],
      "correta": 0,
      "explicacao": "por que essa alternativa é a correta"
    }
  ]
}

O campo "correta" é o índice (0 a 3) da alternativa certa.`;

  const resultado = await chamarGemini(prompt);
  return resultado?.perguntas ?? [];
}
