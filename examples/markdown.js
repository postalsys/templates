'use strict';

const { getTemplate } = require('..');

function preRender(source, data) {
    const template = getTemplate(source);
    return template(data);
}

let template = `
# Hello {{insert name "default=Customer"}}!

* Thank you for contacting us about {{insert businessName "your business"}}.
`;
const variables = {
    name: "Ben's <pen>"
    //businessName: 'Twilio SendGrid'
};

template = preRender(
    {
        template,
        format: 'markdown'
    },
    variables
);

console.log(template);
