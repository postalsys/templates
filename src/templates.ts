/* eslint eqeqeq:0 */

import { Marked } from 'marked';
import type { MarkedOptions, Tokens } from 'marked';
import Handlebars from 'handlebars';

import { formatDate, parseDate, parseOffset } from './format-date.js';

/** The renderer returned by getTemplate(), called with the merge data */
export type TemplateRenderer = (data?: unknown) => string;

export interface TemplateOptions {
    /** Template source, `''` when missing */
    template?: string | undefined;
    /** `html` (default), `plain`, `markdown` or `mjml` (not supported, the renderer throws) */
    format?: string | undefined;
    /** Options for marked, used by the `markdown` format */
    options?: MarkedOptions | undefined;
}

// What the Handlebars type declarations leave out: the environment's registries are assignable,
// and a compiler class can be swapped in
interface HandlebarsEnvironment {
    helpers: typeof Handlebars.helpers;
    partials: typeof Handlebars.partials;
    decorators: typeof Handlebars.decorators;
    JavaScriptCompiler: new () => any;
}

// https://docs.sendgrid.com/for-developers/sending-email/using-handlebars#formatdate
Handlebars.registerHelper('formatDate', (...args: unknown[]) => {
    // Handlebars always appends its options object, it is not one of the helper arguments
    args.pop();
    const [timeStamp, dateFormat, timezoneOffset] = args;

    // Parsed and rendered in UTC so the output does not depend on the timezone of the process
    let time = parseDate(timeStamp);
    if (isNaN(time)) {
        return '';
    }

    // without a format the output is ISO 8601
    return formatDate(time, dateFormat, parseOffset(timezoneOffset));
});

// https://docs.sendgrid.com/for-developers/sending-email/using-handlebars#insert
Handlebars.registerHelper('insert', (value: unknown, options: unknown) => {
    // used as a string, Handlebars passes its options object when the template gives no default
    let spec = (options || '') as string;
    let splitter = spec.indexOf('=');
    let key = '',
        optionsValue;
    if (splitter >= 0) {
        key = spec.substring(0, splitter).toLowerCase().trim();
        optionsValue = spec.substring(splitter + 1).trim();
    } else {
        optionsValue = spec.trim();
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

// `in` on a primitive throws, as it always has for a string argument
Handlebars.registerHelper('length', (value: any) => (value && 'length' in value ? value.length : 0));

// https://docs.sendgrid.com/for-developers/sending-email/using-handlebars#basic-greaterthan
Handlebars.registerHelper('greaterThan', function (this: unknown, compareVal: any, baseVal: any, options: Handlebars.HelperOptions) {
    if (!isNaN(baseVal) && !isNaN(compareVal)) {
        if (Number(compareVal) > Number(baseVal)) {
            return options.fn(this);
        }
    }
    return options.inverse(this);
});

// https://docs.sendgrid.com/for-developers/sending-email/using-handlebars#lessthan
Handlebars.registerHelper('lessThan', function (this: unknown, compareVal: any, baseVal: any, options: Handlebars.HelperOptions) {
    if (!isNaN(baseVal) && !isNaN(compareVal)) {
        if (Number(compareVal) < Number(baseVal)) {
            return options.fn(this);
        }
    }
    return options.inverse(this);
});

// https://docs.sendgrid.com/for-developers/sending-email/using-handlebars#equals
Handlebars.registerHelper('equals', function (this: unknown, compareVal: unknown, baseVal: unknown, options: Handlebars.HelperOptions) {
    if (baseVal == compareVal) {
        return options.fn(this);
    }
    return options.inverse(this);
});

// https://docs.sendgrid.com/for-developers/sending-email/using-handlebars#notequals
Handlebars.registerHelper('notEquals', function (this: unknown, compareVal: unknown, baseVal: unknown, options: Handlebars.HelperOptions) {
    if (baseVal != compareVal) {
        return options.fn(this);
    }
    return options.inverse(this);
});

// https://docs.sendgrid.com/for-developers/sending-email/using-handlebars#and
Handlebars.registerHelper('and', function (this: unknown, ...args: unknown[]) {
    let options = args.pop() as Handlebars.HelperOptions;

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
Handlebars.registerHelper('or', function (this: unknown, ...args: unknown[]) {
    let options = args.pop() as Handlebars.HelperOptions;

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

function escapeMarkdown(value: unknown): string {
    // SafeString values are trusted markup, null and undefined render as empty strings
    if (value != null && typeof (value as { toHTML?: unknown }).toHTML !== 'function') {
        value = String(value).replace(MARKDOWN_SPECIAL, '\\$&');
    }
    return Handlebars.Utils.escapeExpression(value as string);
}

// Merge data in a markdown template must not be able to add links, images or other markdown
// syntax, so {{value}} in that format escapes markdown on top of HTML. {{{value}}} stays raw.
const markdownHandlebars = Handlebars.create();
const markdownEnvironment = markdownHandlebars as unknown as HandlebarsEnvironment;
const baseEnvironment = Handlebars as unknown as HandlebarsEnvironment;
markdownEnvironment.helpers = Handlebars.helpers;
markdownEnvironment.partials = Handlebars.partials;
markdownEnvironment.decorators = Handlebars.decorators;

// Handlebars instantiates compilers with `new`, also the child compilers it makes through
// `this.compiler`, so a class works where the original constructor function did
class MarkdownJavaScriptCompiler extends baseEnvironment.JavaScriptCompiler {
    appendEscaped(): void {
        // the trailing object stands in for the options argument Handlebars' helper wrapper rewrites
        this.pushSource(this.appendToBuffer([this.aliasable('helpers[' + JSON.stringify(MARKDOWN_ESCAPE_HELPER) + ']'), '(', this.popStack(), ', {})']));
    }
}
MarkdownJavaScriptCompiler.prototype.compiler = MarkdownJavaScriptCompiler;
markdownEnvironment.JavaScriptCompiler = MarkdownJavaScriptCompiler;

const SAFE_LINK_SCHEMES = new Set(['http', 'https', 'mailto']);
const SAFE_IMAGE_SCHEMES = new Set(['http', 'https', 'cid', 'data']);

function isSafeUrl(href: string | null | undefined, allowedSchemes: Set<string>): boolean {
    // Browsers decode entities in attributes and ignore whitespace and control characters in a scheme
    let normalized = (href || '')
        .replace(/&#(?:x([0-9a-f]+)|(\d+));?/gi, (_m, hex?: string, dec?: string) =>
            String.fromCodePoint(Math.min(parseInt(hex || dec || '', hex ? 16 : 10), 0x10ffff))
        )
        .replace(/&colon;?/gi, ':')
        .replace(/&(tab|newline);?/gi, '')
        // control characters are exactly what this strips
        .replace(/[\u0000-\u0020\u007f]+/g, '');
    let scheme = normalized.match(/^([a-z][a-z0-9+.-]*):/i);
    // no scheme means a relative reference, which cannot run script
    return !scheme || allowedSchemes.has(scheme[1].toLowerCase());
}

const markdownRenderer = new Marked({
    renderer: {
        link(token: Tokens.Link) {
            if (!isSafeUrl(token.href, SAFE_LINK_SCHEMES)) {
                return this.parser.parseInline(token.tokens);
            }
            return false;
        },
        image(token: Tokens.Image) {
            if (!isSafeUrl(token.href, SAFE_IMAGE_SCHEMES)) {
                return Handlebars.Utils.escapeExpression(token.text);
            }
            return false;
        }
    }
});

// Built once instead of per render, the escape helper never changes
const MARKDOWN_RUNTIME_OPTIONS: Handlebars.RuntimeOptions = { helpers: { [MARKDOWN_ESCAPE_HELPER]: escapeMarkdown } };

function getCompiler(source: string, escaped: boolean): Handlebars.TemplateDelegate {
    return Handlebars.compile(source, { noEscape: !escaped });
}

function getMarkdownCompiler(source: string): TemplateRenderer {
    let compiler = markdownHandlebars.compile(source);
    return data => compiler(data, MARKDOWN_RUNTIME_OPTIONS);
}

/**
 * Compiles a template and returns its renderer. A string is a `plain` template.
 */
export function getTemplate(options?: string | TemplateOptions | null): TemplateRenderer {
    let source: string;
    let format: string | undefined;
    if (typeof options === 'string') {
        source = options;
        format = 'plain';
    } else {
        format = (options && options.format && options.format.toString()) || undefined;
        source = (options && options.template && options.template.toString()) || '';
    }

    const rendererOpts = (options && typeof options === 'object' && options.options) || {};

    // Compiled once per template, not per render. Handlebars compiles lazily on the first call,
    // so a template syntax error still surfaces when rendering, as before.
    switch ((format || '').toLowerCase().trim()) {
        case 'mjml':
            return () => {
                let error = new Error('MJML not supported') as Error & { code?: string };
                error.code = 'NotSupported';
                throw error;
            };

        case 'markdown': {
            let compiler = getMarkdownCompiler(source);
            // marked returns a promise only with its `async` option, which this format does not support
            return data => markdownRenderer.parse(compiler(data), rendererOpts) as string;
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

// For `import templates from '@postalsys/templates'`, which read module.exports before there was an
// ES module build. The CommonJS build keeps it out of Object.keys() (scripts/build.js).
export default { getTemplate };
