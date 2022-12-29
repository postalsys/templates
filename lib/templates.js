/* eslint eqeqeq:0, no-invalid-this: 0 */

'use strict';

const moment = require('moment');
const mjml2html = require('mjml');
const marked = require('marked');
const Handlebars = require('handlebars');

// https://docs.sendgrid.com/for-developers/sending-email/using-handlebars#formatdate
Handlebars.registerHelper('formatDate', (...args) => {
    const [timeStamp, dateFormat, timezoneOffset] = args;

    let date = moment(timeStamp);

    if (timezoneOffset) {
        date = date.utcOffset(timezoneOffset);
    }

    return date.format(dateFormat);
});

// https://docs.sendgrid.com/for-developers/sending-email/using-handlebars#insert
Handlebars.registerHelper('insert', (value, options) => {
    options = options || '';
    let splitter = options.indexOf('=');
    let key = '',
        optionsValue;
    if (splitter >= 0) {
        key = options.substr(0, splitter).toLowerCase().trim();
        optionsValue = options.substr(splitter + 1).trim();
    } else {
        optionsValue = options.trim();
    }

    if (value) {
        return value;
    }

    switch (key) {
        case 'default':
        case '':
            return optionsValue || '';
        default:
            return '';
    }
});

Handlebars.registerHelper('length', value => (value && 'length' in value ? value.length : 0));

// https://docs.sendgrid.com/for-developers/sending-email/using-handlebars#basic-greaterthan
Handlebars.registerHelper('greaterThan', function (compareVal, baseVal, options) {
    if (!isNaN(baseVal) && !isNaN(compareVal)) {
        if (Number(compareVal) > Number(baseVal)) {
            return options.fn(this);
        }
    }
    return options.inverse(this);
});

// https://docs.sendgrid.com/for-developers/sending-email/using-handlebars#lessthan
Handlebars.registerHelper('lessThan', function (compareVal, baseVal, options) {
    if (!isNaN(baseVal) && !isNaN(compareVal)) {
        if (Number(compareVal) < Number(baseVal)) {
            return options.fn(this);
        }
    }
    return options.inverse(this);
});

// https://docs.sendgrid.com/for-developers/sending-email/using-handlebars#equals
Handlebars.registerHelper('equals', function (compareVal, baseVal, options) {
    if (baseVal == compareVal) {
        return options.fn(this);
    }
    return options.inverse(this);
});

// https://docs.sendgrid.com/for-developers/sending-email/using-handlebars#notequals
Handlebars.registerHelper('notEquals', function (compareVal, baseVal, options) {
    if (baseVal != compareVal) {
        return options.fn(this);
    }
    return options.inverse(this);
});

// https://docs.sendgrid.com/for-developers/sending-email/using-handlebars#and
Handlebars.registerHelper('and', function (...args) {
    let options = args.pop();

    if (!args.length) {
        return options.inverse(this);
    }

    for (let arg of args) {
        if (!arg) {
            return options.inverse(this);
        }
    }
    return options.fn(this);
});

// https://docs.sendgrid.com/for-developers/sending-email/using-handlebars#or
Handlebars.registerHelper('or', function (...args) {
    let options = args.pop();

    for (let arg of args) {
        if (arg) {
            return options.fn(this);
        }
    }

    return options.inverse(this);
});

function getCompiler(source, escaped) {
    return Handlebars.compile(source, { noEscape: !escaped });
}

function getTemplate(options) {
    let source = '';
    let format = 'html';
    if (typeof options === 'string') {
        source = options;
        format = 'plain';
    } else {
        format = options && options.format && options.format.toString();
        source = (options && options.template && options.template.toString()) || '';
    }

    const rendererOpts = (options && options.options) || {};

    return data => {
        switch ((format || '').toLowerCase().trim()) {
            case 'mjml': {
                let compiler = getCompiler(source, true);
                let rendered = mjml2html(compiler(data), rendererOpts);
                return rendered.html;
            }

            case 'markdown': {
                let compiler = getCompiler(source, true);
                return marked.parse(compiler(data), rendererOpts);
            }

            case 'plain': {
                let compiler = getCompiler(source, false);
                return compiler(data);
            }

            // default is html
            case 'html':
            default: {
                let compiler = getCompiler(source, true);
                return compiler(data);
            }
        }
    };
}

module.exports = { getTemplate };
