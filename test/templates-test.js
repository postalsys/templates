'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { getTemplate } = require('..');

test('html without variables', () => {
    let template = getTemplate(`<h1>Hello world</h1>`);
    assert.equal(template(), `<h1>Hello world</h1>`);
});

test('html with variable', () => {
    let template = getTemplate(`<h1>Hello {{ name }}</h1>`);
    assert.equal(template({ name: 'world' }), `<h1>Hello world</h1>`);
});

test('html without default override', () => {
    let template = getTemplate(`<h1>Hello {{ insert name "default=Customer"}}</h1>`);
    assert.equal(template({ name: 'world' }), `<h1>Hello world</h1>`);
});

test('html with default override', () => {
    let template = getTemplate(`<h1>Hello {{ insert name "default=Customer"}}</h1>`);
    assert.equal(template({}), `<h1>Hello Customer</h1>`);
});

test('html with formatDate', () => {
    let template = getTemplate(`<h1>Hello {{formatDate timeStamp dateFormat}}</h1>`);
    assert.equal(
        template({
            timeStamp: '2020-01-01T23:00:00.000Z',
            dateFormat: 'MMMM DD, YYYY h:mm:ss A',
            timezoneOffset: '-0800'
        }),
        `<h1>Hello January 01, 2020 11:00:00 PM</h1>`
    );
});

test('html with formatDate and offset', () => {
    let template = getTemplate(`<h1>Hello {{formatDate timeStamp dateFormat timezoneOffset}}</h1>`);
    assert.equal(
        template({
            timeStamp: '2020-01-01T23:00:00.000Z',
            dateFormat: 'MMMM DD, YYYY h:mm:ss A',
            timezoneOffset: '-0800'
        }),
        `<h1>Hello January 01, 2020 3:00:00 PM</h1>`
    );
});

test('html with valid greaterThan', () => {
    let template = getTemplate(`<h1>Hello {{#greaterThan a b}}world{{/greaterThan}}</h1>`);
    assert.equal(
        template({
            a: 100,
            b: 10
        }),
        `<h1>Hello world</h1>`
    );
});

test('html with invalid greaterThan', () => {
    let template = getTemplate(`<h1>Hello {{#greaterThan a b}}world{{/greaterThan}}</h1>`);
    assert.equal(
        template({
            a: 10,
            b: 100
        }),
        `<h1>Hello </h1>`
    );
});

test('html with greaterThan else', () => {
    let template = getTemplate(`<h1>Hello {{#greaterThan a b}}world{{else}}you{{/greaterThan}}</h1>`);
    assert.equal(
        template({
            a: 10,
            b: 100
        }),
        `<h1>Hello you</h1>`
    );
});

test('html with valid lessThan', () => {
    let template = getTemplate(`<h1>Hello {{#lessThan a b}}world{{/lessThan}}</h1>`);
    assert.equal(
        template({
            a: 10,
            b: 100
        }),
        `<h1>Hello world</h1>`
    );
});

test('html with invalid lessThan', () => {
    let template = getTemplate(`<h1>Hello {{#lessThan a b}}world{{/lessThan}}</h1>`);
    assert.equal(
        template({
            a: 100,
            b: 10
        }),
        `<h1>Hello </h1>`
    );
});

test('html with lessThan else', () => {
    let template = getTemplate(`<h1>Hello {{#lessThan a b}}world{{else}}you{{/lessThan}}</h1>`);
    assert.equal(
        template({
            a: 100,
            b: 10
        }),
        `<h1>Hello you</h1>`
    );
});

test('html with valid equals', () => {
    let template = getTemplate(`<h1>Hello {{#equals a b}}world{{/equals}}</h1>`);
    assert.equal(
        template({
            a: '100',
            b: 100
        }),
        `<h1>Hello world</h1>`
    );
});

test('html with invalid equals', () => {
    let template = getTemplate(`<h1>Hello {{#equals a b}}world{{/equals}}</h1>`);
    assert.equal(
        template({
            a: '100',
            b: 10
        }),
        `<h1>Hello </h1>`
    );
});

test('html with equals else', () => {
    let template = getTemplate(`<h1>Hello {{#equals a b}}world{{else}}you{{/equals}}</h1>`);
    assert.equal(
        template({
            a: 100,
            b: 10
        }),
        `<h1>Hello you</h1>`
    );
});

test('html with valid notEquals', () => {
    let template = getTemplate(`<h1>Hello {{#notEquals a b}}world{{/notEquals}}</h1>`);
    assert.equal(
        template({
            a: '10',
            b: 100
        }),
        `<h1>Hello world</h1>`
    );
});

test('html with invalid notEquals', () => {
    let template = getTemplate(`<h1>Hello {{#notEquals a b}}world{{/notEquals}}</h1>`);
    assert.equal(
        template({
            a: '100',
            b: 100
        }),
        `<h1>Hello </h1>`
    );
});

test('html with notEquals else', () => {
    let template = getTemplate(`<h1>Hello {{#notEquals a b}}world{{else}}you{{/notEquals}}</h1>`);
    assert.equal(
        template({
            a: '100',
            b: 100
        }),
        `<h1>Hello you</h1>`
    );
});

test('html with valid and', () => {
    let template = getTemplate(`<h1>Hello {{#and a b}}world{{/and}}</h1>`);
    assert.equal(
        template({
            a: true,
            b: true
        }),
        `<h1>Hello world</h1>`
    );
});

test('html with invalid and', () => {
    let template = getTemplate(`<h1>Hello {{#and a b}}world{{/and}}</h1>`);
    assert.equal(
        template({
            a: true,
            b: false
        }),
        `<h1>Hello </h1>`
    );
});

test('html with and else', () => {
    let template = getTemplate(`<h1>Hello {{#and a b}}world{{else}}you{{/and}}</h1>`);
    assert.equal(
        template({
            a: true,
            b: false
        }),
        `<h1>Hello you</h1>`
    );
});

test('html with valid or', () => {
    let template = getTemplate(`<h1>Hello {{#or a b}}world{{/or}}</h1>`);
    assert.equal(
        template({
            a: true,
            b: false
        }),
        `<h1>Hello world</h1>`
    );
});

test('html with invalid or', () => {
    let template = getTemplate(`<h1>Hello {{#or a b}}world{{/or}}</h1>`);
    assert.equal(
        template({
            a: false,
            b: false
        }),
        `<h1>Hello </h1>`
    );
});

test('html with or else', () => {
    let template = getTemplate(`<h1>Hello {{#or a b}}world{{else}}you{{/or}}</h1>`);
    assert.equal(
        template({
            a: false,
            b: false
        }),
        `<h1>Hello you</h1>`
    );
});

test('html with length', () => {
    let template = getTemplate(`<h1>Hello {{#greaterThan (length arr) 0}}world{{/greaterThan}}</h1>`);
    assert.equal(
        template({
            arr: [1, 2, 3]
        }),
        `<h1>Hello world</h1>`
    );
});

test('html with no length', () => {
    let template = getTemplate(`<h1>Hello {{#greaterThan (length arr) 0}}world{{/greaterThan}}</h1>`);
    assert.equal(
        template({
            arr: []
        }),
        `<h1>Hello </h1>`
    );
});

test('markdown with variables', () => {
    let source = `
## Title

  * Hello {{insert name "default=Customer"}}! Thank you for contacting us about {{insert businessName "your business"}}.
`;

    let template = getTemplate({
        template: source,
        format: 'markdown'
    });

    let rendered = template({
        name: 'John'
    });

    assert.ok(rendered.indexOf('<li>Hello John! Thank you for contacting us about your business.</li>') >= 0);
});

test('markdown block elements', () => {
    let template = getTemplate({
        template: `## Title

Some **bold** text and a [link](https://example.com).

> quoted

| a | b |
|---|---|
| 1 | 2 |
`,
        format: 'markdown'
    });

    assert.equal(
        template({}),
        `<h2>Title</h2>
<p>Some <strong>bold</strong> text and a <a href="https://example.com">link</a>.</p>
<blockquote>
<p>quoted</p>
</blockquote>
<table>
<thead>
<tr>
<th>a</th>
<th>b</th>
</tr>
</thead>
<tbody><tr>
<td>1</td>
<td>2</td>
</tr>
</tbody></table>
`
    );
});

test('markdown escapes interpolated values', () => {
    let template = getTemplate({
        template: `# {{title}}

Hello {{body}}
`,
        format: 'markdown'
    });

    assert.equal(
        template({
            title: 'Title',
            body: '<b>x</b>'
        }),
        `<h1>Title</h1>
<p>Hello &lt;b&gt;x&lt;/b&gt;</p>
`
    );
});

test('markdown does not render markdown syntax from interpolated values', () => {
    let template = getTemplate({
        template: `Hello {{name}}`,
        format: 'markdown'
    });

    let html = template({ name: '[click](javascript:alert(document.cookie)) ![x](https://t.example/p.png) **bold** # _x_ `c`' });
    assert.ok(!/href="javascript/i.test(html), html);
    assert.ok(!/<img/.test(html), html);
    assert.ok(!/<strong>|<em>|<code>|<h1>/.test(html), html);
    assert.ok(html.indexOf('[click](javascript:alert(document.cookie))') >= 0, html);
});

test('markdown keeps triple-stash values raw and helpers working', () => {
    let template = getTemplate({
        template: `{{{raw}}} {{#equals a "x-y"}}{{a}}{{/equals}} {{insert missing "default=a_b"}} {{length list}}`,
        format: 'markdown'
    });

    assert.equal(template({ raw: '**bold**', a: 'x-y', list: [1, 2] }), '<p><strong>bold</strong> x-y a_b 2</p>\n');
});

test('markdown filters unsafe link and image URLs', () => {
    let template = getTemplate({
        template: `[ok](https://example.com) [mail](mailto:a@example.com) [rel](/path) [js](javascript:alert(1)) [ent](javascript&#58;alert(1)) [vb](VBScript:x) ![img](https://example.com/a.png) ![cid](cid:logo) ![bad](javascript:alert(1))`,
        format: 'markdown'
    });

    assert.equal(
        template({}),
        '<p><a href="https://example.com">ok</a> <a href="mailto:a@example.com">mail</a> <a href="/path">rel</a> js ent vb ' +
            '<img src="https://example.com/a.png" alt="img"> <img src="cid:logo" alt="cid"> bad</p>\n'
    );
});

test('formatDate with format only uses UTC regardless of process timezone', () => {
    let template = getTemplate(`{{formatDate d "YYYY-MM-DD HH:mm"}}`);
    assert.equal(template({ d: '2026-01-01' }), '2026-01-01 00:00');
    assert.equal(template({ d: '2020-01-01T23:00:00.000Z' }), '2020-01-01 23:00');
});

test('formatDate without format', () => {
    let template = getTemplate(`{{formatDate d}}`);
    assert.equal(template({ d: '2020-01-01T23:00:00.000Z' }), '2020-01-01T23:00:00Z');
});

test('formatDate with offset', () => {
    let template = getTemplate(`{{formatDate d "YYYY-MM-DD HH:mm" "+0200"}}`);
    assert.equal(template({ d: '2020-01-01T23:00:00.000Z' }), '2020-01-02 01:00');
});

test('formatDate with non-ISO dates does not warn', () => {
    let template = getTemplate(`{{formatDate d "YYYY-MM-DD HH:mm"}}`);
    let yearTemplate = getTemplate(`{{formatDate d "YYYY"}}`);
    let warn = console.warn;
    let warnings = [];
    console.warn = (...args) => warnings.push(args);
    try {
        assert.equal(template({ d: 'Wed, 01 Jan 2020 10:00:00 +0200' }), '2020-01-01 08:00');
        // not ISO 8601 or RFC 2822, parsed as local time like Date does
        assert.equal(yearTemplate({ d: 'July 5, 2020 12:00' }), '2020');
    } finally {
        console.warn = warn;
    }
    assert.equal(warnings.length, 0);
});

test('formatDate with invalid or missing date', () => {
    let template = getTemplate(`[{{formatDate d "YYYY"}}]`);
    assert.equal(template({ d: 'not a date' }), '[]');
    assert.equal(template({}), '[]');
});

test('templates are compiled once, not on every render', () => {
    const Handlebars = require('handlebars');
    let compile = Handlebars.compile;
    let calls = 0;
    Handlebars.compile = (...args) => {
        calls++;
        return compile.apply(Handlebars, args);
    };
    try {
        let html = getTemplate({ template: '<b>{{a}}</b>', format: 'html' });
        let plain = getTemplate('{{a}}');
        for (let i = 0; i < 3; i++) {
            assert.equal(html({ a: '<x>' }), '<b>&lt;x&gt;</b>');
            assert.equal(plain({ a: '<x>' }), '<x>');
        }
    } finally {
        Handlebars.compile = compile;
    }
    assert.equal(calls, 2);
});

test('markdown filters entity-encoded schemes and ignores non-numeric references', () => {
    let template = getTemplate({
        template: `[hex](javascript&#x3A;alert(1)) [dec](javascript&#58alert(1)) [odd](&#abc;x) [ok](https://example.com)`,
        format: 'markdown'
    });

    let html = template({});
    assert.ok(!/href="javascript/i.test(html), html);
    assert.ok(html.indexOf('<a href="https://example.com">ok</a>') >= 0, html);
    assert.ok(/<a href="[^"]*abc[^"]*">odd<\/a>/.test(html), html);
});
