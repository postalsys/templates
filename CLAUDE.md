# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run build             # produce dist/ (also runs on install and before publish via `prepare`)
npm test                  # build, then run the suite (node --import tsx --test)
npm run test:coverage     # the suite under c8 (src/ only, .c8rc.json)
npm run test:cjs          # build, then the CommonJS smoke test with require(esm) disabled
npm run typecheck         # tsc over src/ and test/
npm run lint              # typecheck, then eslint .
npm run lint:fix          # eslint . --fix
npm run format            # prettier --write (js, cjs, ts, json, md, yml, yaml)
npm run format:check      # prettier --check
npm run update            # rm -rf node_modules package-lock.json && ncu -u && npm install
```

Run a single test file or a single test by name (Node's built-in test runner through tsx):

```bash
node --import tsx --test test/templates-test.ts
node --import tsx --test --test-name-pattern="markdown filters unsafe" test/templates-test.ts
```

The scripts in `examples/` are not tests; run them directly (`node examples/hbs.js`) to see rendered output. They are CommonJS (`examples/package.json` pins the format) and require the package by its root, so they load the built `dist/cjs` entry: run `npm run build` first.

## What this is

`@postalsys/templates` is the template language of EmailEngine: a thin wrapper around Handlebars that adds SendGrid-compatible helpers and a markdown output format. Its only consumer that matters is EmailEngine (`../emailengine`), which calls `getTemplate({ format, template })` from `BaseClient.render()` in `lib/email-client/base-client.js` to render the subject, text, html and preview text of mail-merge and templated sends. Template sources come from API callers and merge data from their recipients, so both are untrusted input.

## Architecture

The package is written in TypeScript and published as a dual package: ES modules in `dist/esm/` and CommonJS in `dist/cjs/`, each with type declarations. The layout follows `../pubface` (and, before it, `../nodemailer` and `../imapflow`).

- `src/templates.ts` - all of the code. Exports `getTemplate`, the `TemplateOptions` and `TemplateRenderer` types, and a default export object `{ getTemplate }`.
- `scripts/build.js` - runs `tsc` with `tsconfig.esm.json` (type-checks) and `tsconfig.cjs.json` (`--noCheck`), writes a `package.json` pinning the module format into each output directory, and rewrites the CommonJS `exports.default` assignment into a non-enumerable property. That keeps `require('@postalsys/templates')` returning an object whose only key is `getTemplate`, as `module.exports = { getTemplate }` did, while transpiled `import templates from '@postalsys/templates'` code can still read `.default`.
- `package.json` `exports` keeps every path the JavaScript package could be required by: `.`, `./lib/templates`, `./lib/templates.js` (all pointing at `dist/`) and `./package.json`. `typesVersions` maps `lib/*` to the declarations for older TypeScript resolution.
- `dist/` is build output, gitignored, and is what gets published (`files`).
- `test/templates-test.ts` tests the source; `test/package/package-test.ts` checks the built `dist/` through the exports map (shape of both builds, deep imports, the packed file list, both builds loaded into one process, consumer type-checks); `test/package/cjs-smoke.cjs` is the `test:cjs` script, plain JavaScript on purpose so tsx cannot mask an ES module dependency.

`getTemplate(options)`:

- A string argument is a `plain` template. An object takes `template`, `format` (`html` default, `plain`, `markdown`, `mjml`) and `options` (passed to marked for `markdown`).
- The template is compiled once when `getTemplate()` is called, and the returned function renders it. Handlebars compiles lazily, so a syntax error still surfaces on the first render. A test pins that compilation happens once.
- `html` escapes merge values, `plain` does not (`noEscape`). `mjml` returns a renderer that throws `NotSupported`.
- Helpers are registered on the global Handlebars instance at load time: `formatDate`, `insert`, `length`, `greaterThan`, `lessThan`, `equals`, `notEquals`, `and`, `or`, each following the SendGrid helper of the same name (links in the source). `equals`/`notEquals` compare loosely on purpose (`'100'` equals `100`), hence the file-level eslint override.
- `formatDate` takes moment format strings, as SendGrid's does, so `moment` is part of the template language and stays a dependency. It parses ISO 8601 and RFC 2822 strictly, falls back to `Date` parsing for anything else, and renders in UTC (or the given offset) so the output never depends on the process timezone. An invalid or missing date renders as an empty string.

### Markdown format: the security-sensitive part

Merge data must not be able to inject markdown syntax (links, images, emphasis) into a markdown template. A separate Handlebars environment (`markdownHandlebars`, sharing the global helpers and partials) uses a custom `JavaScriptCompiler` whose `appendEscaped` routes every `{{value}}` through `escapeMarkdown()`, which backslash-escapes markdown syntax and then HTML-escapes. `{{{value}}}` and `SafeString` values stay raw. The result is rendered by a `marked.Marked` instance whose `link` and `image` renderers drop URLs whose scheme (after decoding entities and stripping whitespace and control characters, as a browser would) is not on the allowlist: `http`, `https`, `mailto` for links, plus `cid` and `data` for images. Changes here deserve `/security-review`.

## Module format

- Source uses ES module syntax and compiles both ways, so `src/` must not use `import.meta`, `require`, `module`, `exports`, `__dirname`, `__filename`, top-level `await`, or JSON imports. Relative imports carry the `.js` extension.
- `tsconfig.base.json` is strict with `exactOptionalPropertyTypes`, `erasableSyntaxOnly` (no enums, namespaces with runtime code, or parameter properties) and `stripInternal`. `@types/node` stays on the 20.x line and `typescript` on 6.x (`.ncurc.cjs`).
- Declare public API functions in `src/templates.ts` itself, not as re-exports: tsc emits a re-export as a getter, which a CommonJS consumer cannot overwrite.
- Every optional property of a public interface carries an explicit `| undefined`.
- Helper registration is a side effect of loading the module. Each build registers once (the module cache sees to that). A process that loads both `dist/cjs` and `dist/esm` shares one `handlebars` module (its only entry is CommonJS), so the second load replaces the nine helpers with identical functions; rendering does not change, but a helper the consuming process overrode in between is reset. `test/package/package-test.ts` pins both facts.

## Platform constraints

EmailEngine ships as a single-file binary built with `@yao-pkg/pkg`. That binary snapshots a CommonJS module graph and cannot load ES modules, and EmailEngine supports Node 20 and later. Two rules follow:

- **Node.js 20 is the minimum.** Runtime code, tests and tooling must work on Node 20, 22 and 24 (`engines.node` is `>=20.0.0`; CI runs all three).
- **Everything that reaches runtime must be genuinely CommonJS.** `require()` of this package and of every dependency it pulls in must work with `--no-experimental-require-module`: Node 22+ (and 20.19) load ESM through `require()` by default, which would hide an ESM-only dependency until the pkg binary fails. A CJS wrapper around a dynamic `import()` does not count. Never add or upgrade to an ESM-only dependency; pin the last CommonJS major in `.ncurc.cjs` (`reject` or `target`) with a comment giving the reason. `.ncurc.cjs` holds `marked` to the 15.x line because 16.x is ESM-only; `npm run update` honors that.

Keep the dual build: never drop the CommonJS output or make the CommonJS entry depend on ES module code (a wrapper around `import()` does not count).

Check with `npm run test:cjs`, which builds and runs `test/package/cjs-smoke.cjs` under `NODE_OPTIONS=--no-experimental-require-module`, requiring the package the way EmailEngine does and rendering every format. CI runs it on Node 22.x, 24.x and latest, the versions where require(esm) is on by default.

## Critical constraints

- **Global helper registration.** The helpers are registered on the shared `handlebars` module, so anything else in the consuming process that requires `handlebars` sees them too (and can override them). Keep helper names compatible with SendGrid's.
- **Releases are automated via release-please.** The version in `package.json` and `CHANGELOG.md` are owned by the bot; do not bump them by hand. npm publication happens from `.github/workflows/release.yaml` when a release is created; its `npm ci` runs `prepare`, which builds `dist/`, so the build output is never committed.

## Conventions

These mirror the conventions used across Postal Systems projects (see `../emailengine`).

**Git commits**

- Use Conventional Commits: `fix:` (patch release), `feat:` (minor release), and `chore:`/`docs:`/`ci:`/`refactor:`/`test:`/`build:`/`style:` for changes that should not trigger a release. release-please derives the version and changelog from these prefixes.
- Do **not** list Claude or any AI assistant as a co-author or co-contributor in commit messages or PR descriptions (no `Co-Authored-By` trailer).
- Append `[skip ci]` to commits that do not change runtime behavior (docs, comments, CI/workflow tweaks, formatting) to avoid spending CI minutes. Exception: never add `[skip ci]` to a `fix:` or `feat:` commit, those must run so the release workflow triggers. GitHub reads the marker off the HEAD commit of a push, so when a push mixes the two, the release-triggering commit has to be last.

**Code and docs style**

- No emojis anywhere in code or documentation, printable ASCII only.
- Use a single hyphen-minus (`-`) as a dash in user-facing strings and docs. Never use double hyphens, em dashes, or en dashes.

**Before committing code changes**

1. `npm run format` and `npm run lint`
2. `npm test` and `npm run test:cjs`
3. For non-trivial changes, consider `/simplify` (quality cleanup) and `/security-review`. Anything touching the markdown escaping or URL filtering is security-sensitive.

**After pushing**

- Check the workflow runs for the push (`gh run list --branch <branch>`) and report their status. If a run fails for an unrelated or infrastructure reason (checkout reporting "account suspended", HTTP 403, other auth errors), check https://www.githubstatus.com/ for an active GitHub incident before assuming the change caused it.
