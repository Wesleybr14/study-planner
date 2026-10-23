# Histórico de mudanças

## Migração 8 — limites e cota de vídeos

Execute `supabase-migration-8.sql` depois da 7. Ela limita o bucket `arquivos` a
PDF/EPUB de até 50 MB e cria uma cota própria para buscas de vídeo (30 por hora
por usuário): cada busca na YouTube Data API custa 100 das 10.000 unidades
diárias do projeto. As buscas externas (vídeos, livros e artigos) ficam em cache
por 1 dia e têm timeout de 8 s. A cota só é descontada depois que o pedido é
validado. Apagar todos os roteiros ou restaurar um backup substituindo os dados
também remove do Storage os arquivos que ficariam sem dono.

A variável opcional `GEMINI_MODELS` (lista separada por vírgulas) troca os
modelos do Gemini sem alterar o código.

## Confiabilidade e planejamento (migração 7)

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

## Modo Expandir

O espaço expandido mantém o conteúdo dos blocos ao alternar entre grade e foco. As abas superiores permitem focar um recurso; Esc restaura a grade e, na grade, fecha a expansão. Em **Editar layout**, arraste os títulos ou as bordas. Com o título em foco, use setas para mover e Shift + setas para redimensionar. **Organizar blocos** reorganiza a grade; **Desfazer** reverte a última alteração. No celular, os blocos aparecem em uma coluna.

Os ajustes são guardados imediatamente neste navegador, por usuário, e sincronizados com `preferencias.layout`. Se a sincronização falhar, um aviso permite tentar novamente e a cópia local é recuperada na próxima abertura.

## Sala de estudo

Abrir um roteiro retoma o último tópico neste navegador. A sala combina material principal (vídeos, livros, artigos e arquivos) com caderno lateral (notas, flashcards e quiz). O roteiro é recolhível, o caderno tem largura ajustável e o cronômetro fica no menu Tempo de foco. Concluir tópico e Anterior/Próximo permitem estudar sem voltar à lista. O Modo de blocos permanece disponível como alternativa.

A retomada local guarda o tópico, abas, seleção de material, largura do caderno e posição de EPUBs. Rascunhos de notas continuam protegidos pelo salvamento local existente. O minuto de vídeos e a página do visualizador PDF nativo ainda não são restaurados. No celular, Material e Caderno e prática alternam sem desmontar o conteúdo. Somente materiais visitados são carregados.
