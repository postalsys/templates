/* eslint eqeqeq:0, no-invalid-this: 0 */

'use strict';

const moment = require('moment');
const marked = require('marked');
const Handlebars = require('handlebars');

function parseDate(value) {
    if (value instanceof Date || typeof value === 'number') {
        return moment.utc(value);
    }
    if (moment.isMoment(value)) {
        return value.clone().utc();
    }
    if (typeof value !== 'string' || !value.trim()) {
        return moment.invalid();
    }
    // Explicit formats keep moment from falling back to Date parsing, which logs a deprecation warning
    let date = moment.utc(value.trim(), [moment.ISO_8601, moment.RFC_2822], true);
    if (!date.isValid()) {
        let parsed = new Date(value);
        date = isNaN(parsed.getTime()) ? moment.invalid() : moment.utc(parsed);
    }
    return date;
}

// https://docs.sendgrid.com/for-developers/sending-email/using-handlebars#formatdate
Handlebars.registerHelper('formatDate', (...args) => {
    // Handlebars always appends its options object, it is not one of the helper arguments
    args.pop();
    const [timeStamp, dateFormat, timezoneOffset] = args;

    // Parsed and rendered in UTC so the output does not depend on the timezone of the process
    let date = parseDate(timeStamp);
    if (!date.isValid()) {
        return '';
    }

    if (typeof timezoneOffset === 'string' || typeof timezoneOffset === 'number') {
        date = date.utcOffset(timezoneOffset);
    }

    // moment's default format is ISO 8601
    return date.format(typeof dateFormat === 'string' && dateFormat ? dateFormat : undefined);
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

// Markdown syntax that survives Handlebars' HTML escaping. Characters that HTML escaping already
// turns into entities (< > & " ' ` =) are left alone, a backslash in front of an entity would break it
const MARKDOWN_SPECIAL = /[\\*_[\]()#+\-!|~]/g;
const MARKDOWN_ESCAPE_HELPER = 'markdown escape';

function escapeMarkdown(value) {
    // SafeString values are trusted markup, null and undefined render as empty strings
    if (value != null && typeof value.toHTML !== 'function') {
        value = String(value).replace(MARKDOWN_SPECIAL, '\\$&');
    }
    return Handlebars.Utils.escapeExpression(value);
}

// Merge data in a markdown template must not be able to add links, images or other markdown
// syntax, so {{value}} in that format escapes markdown on top of HTML. {{{value}}} stays raw.
const markdownHandlebars = Handlebars.create();
markdownHandlebars.helpers = Handlebars.helpers;
markdownHandlebars.partials = Handlebars.partials;
markdownHandlebars.decorators = Handlebars.decorators;

function MarkdownJavaScriptCompiler() {}
MarkdownJavaScriptCompiler.prototype = Object.create(Handlebars.JavaScriptCompiler.prototype);
MarkdownJavaScriptCompiler.prototype.compiler = MarkdownJavaScriptCompiler;
MarkdownJavaScriptCompiler.prototype.appendEscaped = function () {
    // the trailing object stands in for the options argument Handlebars' helper wrapper rewrites
    this.pushSource(this.appendToBuffer([this.aliasable('helpers[' + JSON.stringify(MARKDOWN_ESCAPE_HELPER) + ']'), '(', this.popStack(), ', {})']));
};
markdownHandlebars.JavaScriptCompiler = MarkdownJavaScriptCompiler;

const SAFE_LINK_SCHEMES = new Set(['http', 'https', 'mailto']);
const SAFE_IMAGE_SCHEMES = new Set(['http', 'https', 'cid', 'data']);

function isSafeUrl(href, allowedSchemes) {
    // Browsers decode entities in attributes and ignore whitespace and control characters in a scheme
    let normalized = (href || '')
        .replace(/&#(?:x([0-9a-f]+)|(\d+));?/gi, (m, hex, dec) => String.fromCodePoint(Math.min(parseInt(hex || dec, hex ? 16 : 10), 0x10ffff)))
        .replace(/&colon;?/gi, ':')
        .replace(/&(tab|newline);?/gi, '')
        .replace(/[\u0000-\u0020\u007f]+/g, '');
    let scheme = normalized.match(/^([a-z][a-z0-9+.-]*):/i);
    // no scheme means a relative reference, which cannot run script
    return !scheme || allowedSchemes.has(scheme[1].toLowerCase());
}

const markdownRenderer = new marked.Marked({
    renderer: {
        link(token) {
            if (!isSafeUrl(token.href, SAFE_LINK_SCHEMES)) {
                return this.parser.parseInline(token.tokens);
            }
            return false;
        },
        image(token) {
            if (!isSafeUrl(token.href, SAFE_IMAGE_SCHEMES)) {
                return Handlebars.Utils.escapeExpression(token.text);
            }
            return false;
        }
    }
});

// Built once instead of per render, the escape helper never changes
const MARKDOWN_RUNTIME_OPTIONS = { helpers: { [MARKDOWN_ESCAPE_HELPER]: escapeMarkdown } };

function getCompiler(source, escaped) {
    return Handlebars.compile(source, { noEscape: !escaped });
}

function getMarkdownCompiler(source) {
    let compiler = markdownHandlebars.compile(source);
    return data => compiler(data, MARKDOWN_RUNTIME_OPTIONS);
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

    // Compiled once per template, not per render. Handlebars compiles lazily on the first call,
    // so a template syntax error still surfaces when rendering, as before.
    switch ((format || '').toLowerCase().trim()) {
        case 'mjml':
            return () => {
                let error = new Error('MJML not supported');
                error.code = 'NotSupported';
                throw error;
            };

        case 'markdown': {
            let compiler = getMarkdownCompiler(source);
            return data => markdownRenderer.parse(compiler(data), rendererOpts);
        }

        case 'plain': {
            let compiler = getCompiler(source, false);
            // wrapped so a second argument never reaches Handlebars as runtime options
            return data => compiler(data);
        }

        // default is html
        case 'html':
        default: {
            let compiler = getCompiler(source, true);
            return data => compiler(data);
        }
    }
}

module.exports = { getTemplate };
