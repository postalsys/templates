'use strict';

const { getTemplate } = require('..');

module.exports['html without variables'] = test => {
    let template = getTemplate(`<h1>Hello world</h1>`);
    test.equal(template(), `<h1>Hello world</h1>`);
    test.done();
};

module.exports['html with variable'] = test => {
    let template = getTemplate(`<h1>Hello {{ name }}</h1>`);
    test.equal(template({ name: 'world' }), `<h1>Hello world</h1>`);
    test.done();
};

module.exports['html without default override'] = test => {
    let template = getTemplate(`<h1>Hello {{ insert name "default=Customer"}}</h1>`);
    test.equal(template({ name: 'world' }), `<h1>Hello world</h1>`);
    test.done();
};

module.exports['html with default override'] = test => {
    let template = getTemplate(`<h1>Hello {{ insert name "default=Customer"}}</h1>`);
    test.equal(template({}), `<h1>Hello Customer</h1>`);
    test.done();
};

module.exports['html with formatDate'] = test => {
    let template = getTemplate(`<h1>Hello {{formatDate timeStamp dateFormat}}</h1>`);
    test.equal(
        template({
            timeStamp: '2020-01-01T23:00:00.000Z',
            dateFormat: 'MMMM DD, YYYY h:mm:ss A',
            timezoneOffset: '-0800'
        }),
        `<h1>Hello January 01, 2020 11:00:00 PM</h1>`
    );
    test.done();
};

module.exports['html with formatDate and offset'] = test => {
    let template = getTemplate(`<h1>Hello {{formatDate timeStamp dateFormat timezoneOffset}}</h1>`);
    test.equal(
        template({
            timeStamp: '2020-01-01T23:00:00.000Z',
            dateFormat: 'MMMM DD, YYYY h:mm:ss A',
            timezoneOffset: '-0800'
        }),
        `<h1>Hello January 01, 2020 3:00:00 PM</h1>`
    );
    test.done();
};

module.exports['html with valid greaterThan'] = test => {
    let template = getTemplate(`<h1>Hello {{#greaterThan a b}}world{{/greaterThan}}</h1>`);
    test.equal(
        template({
            a: 100,
            b: 10
        }),
        `<h1>Hello world</h1>`
    );
    test.done();
};

module.exports['html with invalid greaterThan'] = test => {
    let template = getTemplate(`<h1>Hello {{#greaterThan a b}}world{{/greaterThan}}</h1>`);
    test.equal(
        template({
            a: 10,
            b: 100
        }),
        `<h1>Hello </h1>`
    );
    test.done();
};

module.exports['html with greaterThan else'] = test => {
    let template = getTemplate(`<h1>Hello {{#greaterThan a b}}world{{else}}you{{/greaterThan}}</h1>`);
    test.equal(
        template({
            a: 10,
            b: 100
        }),
        `<h1>Hello you</h1>`
    );
    test.done();
};

module.exports['html with valid lessThan'] = test => {
    let template = getTemplate(`<h1>Hello {{#lessThan a b}}world{{/lessThan}}</h1>`);
    test.equal(
        template({
            a: 10,
            b: 100
        }),
        `<h1>Hello world</h1>`
    );
    test.done();
};

module.exports['html with invalid lessThan'] = test => {
    let template = getTemplate(`<h1>Hello {{#lessThan a b}}world{{/lessThan}}</h1>`);
    test.equal(
        template({
            a: 100,
            b: 10
        }),
        `<h1>Hello </h1>`
    );
    test.done();
};

module.exports['html with lessThan else'] = test => {
    let template = getTemplate(`<h1>Hello {{#lessThan a b}}world{{else}}you{{/lessThan}}</h1>`);
    test.equal(
        template({
            a: 100,
            b: 10
        }),
        `<h1>Hello you</h1>`
    );
    test.done();
};

module.exports['html with valid equals'] = test => {
    let template = getTemplate(`<h1>Hello {{#equals a b}}world{{/equals}}</h1>`);
    test.equal(
        template({
            a: '100',
            b: 100
        }),
        `<h1>Hello world</h1>`
    );
    test.done();
};

module.exports['html with invalid equals'] = test => {
    let template = getTemplate(`<h1>Hello {{#equals a b}}world{{/equals}}</h1>`);
    test.equal(
        template({
            a: '100',
            b: 10
        }),
        `<h1>Hello </h1>`
    );
    test.done();
};

module.exports['html with equals else'] = test => {
    let template = getTemplate(`<h1>Hello {{#equals a b}}world{{else}}you{{/equals}}</h1>`);
    test.equal(
        template({
            a: 100,
            b: 10
        }),
        `<h1>Hello you</h1>`
    );
    test.done();
};

module.exports['html with valid notEquals'] = test => {
    let template = getTemplate(`<h1>Hello {{#notEquals a b}}world{{/notEquals}}</h1>`);
    test.equal(
        template({
            a: '10',
            b: 100
        }),
        `<h1>Hello world</h1>`
    );
    test.done();
};

module.exports['html with invalid notEquals'] = test => {
    let template = getTemplate(`<h1>Hello {{#notEquals a b}}world{{/notEquals}}</h1>`);
    test.equal(
        template({
            a: '100',
            b: 100
        }),
        `<h1>Hello </h1>`
    );
    test.done();
};

module.exports['html with notEquals else'] = test => {
    let template = getTemplate(`<h1>Hello {{#notEquals a b}}world{{else}}you{{/notEquals}}</h1>`);
    test.equal(
        template({
            a: '100',
            b: 100
        }),
        `<h1>Hello you</h1>`
    );
    test.done();
};

module.exports['html with valid and'] = test => {
    let template = getTemplate(`<h1>Hello {{#and a b}}world{{/and}}</h1>`);
    test.equal(
        template({
            a: true,
            b: true
        }),
        `<h1>Hello world</h1>`
    );
    test.done();
};

module.exports['html with invalid and'] = test => {
    let template = getTemplate(`<h1>Hello {{#and a b}}world{{/and}}</h1>`);
    test.equal(
        template({
            a: true,
            b: false
        }),
        `<h1>Hello </h1>`
    );
    test.done();
};

module.exports['html with and else'] = test => {
    let template = getTemplate(`<h1>Hello {{#and a b}}world{{else}}you{{/and}}</h1>`);
    test.equal(
        template({
            a: true,
            b: false
        }),
        `<h1>Hello you</h1>`
    );
    test.done();
};

module.exports['html with valid or'] = test => {
    let template = getTemplate(`<h1>Hello {{#or a b}}world{{/or}}</h1>`);
    test.equal(
        template({
            a: true,
            b: false
        }),
        `<h1>Hello world</h1>`
    );
    test.done();
};

module.exports['html with invalid or'] = test => {
    let template = getTemplate(`<h1>Hello {{#or a b}}world{{/or}}</h1>`);
    test.equal(
        template({
            a: false,
            b: false
        }),
        `<h1>Hello </h1>`
    );
    test.done();
};

module.exports['html with or else'] = test => {
    let template = getTemplate(`<h1>Hello {{#or a b}}world{{else}}you{{/or}}</h1>`);
    test.equal(
        template({
            a: false,
            b: false
        }),
        `<h1>Hello you</h1>`
    );
    test.done();
};

module.exports['html with length'] = test => {
    let template = getTemplate(`<h1>Hello {{#greaterThan (length arr) 0}}world{{/greaterThan}}</h1>`);
    test.equal(
        template({
            arr: [1, 2, 3]
        }),
        `<h1>Hello world</h1>`
    );
    test.done();
};

module.exports['html with no length'] = test => {
    let template = getTemplate(`<h1>Hello {{#greaterThan (length arr) 0}}world{{/greaterThan}}</h1>`);
    test.equal(
        template({
            arr: []
        }),
        `<h1>Hello </h1>`
    );
    test.done();
};

module.exports['markdown with variables'] = test => {
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

    test.ok(rendered.indexOf('<li>Hello John! Thank you for contacting us about your business.</li>') >= 0);
    test.done();
};

module.exports['markdown block elements'] = test => {
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

    test.equal(
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
    test.done();
};

module.exports['markdown escapes interpolated values'] = test => {
    let template = getTemplate({
        template: `# {{title}}

Hello {{body}}
`,
        format: 'markdown'
    });

    test.equal(
        template({
            title: 'Title',
            body: '<b>x</b>'
        }),
        `<h1>Title</h1>
<p>Hello &lt;b&gt;x&lt;/b&gt;</p>
`
    );
    test.done();
};

module.exports['markdown does not render markdown syntax from interpolated values'] = test => {
    let template = getTemplate({
        template: `Hello {{name}}`,
        format: 'markdown'
    });

    let html = template({ name: '[click](javascript:alert(document.cookie)) ![x](https://t.example/p.png) **bold** # _x_ `c`' });
    test.ok(!/href="javascript/i.test(html), html);
    test.ok(!/<img/.test(html), html);
    test.ok(!/<strong>|<em>|<code>|<h1>/.test(html), html);
    test.ok(html.indexOf('[click](javascript:alert(document.cookie))') >= 0, html);
    test.done();
};

module.exports['markdown keeps triple-stash values raw and helpers working'] = test => {
    let template = getTemplate({
        template: `{{{raw}}} {{#equals a "x-y"}}{{a}}{{/equals}} {{insert missing "default=a_b"}} {{length list}}`,
        format: 'markdown'
    });

    test.equal(template({ raw: '**bold**', a: 'x-y', list: [1, 2] }), '<p><strong>bold</strong> x-y a_b 2</p>\n');
    test.done();
};

module.exports['markdown filters unsafe link and image URLs'] = test => {
    let template = getTemplate({
        template: `[ok](https://example.com) [mail](mailto:a@example.com) [rel](/path) [js](javascript:alert(1)) [ent](javascript&#58;alert(1)) [vb](VBScript:x) ![img](https://example.com/a.png) ![cid](cid:logo) ![bad](javascript:alert(1))`,
        format: 'markdown'
    });

    test.equal(
        template({}),
        '<p><a href="https://example.com">ok</a> <a href="mailto:a@example.com">mail</a> <a href="/path">rel</a> js ent vb ' +
            '<img src="https://example.com/a.png" alt="img"> <img src="cid:logo" alt="cid"> bad</p>\n'
    );
    test.done();
};

module.exports['formatDate with format only uses UTC regardless of process timezone'] = test => {
    let template = getTemplate(`{{formatDate d "YYYY-MM-DD HH:mm"}}`);
    test.equal(template({ d: '2026-01-01' }), '2026-01-01 00:00');
    test.equal(template({ d: '2020-01-01T23:00:00.000Z' }), '2020-01-01 23:00');
    test.done();
};

module.exports['formatDate without format'] = test => {
    let template = getTemplate(`{{formatDate d}}`);
    test.equal(template({ d: '2020-01-01T23:00:00.000Z' }), '2020-01-01T23:00:00Z');
    test.done();
};

module.exports['formatDate with offset'] = test => {
    let template = getTemplate(`{{formatDate d "YYYY-MM-DD HH:mm" "+0200"}}`);
    test.equal(template({ d: '2020-01-01T23:00:00.000Z' }), '2020-01-02 01:00');
    test.done();
};

module.exports['formatDate with non-ISO dates does not warn'] = test => {
    let template = getTemplate(`{{formatDate d "YYYY-MM-DD HH:mm"}}`);
    let yearTemplate = getTemplate(`{{formatDate d "YYYY"}}`);
    let warn = console.warn;
    let warnings = [];
    console.warn = (...args) => warnings.push(args);
    try {
        test.equal(template({ d: 'Wed, 01 Jan 2020 10:00:00 +0200' }), '2020-01-01 08:00');
        // not ISO 8601 or RFC 2822, parsed as local time like Date does
        test.equal(yearTemplate({ d: 'July 5, 2020 12:00' }), '2020');
    } finally {
        console.warn = warn;
    }
    test.equal(warnings.length, 0);
    test.done();
};

module.exports['formatDate with invalid or missing date'] = test => {
    let template = getTemplate(`[{{formatDate d "YYYY"}}]`);
    test.equal(template({ d: 'not a date' }), '[]');
    test.equal(template({}), '[]');
    test.done();
};

module.exports['templates are compiled once, not on every render'] = test => {
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
            test.equal(html({ a: '<x>' }), '<b>&lt;x&gt;</b>');
            test.equal(plain({ a: '<x>' }), '<x>');
        }
    } finally {
        Handlebars.compile = compile;
    }
    test.equal(calls, 2);
    test.done();
};

module.exports['markdown filters entity-encoded schemes and ignores non-numeric references'] = test => {
    let template = getTemplate({
        template: `[hex](javascript&#x3A;alert(1)) [dec](javascript&#58alert(1)) [odd](&#abc;x) [ok](https://example.com)`,
        format: 'markdown'
    });

    let html = template({});
    test.ok(!/href="javascript/i.test(html), html);
    test.ok(html.indexOf('<a href="https://example.com">ok</a>') >= 0, html);
    test.ok(/<a href="[^"]*abc[^"]*">odd<\/a>/.test(html), html);
    test.done();
};
