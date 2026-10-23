const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");
// Compile the actual TypeScript modules for Node's test runner, without a second build tree.
require.extensions[".ts"] = (mod, file) =>
  mod._compile(
    ts.transpileModule(fs.readFileSync(file, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        esModuleInterop: true,
      },
    }).outputText,
    file,
  );
const Module = require("node:module");
const original = Module._resolveFilename;
Module._resolveFilename = function (request, parent, ...rest) {
  if (request.startsWith("@/"))
    request = require("node:path").resolve(__dirname, "..", request.slice(2));
  return original.call(this, request, parent, ...rest);
};
const {
  identificarTopicos,
  progresso,
  validarQuiz,
  validarPlano,
  validarCards,
} = require("../lib/models.ts");
const { horasDeDuracao, calcularCronograma } = require("../lib/cronograma.ts");
const { validarBackup } = require("../lib/backup.ts");
const {
  text,
  body,
  authorize,
  failure,
  ApiError,
} = require("../lib/api-server.ts");

test("reordenar tópicos mantém arquivos, sessões e arranjos nos mesmos slots", () => {
  const originais = identificarTopicos([
    { titulo: "A" },
    { titulo: "B" },
    { titulo: "C" },
  ]);
  const movidos = identificarTopicos([
    originais[2],
    originais[0],
    originais[1],
  ]);
  assert.deepEqual(
    movidos.map((t) => t.recursoIndex),
    [2, 0, 1],
  );
  assert.equal(movidos[0].id, originais[2].id);
});
test("tópicos duplicados ganham identidades e slots diferentes", () => {
  const a = identificarTopicos([{ titulo: "A" }])[0];
  const b = identificarTopicos([a, { ...a }]);
  assert.notEqual(b[0].id, b[1].id);
  assert.notEqual(b[0].recursoIndex, b[1].recursoIndex);
});
test("progresso vazio e após duplicação", () => {
  assert.equal(progresso([]), 0);
  assert.equal(progresso([{ concluido: true }, {}]), 50);
});
test("duração em minutos e horas mistas", () => {
  assert.equal(horasDeDuracao("30 minutos"), 0.5);
  assert.equal(horasDeDuracao("1h 30min"), 1.5);
  assert.equal(horasDeDuracao("2,5 horas"), 2.5);
});
test("cronograma respeita dias e divide um tópico longo sem exceder a carga", () => {
  const r = calcularCronograma(
    {
      topicos: [{ titulo: "A", duracaoEstimada: "6h" }],
      planejamento: { horasSemana: 4, diasSemana: [1, 3] },
    },
    new Date("2026-10-26T12:00:00"),
  );
  assert.deepEqual(
    r.dias.map((d) => d.itens[0].horas),
    [2, 2, 2],
  );
  assert.ok(r.dias.every((d) => [1, 3].includes(d.data.getDay())));
  assert.equal(r.inviavel, false);
});
test("prazo inviável deixa explícitas as horas não agendadas", () => {
  const r = calcularCronograma(
    {
      prazo: "2026-10-26",
      topicos: [{ titulo: "A", duracaoEstimada: "6h" }],
      planejamento: { horasSemana: 4, diasSemana: [1, 3] },
    },
    new Date("2026-10-26T12:00:00"),
  );
  assert.equal(r.inviavel, true);
  assert.equal(r.horasNaoAgendadas, 4);
  assert.equal(r.hoje[0].horas, 2);
});
test("dia livre não recebe tarefas", () => {
  const r = calcularCronograma(
    {
      topicos: [{ titulo: "A" }],
      planejamento: { diasSemana: [1], horasSemana: 4 },
    },
    new Date("2026-10-25T12:00:00"),
  );
  assert.deepEqual(r.hoje, []);
});
test("IA: rejeita quiz malformado e resposta incompleta", () => {
  assert.throws(() =>
    validarQuiz([
      { pergunta: "P", opcoes: ["A"], correta: 8, explicacao: "x" },
    ]),
  );
  assert.throws(() => validarPlano({ tema: "x", topicos: [] }));
  assert.throws(() => validarCards([{ frente: "x" }]));
  const q = {
    pergunta: "P",
    opcoes: ["a", "b", "c", "d"],
    correta: 0,
    explicacao: "x",
  };
  assert.deepEqual(validarQuiz([q]), [q]);
});
const backup = () => ({
  versao: 2,
  exportado_em: new Date().toISOString(),
  roteiros: [{ id: "r", tema: "Estudo", topicos: [{ titulo: "A" }] }],
  sessoes: [],
  arquivos: [],
});
test("backup: aceita v1 e v2, rejeita versões futuras e roteiros repetidos", () => {
  assert.equal(validarBackup(backup()).versao, 2);
  const b = backup();
  b.versao = 1;
  assert.equal(validarBackup(b).versao, 1);
  b.versao = 3;
  assert.throws(() => validarBackup(b));
  b.versao = 2;
  b.roteiros.push(b.roteiros[0]);
  assert.throws(() => validarBackup(b));
});
test("backup: rejeita sessão órfã e binário inválido antes de restaurar", () => {
  const b = backup();
  b.sessoes.push({
    roteiro_id: "outra",
    segundos: 30,
    criado_em: new Date().toISOString(),
  });
  assert.throws(() => validarBackup(b));
  b.sessoes = [];
  b.arquivos.push({
    origem: "local",
    roteiro_id: "r",
    topico_index: 0,
    tipo: "livro",
    nome: "x.pdf",
    mime: "application/pdf",
    dados: "%%%",
  });
  assert.throws(() => validarBackup(b));
});
test("API: valida tipo, tamanho e JSON", async () => {
  assert.throws(() => text({}, "Tema"));
  assert.throws(() => text("x".repeat(501), "Tema"));
  await assert.rejects(
    body(new Request("http://localhost", { method: "POST", body: "{" })),
    /inválido/,
  );
  await assert.rejects(
    body(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ x: "a".repeat(16001) }),
      }),
    ),
    /grande/,
  );
});
test("API: rejeita chamada anônima sem consultar provedor ou consumir cota", async () => {
  await assert.rejects(
    authorize(new Request("http://localhost")),
    (e) => e.status === 401,
  );
  const response = failure(new Error("segredo do provedor"));
  assert.equal(response.status, 502);
  assert.ok(!(await response.text()).includes("segredo"));
  assert.equal(failure(new ApiError("Limite", 429)).status, 429);
});

test("leitor EPUB mantém parsing XML com o parser atualizado", () => {
  const { parse } = require("epubjs/lib/utils/core");
  const xml = parse(
    '<package xmlns="http://www.idpf.org/2007/opf"><metadata><title>Estudo</title></metadata></package>',
    "application/xml",
    true,
  );
  assert.equal(xml.documentElement.localName, "package");
  assert.equal(xml.getElementsByTagName("title")[0].textContent, "Estudo");
});

test("roteiros antigos podem ser salvos sem a coluna versao, com comparação do JSON", async () => {
  const { atualizarRoteiro } = require("../lib/roteiros.ts");
  const filtros = [];
  const anterior = { topicos: [{ titulo: "Antigo" }] };
  const query = {
    update() {
      return this;
    },
    eq(k, v) {
      filtros.push([k, v]);
      return this;
    },
    select() {
      return this;
    },
    async single() {
      return { data: { topicos: [{ titulo: "Novo" }] }, error: null };
    },
  };
  const db = { from: () => query };
  await atualizarRoteiro(db, "id", { topicos: [{ titulo: "Novo" }] }, anterior);
  assert.deepEqual(filtros, [
    ["id", "id"],
    ["topicos", JSON.stringify(anterior.topicos)],
  ]);
});
test("banco atualizado usa versão e conflitos não viram sobrescritas", async () => {
  const { atualizarRoteiro } = require("../lib/roteiros.ts");
  const filtros = [];
  const query = {
    update() {
      return this;
    },
    eq(k, v) {
      filtros.push([k, v]);
      return this;
    },
    select() {
      return this;
    },
    async single() {
      return { data: null, error: { code: "PGRST116" } };
    },
  };
  await assert.rejects(
    atualizarRoteiro(
      { from: () => query },
      "id",
      { topicos: [] },
      { topicos: [], versao: 3 },
    ),
    /outra aba/,
  );
  assert.deepEqual(filtros, [
    ["id", "id"],
    ["versao", 3],
  ]);
});

const { acomodarBloco, organizarWorkspace } = require("../lib/workspace.ts");
const { colide, LAYOUT_PADRAO } = require("../lib/layout.ts");
test("workspace desloca colisões e mantém todos os blocos dentro da grade", () => {
  const result = acomodarBloco(LAYOUT_PADRAO, {
    ...LAYOUT_PADRAO[0],
    x: 9,
    w: 12,
    h: 12,
  });
  const visible = result.filter((b) => !b.oculto);
  assert.equal(result.length, LAYOUT_PADRAO.length);
  for (const b of visible) {
    assert.ok(b.x >= 0 && b.x + b.w <= 12);
    for (const c of visible)
      if (b.id !== c.id) assert.equal(colide(b, c), false);
  }
  assert.equal(result[0].x, 0);
  assert.deepEqual(LAYOUT_PADRAO[0].w, 8);
});
test("organização preserva blocos ocultos e usa largura total para último bloco", () => {
  const hidden = { ...LAYOUT_PADRAO[1], oculto: true };
  const input = [LAYOUT_PADRAO[0], hidden, LAYOUT_PADRAO[2], LAYOUT_PADRAO[3]];
  const result = organizarWorkspace(input);
  assert.deepEqual(result[1], hidden);
  assert.equal(result[3].w, 12);
  assert.equal(result[3].x, 0);
  assert.ok(result[3].y >= result[0].h);
});
