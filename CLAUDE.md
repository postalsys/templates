# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm test                  # run the full suite (node --test test/*-test.js)
npm run test:coverage     # the suite under c8
npm run lint              # eslint .
npm run lint:fix          # eslint . --fix
npm run format            # prettier --write .
npm run format:check      # prettier --check .
npm run update            # rm -rf node_modules package-lock.json && ncu -u && npm install
```

Run a single test file or a single test by name (Node's built-in test runner):

```bash
node --test test/templates-test.js
node --test --test-name-pattern="markdown filters unsafe" test/templates-test.js
```

The scripts in `examples/` are not tests; run them directly (`node examples/hbs.js`) to see rendered output.

## What this is

`@postalsys/templates` is the template language of EmailEngine: a thin wrapper around Handlebars that adds SendGrid-compatible helpers and a markdown output format. Its only consumer that matters is EmailEngine (`../emailengine`), which calls `getTemplate({ format, template })` from `BaseClient.render()` in `lib/email-client/base-client.js` to render the subject, text, html and preview text of mail-merge and templated sends. Template sources come from API callers and merge data from their recipients, so both are untrusted input.

## Architecture

Everything lives in `lib/templates.js`, which exports one function, `getTemplate(options)`:

- A string argument is a `plain` template. An object takes `template`, `format` (`html` default, `plain`, `markdown`, `mjml`) and `options` (passed to marked for `markdown`).
- The template is compiled once when `getTemplate()` is called, and the returned function renders it. Handlebars compiles lazily, so a syntax error still surfaces on the first render. A test pins that compilation happens once.
- `html` escapes merge values, `plain` does not (`noEscape`). `mjml` returns a renderer that throws `NotSupported`.
- Helpers are registered on the global Handlebars instance at require time: `formatDate`, `insert`, `length`, `greaterThan`, `lessThan`, `equals`, `notEquals`, `and`, `or`, each following the SendGrid helper of the same name (links in the source). `equals`/`notEquals` compare loosely on purpose (`'100'` equals `100`), hence the file-level eslint override.
- `formatDate` parses ISO 8601 and RFC 2822 strictly, falls back to `Date` parsing for anything else, and renders in UTC (or the given offset) so the output never depends on the process timezone. An invalid or missing date renders as an empty string.

### Markdown format: the security-sensitive part

Merge data must not be able to inject markdown syntax (links, images, emphasis) into a markdown template. A separate Handlebars environment (`markdownHandlebars`, sharing the global helpers and partials) uses a custom `JavaScriptCompiler` whose `appendEscaped` routes every `{{value}}` through `escapeMarkdown()`, which backslash-escapes markdown syntax and then HTML-escapes. `{{{value}}}` and `SafeString` values stay raw. The result is rendered by a `marked.Marked` instance whose `link` and `image` renderers drop URLs whose scheme (after decoding entities and stripping whitespace and control characters, as a browser would) is not on the allowlist: `http`, `https`, `mailto` for links, plus `cid` and `data` for images. Changes here deserve `/security-review`.

## Critical constraints

- **CommonJS only, never ESM.** EmailEngine is shipped as a single-file binary built with `@yao-pkg/pkg`, which cannot reliably load pure-ESM packages. This package and every dependency it pulls in must stay CommonJS-loadable. `.ncurc.js` holds `marked` to the 15.x line because 16.x is ESM-only; `npm run update` honors that. Do not add ESM-only dependencies.
- **Global helper registration.** The helpers are registered on the shared `handlebars` module, so anything else in the consuming process that requires `handlebars` sees them too (and can override them). Keep helper names compatible with SendGrid's.
- **Releases are automated via release-please.** The version in `package.json` and `CHANGELOG.md` are owned by the bot; do not bump them by hand. npm publication happens from `.github/workflows/release.yaml` when a release is created.

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
2. `npm test`
3. For non-trivial changes, consider `/simplify` (quality cleanup) and `/security-review`. Anything touching the markdown escaping or URL filtering is security-sensitive.

**After pushing**

- Check the workflow runs for the push (`gh run list --branch <branch>`) and report their status. If a run fails for an unrelated or infrastructure reason (checkout reporting "account suspended", HTTP 403, other auth errors), check https://www.githubstatus.com/ for an active GitHub incident before assuming the change caused it.
