'use strict';

// CommonJS smoke test for the built package, run by `npm run test:cjs` as plain Node with
// NODE_OPTIONS=--no-experimental-require-module. EmailEngine bundles this package into a
// @yao-pkg/pkg binary that can only load a CommonJS module graph, and Node 22+ enables
// require(esm) by default, which would hide an ES module reached through require() (marked 16 is
// the one that would bite). With the flag set, such a module throws ERR_REQUIRE_ESM here instead
// of in the binary. Kept as plain JavaScript on purpose: running it through tsx would let its
// loader transpile an ES module to CommonJS and mask exactly the failure this guards against.

const assert = require('node:assert/strict');
const path = require('node:path');

const root = path.resolve(__dirname, '..', '..');
const entry = path.join(root, 'dist', 'cjs', 'templates.js');

// The way EmailEngine loads it (lib/email-client/base-client.js)
const { getTemplate } = require('@postalsys/templates');
assert.strictEqual(require.resolve('@postalsys/templates'), entry);
assert.deepStrictEqual(Object.keys(require('@postalsys/templates')), ['getTemplate']);
for (const name of ['@postalsys/templates/lib/templates', '@postalsys/templates/lib/templates.js']) {
    assert.strictEqual(require(name).getTemplate, getTemplate, name);
}

// BaseClient.render() calls getTemplate({ format, template }) and renders the result with the merge data
const data = { name: '<Ben>', d: '2020-01-01T23:00:00.000Z', items: [1, 2] };
assert.strictEqual(
    getTemplate({ format: 'html', template: 'Hi {{insert name "default=you"}} {{formatDate d "YYYY-MM-DD HH:mm" "+0200"}}' })(data),
    'Hi &lt;Ben&gt; 2020-01-02 01:00'
);
assert.strictEqual(getTemplate({ format: 'plain', template: '{{name}}{{#greaterThan (length items) 1}} many{{/greaterThan}}' })(data), '<Ben> many');
// markdown goes through marked, the dependency held to its last CommonJS major
assert.strictEqual(getTemplate({ format: 'markdown', template: '*{{name}}* [x](javascript:alert(1))' })(data), '<p><em>&lt;Ben&gt;</em> x</p>\n');
assert.throws(() => getTemplate({ format: 'mjml', template: '' })(data), { code: 'NotSupported' });

console.log('CommonJS smoke test passed (' + process.version + ', ' + (process.env.NODE_OPTIONS || 'no NODE_OPTIONS') + ')');
