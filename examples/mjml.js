'use strict';

const { getTemplate } = require('..');

function preRender(source, data) {
    const template = getTemplate(source);
    return template(data);
}

let template = `
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

const variables = {
    name: "Ben's <pen>"
    //businessName: 'Twilio SendGrid'
};

template = preRender(
    {
        template,
        format: 'mjml'
    },
    variables
);

/*
  Compile an mjml string
*/
//const htmlOutput = mjml2html(template, options);

/*
  Print the responsive HTML generated and MJML errors if any
*/
//console.log(htmlOutput.html);

console.log(template);
