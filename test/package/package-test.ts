import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { execFile, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

// These tests exercise the compiled output in dist/ (built by the pretest script) through the
// package.json exports map, the same way an installed copy of the package is loaded. Node resolves
// the package name to the package itself when the specifier is used from inside the package.
const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const tsc = require.resolve('typescript/bin/tsc');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));

// A non-literal specifier keeps TypeScript from resolving the built types at type-check time,
// when dist/ may not exist yet
const packageName: string = '@postalsys/templates';

const HELPERS = ['formatDate', 'insert', 'length', 'greaterThan', 'lessThan', 'equals', 'notEquals', 'and', 'or'];

const hasDist = fs.existsSync(path.join(root, 'dist', 'cjs', 'templates.js')) && fs.existsSync(path.join(root, 'dist', 'esm', 'templates.js'));

// One template per format, rendered by both builds
const SAMPLES = [
    { format: 'html', template: '<b>{{a}}</b> {{formatDate d "YYYY-MM-DD HH:mm" "+0200"}} {{insert n "default=C"}}' },
    { format: 'plain', template: '{{a}}{{#equals b 100}} eq{{/equals}}{{#and a b}} and{{/and}}' },
    { format: 'markdown', template: '# {{a}} [x](javascript:alert(1)) {{#greaterThan (length l) 1}}many{{/greaterThan}}' }
];
const SAMPLE_DATA = { a: '*<x>*', b: '100', d: '2020-01-01T23:00:00.000Z', l: [1, 2] };

describe('Built package', { timeout: 120 * 1000, skip: hasDist ? false : 'dist/ is not built, run npm run build first' }, () => {
    it('ships both module formats with type declarations', () => {
        for (const format of ['esm', 'cjs']) {
            for (const file of ['templates.js', 'templates.d.ts']) {
                assert.ok(fs.existsSync(path.join(root, 'dist', format, file)), `${format}/${file}`);
            }
        }
        assert.deepEqual(JSON.parse(fs.readFileSync(path.join(root, 'dist', 'esm', 'package.json'), 'utf8')), { type: 'module' });
        assert.deepEqual(JSON.parse(fs.readFileSync(path.join(root, 'dist', 'cjs', 'package.json'), 'utf8')), { type: 'commonjs' });
    });

    it('points main, types and every exports entry at an existing file', () => {
        assert.equal(pkg.main, './dist/cjs/templates.js');
        assert.ok(fs.existsSync(path.join(root, pkg.types)));
        for (const [subpath, entry] of Object.entries(pkg.exports)) {
            const targets = typeof entry === 'string' ? [entry] : Object.values(entry as Record<string, string>);
            for (const target of targets) {
                assert.ok(fs.existsSync(path.join(root, target)), `${subpath} points at a missing file ${target}`);
            }
        }
    });

    it('keeps ES module syntax out of the CommonJS build', () => {
        // see the platform constraints in CLAUDE.md
        const cjs = fs.readFileSync(path.join(root, 'dist', 'cjs', 'templates.js'), 'utf8');
        assert.doesNotMatch(cjs, /\bimport\s*\(/);
        assert.doesNotMatch(cjs, /import\.meta/);
        assert.match(cjs, /require\("marked"\)/);
    });

    it('packs the build and leaves the sources and tests out', () => {
        // --ignore-scripts: prepare would rebuild dist/ under the running suite
        const result = spawnSync('npm', ['pack', '--dry-run', '--json', '--ignore-scripts'], { cwd: root, encoding: 'utf8' });
        assert.equal(result.status, 0, result.stderr);
        const files: string[] = JSON.parse(result.stdout)[0].files.map((file: { path: string }) => file.path);
        for (const required of [
            'package.json',
            'dist/cjs/templates.js',
            'dist/cjs/templates.d.ts',
            'dist/cjs/package.json',
            'dist/esm/templates.js',
            'dist/esm/package.json'
        ]) {
            assert.ok(files.includes(required), `${required} is packed`);
        }
        for (const file of files) {
            assert.ok(!/^(src|test|scripts|examples|coverage)\//.test(file), `${file} must not be packed`);
        }
    });

    describe('CommonJS build', () => {
        it('resolves require() to the CommonJS entry point', () => {
            assert.equal(require.resolve(packageName), path.join(root, 'dist', 'cjs', 'templates.js'));
        });

        it('keeps the shape of the pre-TypeScript module', () => {
            const templates = require(packageName);
            assert.deepEqual(Object.keys(templates), ['getTemplate']);
            assert.equal(typeof templates.getTemplate, 'function');
            // transpiled `import templates from '@postalsys/templates'` reads .default
            assert.equal(templates.default.getTemplate, templates.getTemplate);
            // destructuring, the way EmailEngine loads it
            const { getTemplate } = require(packageName);
            assert.equal(getTemplate({ format: 'html', template: '<b>{{a}}</b>' })({ a: '<x>' }), '<b>&lt;x&gt;</b>');
        });

        it('keeps the lib/ deep imports of the JavaScript package working', () => {
            const { getTemplate } = require(packageName);
            for (const name of [`${packageName}/lib/templates`, `${packageName}/lib/templates.js`]) {
                assert.equal(require(name).getTemplate, getTemplate, name);
            }
            assert.equal(require(`${packageName}/package.json`).name, packageName);
        });

        it('registers the helpers on the shared Handlebars instance', () => {
            require(packageName);
            const Handlebars = require('handlebars');
            for (const helper of HELPERS) {
                assert.equal(typeof Handlebars.helpers[helper], 'function', helper);
            }
        });
    });

    describe('ES module build', () => {
        it('resolves import to the ES module entry point', async () => {
            const direct = await import(new URL('../../dist/esm/templates.js', import.meta.url).href);
            const byName = await import(packageName);
            assert.equal(byName.getTemplate, direct.getTemplate);
            assert.notEqual(byName.getTemplate, require(packageName).getTemplate);
        });

        it('exposes named and default exports, as importing the CommonJS module did', async () => {
            const templates = await import(packageName);
            assert.deepEqual(Object.keys(templates).sort(), ['default', 'getTemplate']);
            assert.equal(templates.default.getTemplate, templates.getTemplate);
            assert.equal((await import(`${packageName}/lib/templates.js`)).getTemplate, templates.getTemplate);
        });
    });

    it('renders identically from both builds loaded into one process', () => {
        // Both builds register the helpers on the one shared handlebars module, the second load
        // replaces the first one's helpers with identical ones
        const script = `
            const Handlebars = require('handlebars');
            const cjs = require(${JSON.stringify(packageName)});
            const fromCjs = { ...Handlebars.helpers };
            import(${JSON.stringify(packageName)}).then(esm => {
                const samples = ${JSON.stringify(SAMPLES)};
                const data = ${JSON.stringify(SAMPLE_DATA)};
                console.log(JSON.stringify({
                    cjs: samples.map(sample => cjs.getTemplate(sample)(data)),
                    esm: samples.map(sample => esm.getTemplate(sample)(data)),
                    replaced: ${JSON.stringify(HELPERS)}.filter(name => fromCjs[name] !== Handlebars.helpers[name])
                }));
            });
        `;
        const result = spawnSync(process.execPath, ['-e', script], { cwd: root, encoding: 'utf8' });
        assert.equal(result.status, 0, result.stderr);
        const { cjs, esm, replaced } = JSON.parse(result.stdout);
        assert.deepEqual(esm, cjs);
        assert.deepEqual(cjs, [
            '<b>*&lt;x&gt;*</b> 2020-01-02 01:00 C',
            '*<x>* eq and',
            // the asterisks from the merge data stay literal
            '<h1>*&lt;x&gt;* x many</h1>\n'
        ]);
        assert.deepEqual(replaced, HELPERS);
    });

    // each tsc run has its own temporary project, so they run side by side
    describe('type declarations', { concurrency: true }, () => {
        const esmConsumer = `
import { getTemplate } from '@postalsys/templates';
import templates from '@postalsys/templates';
import type { TemplateOptions, TemplateRenderer } from '@postalsys/templates';

const options: TemplateOptions = { format: 'markdown', template: '# {{a}}', options: { breaks: true } };
const render: TemplateRenderer = getTemplate(options);
const html: string = render({ a: 1 });
const plain: string = templates.getTemplate('{{a}}')();
const format: string | undefined = undefined;
void [html, plain, getTemplate({ format, template: undefined })];
`;

        const cjsConsumer = `
import templates = require('@postalsys/templates');
import deep = require('@postalsys/templates/lib/templates');

export const text: string = templates.getTemplate({ format: 'html', template: '{{a}}' })({ a: 1 }) + deep.getTemplate('x')();
`;

        // Type-checks a consumer against the built declarations the way an installed copy is
        // resolved: the package is linked into a temporary project, so the specifier goes
        // through the package.json exports map
        const typeCheck = async (source: string, compilerOptions: Record<string, unknown>, type?: string): Promise<{ status: number; output: string }> => {
            const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'templates-types-'));
            try {
                fs.mkdirSync(path.join(dir, 'node_modules', '@postalsys'), { recursive: true });
                fs.mkdirSync(path.join(dir, 'node_modules', '@types'), { recursive: true });
                fs.symlinkSync(root, path.join(dir, 'node_modules', '@postalsys', 'templates'), 'dir');
                fs.symlinkSync(path.join(root, 'node_modules', '@types', 'node'), path.join(dir, 'node_modules', '@types', 'node'), 'dir');
                fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ name: 'consumer', private: true, ...(type ? { type } : {}) }));
                fs.writeFileSync(path.join(dir, 'consumer.ts'), source);
                fs.writeFileSync(
                    path.join(dir, 'tsconfig.json'),
                    JSON.stringify({
                        compilerOptions: {
                            target: 'ES2022',
                            lib: ['ES2023'],
                            types: ['node'],
                            strict: true,
                            exactOptionalPropertyTypes: true,
                            noEmit: true,
                            ...compilerOptions
                        },
                        include: ['consumer.ts']
                    })
                );
                return await new Promise(resolve => {
                    execFile(process.execPath, [tsc, '-p', path.join(dir, 'tsconfig.json')], (err, stdout, stderr) =>
                        resolve({ status: err ? Number(err.code) || 1 : 0, output: stdout + stderr })
                    );
                });
            } finally {
                fs.rmSync(dir, { recursive: true, force: true });
            }
        };

        const node16 = { module: 'node16', moduleResolution: 'node16' };

        for (const [label, options, type] of [
            ['a node16 ES module project', node16, 'module'],
            ['a node16 CommonJS project', node16, undefined],
            ['bundler resolution', { module: 'esnext', moduleResolution: 'bundler' }, 'module']
        ] as const) {
            it(`type-check an ES module style consumer in ${label}`, async () => {
                const { status, output } = await typeCheck(esmConsumer, { ...options, esModuleInterop: true }, type);
                assert.equal(status, 0, output);
            });
        }

        it('type-check a CommonJS consumer', async () => {
            const { status, output } = await typeCheck(cjsConsumer, node16);
            assert.equal(status, 0, output);
        });
    });
});
