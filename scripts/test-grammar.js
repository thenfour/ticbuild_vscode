const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const oniguruma = require("vscode-oniguruma");
const textmate = require("vscode-textmate");

const luaScope = "source.lua";
const extensionRoot = path.join(__dirname, "..");
const extensionManifest = JSON.parse(fs.readFileSync(path.join(extensionRoot, "package.json"), "utf8"));
const grammarContribution = extensionManifest.contributes.grammars.find(
  (candidate) => candidate.scopeName === "source.ticbuild.preproc.injection",
);
assert.ok(grammarContribution, "Extension manifest should contribute the ticbuild preprocessor grammar");
assert.ok(grammarContribution.injectTo.includes(luaScope), "Preprocessor grammar should inject into Lua");
const injectionScope = grammarContribution.scopeName;

const luaGrammarFixture = {
  scopeName: luaScope,
  patterns: [
    { include: "#comments" },
    { match: "\\b(?:function|local|return)\\b", name: "keyword.control.lua" },
    { match: "[A-Za-z_][A-Za-z0-9_]*", name: "variable.other.lua" },
  ],
  repository: {
    comments: {
      patterns: [
        {
          begin: "(--)",
          beginCaptures: {
            1: { name: "punctuation.definition.comment.lua" },
          },
          end: "$",
          name: "comment.line.double-dash.lua",
        },
      ],
    },
  },
};

async function createGrammar() {
  const wasm = fs.readFileSync(require.resolve("vscode-oniguruma/release/onig.wasm"));
  await oniguruma.loadWASM(wasm.buffer.slice(wasm.byteOffset, wasm.byteOffset + wasm.byteLength));

  const injectionPath = path.join(extensionRoot, grammarContribution.path);
  const injectionGrammar = textmate.parseRawGrammar(fs.readFileSync(injectionPath, "utf8"), injectionPath);
  const luaGrammar = textmate.parseRawGrammar(JSON.stringify(luaGrammarFixture), "lua.tmLanguage.json");

  const registry = new textmate.Registry({
    onigLib: Promise.resolve({
      createOnigScanner: (sources) => new oniguruma.OnigScanner(sources),
      createOnigString: (source) => new oniguruma.OnigString(source),
    }),
    loadGrammar: async (scopeName) => {
      if (scopeName === luaScope) {
        return luaGrammar;
      }
      if (scopeName === injectionScope) {
        return injectionGrammar;
      }
      return null;
    },
    getInjections: (scopeName) => scopeName === luaScope ? [injectionScope] : undefined,
  });

  const grammar = await registry.loadGrammar(luaScope);
  assert.ok(grammar, "Lua grammar should load");
  return grammar;
}

function tokenAt(grammar, line, index) {
  const tokens = grammar.tokenizeLine(line).tokens;
  const token = tokens.find((candidate) => candidate.startIndex <= index && index < candidate.endIndex);
  assert.ok(token, `Expected a token at index ${index} in ${JSON.stringify(line)}`);
  return token;
}

function assertHasScope(grammar, line, text, scope) {
  const index = line.indexOf(text);
  assert.notEqual(index, -1, `Expected ${JSON.stringify(text)} in ${JSON.stringify(line)}`);
  const token = tokenAt(grammar, line, index);
  assert.ok(
    token.scopes.includes(scope),
    `Expected ${JSON.stringify(text)} in ${JSON.stringify(line)} to have ${scope}; got ${token.scopes.join(", ")}`,
  );
}

function assertLacksScope(grammar, line, text, scope) {
  const index = line.indexOf(text);
  assert.notEqual(index, -1, `Expected ${JSON.stringify(text)} in ${JSON.stringify(line)}`);
  const token = tokenAt(grammar, line, index);
  assert.ok(
    !token.scopes.includes(scope),
    `Expected ${JSON.stringify(text)} in ${JSON.stringify(line)} not to have ${scope}; got ${token.scopes.join(", ")}`,
  );
}

async function main() {
  const grammar = await createGrammar();
  const supportedDirectives = [
    "macro",
    "endmacro",
    "minify",
    "define",
    "undef",
    "if",
    "ifdef",
    "ifndef",
    "else",
    "endif",
    "pragma",
    "include",
    "error",
    "warning",
  ];

  for (const directive of supportedDirectives) {
    const line = `  --#  ${directive} payload`;
    assertHasScope(grammar, line, directive, "meta.preprocessor.ticbuild.directive");
    assertHasScope(grammar, line, "--#", "punctuation.definition.comment.lua");
  }

  const macro = "--#macro FLOORDIV(a,b) => a//b -- with a comment";
  assertHasScope(grammar, macro, "FLOORDIV", "meta.preprocessor.ticbuild");
  assertLacksScope(grammar, macro, "FLOORDIV", "variable.other.lua");
  assertHasScope(grammar, macro, "//", "meta.preprocessor.ticbuild");
  assertLacksScope(grammar, macro, "//", "comment.line.double-dash.lua");
  assertHasScope(grammar, macro, "-- with", "comment.line.double-dash.lua");
  assertHasScope(grammar, macro, "-- with", "punctuation.definition.comment.lua");

  const warning = "--#warning message -- this is part of the message";
  assertHasScope(grammar, warning, "message", "string.quoted.double.lua");
  assertHasScope(grammar, warning, "-- this", "string.quoted.double.lua");
  assertLacksScope(grammar, warning, "-- this", "comment.line.double-dash.lua");

  for (const unsupported of ["elif", "elseif", "IF", "iffoo", "unknown"]) {
    const line = `--#${unsupported} payload`;
    assertHasScope(grammar, line, "--#", "comment.line.double-dash.lua");
    assertLacksScope(grammar, line, "--#", "meta.preprocessor.ticbuild");
  }

  const regularComment = "-- ordinary Lua comment";
  assertHasScope(grammar, regularComment, "ordinary", "comment.line.double-dash.lua");
  assertLacksScope(grammar, regularComment, "ordinary", "meta.preprocessor.ticbuild");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
