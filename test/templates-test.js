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

module.exports['mjml with variables'] = test => {
    let source = `
  <mjml>
    <mj-body>
      <mj-section>
        <mj-column>
          <mj-text>
            Hello {{insert name "default=Customer"}}! Thank you for contacting us about {{insert businessName "your business"}}.
          </mj-text>
        </mj-column>
      </mj-section>
    </mj-body>
  </mjml>
`;

    let template = getTemplate({
        template: source,
        format: 'mjml'
    });
    let rendered = template({
        name: 'John'
    });

    test.ok(rendered.indexOf('>Hello John! Thank you for contacting us about your business.</div') >= 0);
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
