'use strict';

const { getTemplate } = require('..');

function preRender(source, data) {
    const template = getTemplate(source);
    return template(data);
}

let template = `<p>
<p>Hello {{insert name "default=Customer"}}! Thank you for contacting us about {{insert businessName "your business"}}.</p>

<p>
{{#greaterThan scoreOne scoreTwo}}
    Congratulations, {{name}}, you have the high score today!
{{else}}
    Sorry.
{{/greaterThan}}
 Thanks for playing.

{{#equals customerCode winningCode}}
    You have a winning code.
{{else}}
    You do not have a winning code.
{{/equals}}


{{#notEquals customerCode winningCode}}
    You have a winning code.
{{/notEquals}}

{{#and favoriteFood favoriteDrink}}
   Thank you for letting us know your dining preferences.
{{/and}}.

{{#or isRunner isCyclist}}
   We think you might enjoy a map of trails in your area.
{{/or}}.


{{#greaterThan (length cartItems) 0}}
 It looks like you still have some items in your shopping cart. Sign back in to continue checking out at any time.
{{else}}
 Thanks for browsing our site. We hope you'll come back soon.
{{/greaterThan}}
</p>

{{#each user.story}}
   {{#if this.male}}
      <p>{{this.date}}</p>
   {{else if this.female}}
      <p>{{this.item}}</p>
   {{/if}}
{{/each}}


<!-- Template with no timezone offset -->
<p>Join us {{formatDate timeStamp dateFormat}}</p>

<!-- Template with timezone offset -->
<p>Join us {{formatDate timeStamp dateFormat timezoneOffset}}</p>
`;
const variables = {
    name: "Ben's <pen>",
    //businessName: 'Twilio SendGrid',
    scoreOne: 1,
    scoreTwo: 78,
    customerCode: 289199,
    winningCode: '389199',

    favoriteFood: 'Pasta',
    favoriteDrink: '',

    isRunner: false,
    isCyclist: true,

    cartItems: ['raft', 'water bottle', 'sleeping bag'],

    user: {
        story: [
            {
                male: true,
                date: '2/1/2018',
                item: 'shoes'
            },
            {
                male: true,
                date: '1/4/2017',
                item: 'hat'
            },
            {
                female: true,
                date: '1/1/2016',
                item: 'shirt'
            }
        ]
    },

    timeStamp: '2020-01-01T23:00:00.000Z',
    dateFormat: 'MMMM DD, YYYY h:mm:ss A',
    timezoneOffset: '-0800'
};

template = preRender(
    {
        template,
        format: 'html'
    },
    variables
);

console.log(template);
