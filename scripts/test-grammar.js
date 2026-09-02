const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const oniguruma = require("vscode-oniguruma");
const textmate = require("vscode-textmate");

const extensionRoot = path.join(__dirname, "..");
const markdownScope = "text.html.markdown";
const extensionManifest = JSON.parse(fs.readFileSync(path.join(extensionRoot, "package.json"), "utf8"));
const grammarContribution = extensionManifest.contributes.grammars.find(
  (candidate) => candidate.scopeName === "source.ticbuild.preproc.injection",
);
assert.ok(grammarContribution, "Extension manifest should contribute the ticbuild preprocessor grammar");
const injectionScope = grammarContribution.scopeName;

const hostConfigurations = [
  {
    scopeName: "source.lua",
    commentMarker: "--",
    commentScope: "comment.line.double-dash.lua",
    punctuationScope: "punctuation.definition.comment.lua",
    variableScope: "variable.other.lua",
    directivePrefix: "--#",
    embeddedScope: "meta.embedded.block.lua",
    fenceLanguage: "lua",
  },
  {
    scopeName: "source.ts",
    commentMarker: "//",
    commentScope: "comment.line.double-slash.ts",
    punctuationScope: "punctuation.definition.comment.ts",
    variableScope: "variable.other.ts",
    directivePrefix: "//#",
    embeddedScope: "meta.embedded.block.typescript",
    fenceLanguage: "typescript",
  },
  {
    scopeName: "source.tsx",
    commentMarker: "//",
    commentScope: "comment.line.double-slash.ts",
    punctuationScope: "punctuation.definition.comment.ts",
    variableScope: "variable.other.tsx",
    directivePrefix: "//#",
    embeddedScope: "meta.embedded.block.typescriptreact",
    fenceLanguage: "tsx",
  },
];

for (const host of hostConfigurations) {
  assert.ok(
    grammarContribution.injectTo.includes(host.scopeName),
    `Preprocessor grammar should inject into ${host.scopeName}`,
  );
}
assert.ok(grammarContribution.injectTo.includes(markdownScope), "Preprocessor grammar should inject into Markdown");

function createHostGrammarFixture(host) {
  return {
    scopeName: host.scopeName,
    patterns: [
      { include: "#comments" },
      { match: "[A-Za-z_][A-Za-z0-9_]*", name: host.variableScope },
    ],
    repository: {
      comments: {
        patterns: [
          {
            begin: `(${host.commentMarker})`,
            beginCaptures: {
              1: { name: host.punctuationScope },
            },
            end: "$",
            name: host.commentScope,
          },
        ],
      },
    },
  };
}

function createMarkdownGrammarFixture(host) {
  const embeddedHost = createHostGrammarFixture(host);
  return {
    scopeName: markdownScope,
    patterns: [
      {
        begin: `^\`\`\`${host.fenceLanguage}\\s*$`,
        end: "^```\\s*$",
        name: "markup.fenced_code.block.markdown",
        contentName: host.embeddedScope,
        patterns: embeddedHost.patterns,
      },
    ],
    repository: embeddedHost.repository,
  };
}

async function createGrammarFromFixture(scopeName, hostGrammarFixture, fixtureFileName) {

  const injectionPath = path.join(extensionRoot, grammarContribution.path);
  const injectionGrammar = textmate.parseRawGrammar(fs.readFileSync(injectionPath, "utf8"), injectionPath);
  const hostGrammar = textmate.parseRawGrammar(
    JSON.stringify(hostGrammarFixture),
    fixtureFileName,
  );

  const registry = new textmate.Registry({
    onigLib: Promise.resolve({
      createOnigScanner: (sources) => new oniguruma.OnigScanner(sources),
      createOnigString: (source) => new oniguruma.OnigString(source),
    }),
    loadGrammar: async (requestedScopeName) => {
      if (requestedScopeName === scopeName) {
        return hostGrammar;
      }
      if (requestedScopeName === injectionScope) {
        return injectionGrammar;
      }
      return null;
    },
    getInjections: (requestedScopeName) => requestedScopeName === scopeName ? [injectionScope] : undefined,
  });

  const grammar = await registry.loadGrammar(scopeName);
  assert.ok(grammar, `${scopeName} grammar should load`);
  return grammar;
}

async function createGrammar(host) {
  return createGrammarFromFixture(
    host.scopeName,
    createHostGrammarFixture(host),
    `${host.scopeName}.tmLanguage.json`,
  );
}

function tokenAt(grammar, line, index) {
  return tokenFromTokens(grammar.tokenizeLine(line).tokens, line, index);
}

function tokenFromTokens(tokens, line, index) {
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

function testHostGrammar(grammar, host) {
  for (const directive of supportedDirectives) {
    const line = `  ${host.directivePrefix}  ${directive} payload`;
    assertHasScope(grammar, line, directive, "meta.preprocessor.ticbuild.directive");
    assertHasScope(grammar, line, host.directivePrefix, host.punctuationScope);
  }

  const macro = `${host.directivePrefix}macro FLOORDIV(a,b) => a//b -- with a comment`;
  assertHasScope(grammar, macro, "FLOORDIV", "meta.preprocessor.ticbuild");
  assertLacksScope(grammar, macro, "FLOORDIV", host.variableScope);
  const floorDivisionIndex = macro.indexOf("a//b") + 1;
  const floorDivisionToken = tokenAt(grammar, macro, floorDivisionIndex);
  assert.ok(floorDivisionToken.scopes.includes("meta.preprocessor.ticbuild"));
  assert.ok(!floorDivisionToken.scopes.includes(host.commentScope));
  assertHasScope(grammar, macro, "-- with", "comment.line.double-dash.lua");
  assertHasScope(grammar, macro, "-- with", "punctuation.definition.comment.lua");

  const warning = `${host.directivePrefix}warning message -- this is part of the message`;
  assertHasScope(grammar, warning, "message", "string.quoted.double.lua");
  assertHasScope(grammar, warning, "-- this", "string.quoted.double.lua");
  assertLacksScope(grammar, warning, "-- this", "comment.line.double-dash.lua");

  for (const unsupported of ["elif", "elseif", "IF", "iffoo", "unknown"]) {
    const line = `${host.directivePrefix}${unsupported} payload`;
    assertHasScope(grammar, line, host.directivePrefix, host.commentScope);
    assertLacksScope(grammar, line, host.directivePrefix, "meta.preprocessor.ticbuild");
  }

  const regularComment = `${host.commentMarker} ordinary comment`;
  assertHasScope(grammar, regularComment, "ordinary", host.commentScope);
  assertLacksScope(grammar, regularComment, "ordinary", "meta.preprocessor.ticbuild");

  const inlineComment = `value = 1 ${host.commentMarker} ordinary inline comment`;
  assertHasScope(grammar, inlineComment, "ordinary", host.commentScope);
  assertLacksScope(grammar, inlineComment, "ordinary", "meta.preprocessor.ticbuild");
}

async function testMarkdownFence(host) {
  const grammar = await createGrammarFromFixture(
    markdownScope,
    createMarkdownGrammarFixture(host),
    `${host.fenceLanguage}-markdown.tmLanguage.json`,
  );

  const openingFence = `\`\`\`${host.fenceLanguage}`;
  let ruleStack = grammar.tokenizeLine(openingFence, textmate.INITIAL).ruleStack;
  const macro = `${host.directivePrefix}macro FLOORDIV(a,b) => a//b -- with a comment`;
  const macroResult = grammar.tokenizeLine(macro, ruleStack);
  ruleStack = macroResult.ruleStack;

  const prefixToken = tokenFromTokens(macroResult.tokens, macro, macro.indexOf(host.directivePrefix));
  assert.ok(prefixToken.scopes.includes("meta.preprocessor.ticbuild"));
  assert.ok(prefixToken.scopes.includes(host.punctuationScope));

  const floorDivisionToken = tokenFromTokens(macroResult.tokens, macro, macro.indexOf("a//b") + 1);
  assert.ok(floorDivisionToken.scopes.includes("meta.preprocessor.ticbuild"));
  assert.ok(!floorDivisionToken.scopes.includes(host.commentScope));

  const trailingCommentToken = tokenFromTokens(macroResult.tokens, macro, macro.indexOf("-- with"));
  assert.ok(trailingCommentToken.scopes.includes("comment.line.double-dash.lua"));

  const ordinaryComment = `${host.commentMarker} ordinary embedded comment`;
  const ordinaryResult = grammar.tokenizeLine(ordinaryComment, ruleStack);
  const ordinaryToken = tokenFromTokens(ordinaryResult.tokens, ordinaryComment, ordinaryComment.indexOf("ordinary"));
  assert.ok(ordinaryToken.scopes.includes(host.commentScope));
  assert.ok(!ordinaryToken.scopes.includes("meta.preprocessor.ticbuild"));
}

async function main() {
  const wasm = fs.readFileSync(require.resolve("vscode-oniguruma/release/onig.wasm"));
  await oniguruma.loadWASM(wasm.buffer.slice(wasm.byteOffset, wasm.byteOffset + wasm.byteLength));

  for (const host of hostConfigurations) {
    const grammar = await createGrammar(host);
    testHostGrammar(grammar, host);

    if (host.scopeName !== "source.lua") {
      const legacy = "//--#macro FLOORDIV(a,b) => a//b -- with a comment";
      assertHasScope(grammar, legacy, "//--#", host.punctuationScope);
      assertHasScope(grammar, legacy, "macro", "meta.preprocessor.ticbuild.directive");
      assertHasScope(grammar, legacy, "-- with", "comment.line.double-dash.lua");
    }

    await testMarkdownFence(host);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
