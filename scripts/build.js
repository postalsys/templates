// Builds the package.
//
// Compiles src/ twice with tsc: once as ES modules into dist/esm and once as CommonJS into
// dist/cjs. Each output directory gets its own package.json that pins the module format.
//
// src/templates.ts has a named getTemplate export and a default export object holding the same
// function. In the CommonJS output the default export is made non-enumerable, so
// `require('@postalsys/templates')` keeps the keys module.exports had (`getTemplate` only) while
// transpiled `import templates from '@postalsys/templates'` code can still read `.default`.

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const tsc = require.resolve('typescript/bin/tsc');

function runTsc(project, ...args) {
    const result = spawnSync(process.execPath, [tsc, '-p', project, ...args], { cwd: root, stdio: 'inherit' });
    if (result.status !== 0) {
        process.exit(result.status || 1);
    }
}

function hideCjsDefaultExport(file) {
    const source = fs.readFileSync(file, 'utf8');
    const assignment = /^exports\.default = (.*);$/m;
    if (!assignment.test(source)) {
        throw new Error(path.relative(root, file) + ': no default export assignment to rewrite');
    }
    fs.writeFileSync(
        file,
        source.replace(
            assignment,
            (_m, value) => `Object.defineProperty(exports, "default", { value: ${value}, enumerable: false, writable: true, configurable: true });`
        )
    );
}

fs.rmSync(path.join(root, 'dist'), { recursive: true, force: true });

runTsc('tsconfig.esm.json');
// The ES module compile has already type-checked the same sources
runTsc('tsconfig.cjs.json', '--noCheck');

fs.writeFileSync(path.join(root, 'dist', 'esm', 'package.json'), JSON.stringify({ type: 'module' }, null, 4) + '\n');
hideCjsDefaultExport(path.join(root, 'dist', 'cjs', 'templates.js'));

fs.writeFileSync(path.join(root, 'dist', 'cjs', 'package.json'), JSON.stringify({ type: 'commonjs' }, null, 4) + '\n');
