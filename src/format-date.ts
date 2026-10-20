/* eslint no-bitwise:0 */
// ~~ truncates to 32 bits as it did in moment, which matters for very large offsets

// Date parsing and formatting for the formatDate helper.
//
// formatDate used to be moment.js, and its format strings are part of the template language
// (SendGrid's formatDate takes the same moment tokens), so this module reproduces what
// moment 2.31 did for the English locale in UTC or a fixed offset: the same tokens, the same
// strict ISO 8601 and RFC 2822 parsing, the same output. The regular expressions and the
// arithmetic are ported from moment (MIT, https://github.com/moment/moment) so that edge cases
// (padding of negative years, week numbering, offset validation) come out identical.
// test/format-date-test.ts renders the same inputs through moment and through this module.

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const WEEKDAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WEEKDAYS_MIN = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

const INVALID_DATE = 'Invalid date';

// moment's default formats, for a moment in UTC and for one with an offset
const DEFAULT_FORMAT_UTC = 'YYYY-MM-DDTHH:mm:ss[Z]';
const DEFAULT_FORMAT = 'YYYY-MM-DDTHH:mm:ssZ';

const FORMATTING_TOKENS =
    /(\[[^\[]*\])|(\\e)|(\\)?(eHHmm|[Hh]mm(ss)?|Mo|MM?M?M?|Do|DDDo|DD?D?D?|ddd?d?|do?|w[o|w]?|W[o|W]?|Qo?|N{1,5}|YYYYYY|YYYYY|YYYY|YY|y{2,4}|yo?|gg(ggg?)?|GG(GGG?)?|e|E|a|A|hh?|HH?|kk?|mm?|ss?|S{1,9}|x|X|zz?|ZZ?|.)/g;
const LOCAL_FORMATTING_TOKENS = /(\[[^\[]*\])|(\\)?(LTS|LT|LL?L?L?|l{1,4})/g;

// English long date formats, the lowercase ones derived the way moment derives them
const LONG_DATE_FORMATS = new Map([
    ['LTS', 'h:mm:ss A'],
    ['LT', 'h:mm A'],
    ['L', 'MM/DD/YYYY'],
    ['LL', 'MMMM D, YYYY'],
    ['LLL', 'MMMM D, YYYY h:mm A'],
    ['LLLL', 'dddd, MMMM D, YYYY h:mm A'],
    ['l', 'M/D/YYYY'],
    ['ll', 'MMM D, YYYY'],
    ['lll', 'MMM D, YYYY h:mm A'],
    ['llll', 'ddd, MMM D, YYYY h:mm A']
]);

const SHORT_OFFSET = /Z|[+-]\d\d(?::?\d\d)?/gi;
const OFFSET_CHUNK = /([+-]|\d\d)/gi;

const MS_PER_MINUTE = 60 * 1000;
const MS_PER_DAY = 24 * 60 * MS_PER_MINUTE;

function toInt(value: unknown): number {
    let coerced = +(value as number);
    if (coerced !== 0 && isFinite(coerced)) {
        return coerced < 0 ? Math.ceil(coerced) || 0 : Math.floor(coerced);
    }
    return 0;
}

function zeroFill(value: number, targetLength: number, forceSign?: boolean): string {
    let absNumber = '' + Math.abs(value);
    let zerosToFill = targetLength - absNumber.length;
    return (value >= 0 ? (forceSign ? '+' : '') : '-') + Math.pow(10, Math.max(0, zerosToFill)).toString().substring(1) + absNumber;
}

function ordinal(value: number): string {
    let b = value % 10;
    let suffix = toInt((value % 100) / 10) === 1 ? 'th' : b === 1 ? 'st' : b === 2 ? 'nd' : b === 3 ? 'rd' : 'th';
    return value + suffix;
}

function isLeapYear(year: number): boolean {
    return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

function daysInYear(year: number): number {
    return isLeapYear(year) ? 366 : 365;
}

function daysInMonth(year: number, month: number): number {
    if (isNaN(year) || isNaN(month)) {
        return NaN;
    }
    let modMonth = ((month % 12) + 12) % 12;
    year += (month - modMonth) / 12;
    return modMonth === 1 ? (isLeapYear(year) ? 29 : 28) : 31 - ((modMonth % 7) % 2);
}

/** Date.UTC() without its mapping of years 0-99 to 1900-1999 */
function utcTime(year: number, month: number, day: number, hour = 0, minute = 0, second = 0, millisecond = 0): number {
    if (year < 100 && year >= 0) {
        // a full 400 year cycle away keeps leap years where they are
        let date = new Date(Date.UTC(year + 400, month, day, hour, minute, second, millisecond));
        if (isFinite(date.getUTCFullYear())) {
            date.setUTCFullYear(year);
        }
        return date.getTime();
    }
    return Date.UTC(year, month, day, hour, minute, second, millisecond);
}

// Week numbering: dow is the first day of the week, doy decides which January day is always in
// week one. ISO weeks are dow 1, doy 4; moment's English locale counts weeks with dow 0, doy 6.
function firstWeekOffset(year: number, dow: number, doy: number): number {
    let fwd = 7 + dow - doy;
    let fwdlw = (7 + new Date(utcTime(year, 0, fwd)).getUTCDay() - dow) % 7;
    return -fwdlw + fwd - 1;
}

function weeksInYear(year: number, dow: number, doy: number): number {
    return (daysInYear(year) - firstWeekOffset(year, dow, doy) + firstWeekOffset(year + 1, dow, doy)) / 7;
}

function weekOfYear(year: number, dayOfYear: number, dow: number, doy: number): { week: number; year: number } {
    let week = Math.floor((dayOfYear - firstWeekOffset(year, dow, doy) - 1) / 7) + 1;
    if (week < 1) {
        return { week: week + weeksInYear(year - 1, dow, doy), year: year - 1 };
    }
    if (week > weeksInYear(year, dow, doy)) {
        return { week: week - weeksInYear(year, dow, doy), year: year + 1 };
    }
    return { week, year };
}

function dayOfYearFromWeeks(year: number, week: number, weekday: number, dow: number, doy: number): { year: number; dayOfYear: number } {
    let localWeekday = (7 + weekday - dow) % 7;
    let dayOfYear = 1 + 7 * (week - 1) + localWeekday + firstWeekOffset(year, dow, doy);
    if (dayOfYear <= 0) {
        return { year: year - 1, dayOfYear: daysInYear(year - 1) + dayOfYear };
    }
    if (dayOfYear > daysInYear(year)) {
        return { year: year + 1, dayOfYear: dayOfYear - daysInYear(year) };
    }
    return { year, dayOfYear };
}

/** An offset in minutes from "+0200", "-05:00", "+05" or "Z" (the last one in the string), null if there is none or it is out of range */
function offsetFromString(value: string): number | null {
    let matches = value.match(SHORT_OFFSET);
    if (matches === null) {
        return null;
    }
    let parts: (string | number)[] = matches[matches.length - 1].match(OFFSET_CHUNK) || ['-', 0, 0];
    let minutes = +(parts[1] as number) * 60 + toInt(parts[2]);
    if (toInt(parts[2]) > 59 || (parts[0] === '+' ? minutes > 14 * 60 : minutes > 12 * 60)) {
        return null;
    }
    return minutes === 0 ? 0 : parts[0] === '+' ? minutes : -minutes;
}

// ISO 8601, parsed strictly the way moment's ISO_8601 format constant does: the string has to
// match one of the formats below exactly, and every field has to be in range
const EXTENDED_ISO =
    /^\s*((?:[+-]\d{6}|\d{4})-(?:\d\d-\d\d|W\d\d-\d|W\d\d|\d\d\d|\d\d))(?:(T| )(\d\d(?::\d\d(?::\d\d(?:[.,]\d+)?)?)?)([+-]\d\d(?::?\d\d)?|\s*Z)?)?$/;
const BASIC_ISO = /^\s*((?:[+-]\d{6}|\d{4})(?:\d\d\d\d|W\d\d\d|W\d\d|\d\d\d|\d\d|))(?:(T| )(\d\d(?:\d\d(?:\d\d(?:[.,]\d+)?)?)?)([+-]\d\d(?::?\d\d)?|\s*Z)?)?$/;
const ISO_TZ = /Z|[+-]\d\d(?::?\d\d)?/;
const ISO_DATES: [string, RegExp, boolean][] = [
    ['YYYYYY-MM-DD', /[+-]\d{6}-\d\d-\d\d/, true],
    ['YYYY-MM-DD', /\d{4}-\d\d-\d\d/, true],
    ['GGGG-[W]WW-E', /\d{4}-W\d\d-\d/, true],
    ['GGGG-[W]WW', /\d{4}-W\d\d/, false],
    ['YYYY-DDD', /\d{4}-\d{3}/, true],
    ['YYYY-MM', /\d{4}-\d\d/, false],
    ['YYYYYYMMDD', /[+-]\d{10}/, true],
    ['YYYYMMDD', /\d{8}/, true],
    ['GGGG[W]WWE', /\d{4}W\d{3}/, true],
    ['GGGG[W]WW', /\d{4}W\d{2}/, false],
    ['YYYYDDD', /\d{7}/, true],
    ['YYYYMM', /\d{6}/, false],
    ['YYYY', /\d{4}/, false]
];
const ISO_TIMES: [string, RegExp][] = [
    ['HH:mm:ss.SSSS', /\d\d:\d\d:\d\d\.\d+/],
    ['HH:mm:ss,SSSS', /\d\d:\d\d:\d\d,\d+/],
    ['HH:mm:ss', /\d\d:\d\d:\d\d/],
    ['HH:mm', /\d\d:\d\d/],
    ['HHmmss.SSSS', /\d\d\d\d\d\d\.\d+/],
    ['HHmmss,SSSS', /\d\d\d\d\d\d,\d+/],
    ['HHmmss', /\d\d\d\d\d\d/],
    ['HHmm', /\d\d\d\d/],
    ['HH', /\d\d/]
];

// The strict parse expressions of the tokens the ISO formats use
const PARSE_TOKENS = new Map<string, RegExp>([
    ['YYYYYY', /[+-]?\d{6}/],
    ['YYYY', /\d{4}/],
    ['MM', /\d\d/],
    ['DD', /\d\d/],
    ['DDD', /\d{1,3}/],
    ['GGGG', /\d{4}/],
    ['WW', /\d\d/],
    ['E', /\d\d?/],
    ['HH', /\d\d/],
    ['mm', /\d\d/],
    ['ss', /\d\d/],
    ['SSSS', /\d+/],
    ['Z', /Z|[+-]\d\d(?::?\d\d)?/i]
]);

interface ParsedFields {
    year?: number;
    month?: number;
    date?: number;
    hour?: number;
    minute?: number;
    second?: number;
    millisecond?: number;
    dayOfYear?: number;
    weekYear?: number;
    week?: number;
    weekday?: number;
    offset?: number | null;
}

function setField(fields: ParsedFields, token: string, input: string): void {
    switch (token) {
        case 'YYYYYY':
        case 'YYYY':
            fields.year = toInt(input);
            break;
        case 'MM':
            fields.month = toInt(input) - 1;
            break;
        case 'DD':
            fields.date = toInt(input);
            break;
        case 'DDD':
            fields.dayOfYear = toInt(input);
            break;
        case 'GGGG':
            fields.weekYear = toInt(input);
            break;
        case 'WW':
            fields.week = toInt(input);
            break;
        case 'E':
            fields.weekday = toInt(input);
            break;
        case 'HH':
            fields.hour = toInt(input);
            break;
        case 'mm':
            fields.minute = toInt(input);
            break;
        case 'ss':
            fields.second = toInt(input);
            break;
        case 'SSSS':
            // truncated, not rounded, as moment does
            fields.millisecond = toInt(+('0.' + input) * 1000);
            break;
        case 'Z':
            fields.offset = offsetFromString(input);
            break;
    }
}

// The fields to a timestamp, NaN when one of them is out of range
function timeFromFields(fields: ParsedFields): number {
    if (fields.offset === null) {
        return NaN;
    }
    if (fields.weekYear !== undefined) {
        let week = fields.week ?? 1;
        let weekday = fields.weekday ?? 1;
        if (week < 1 || week > weeksInYear(fields.weekYear, 1, 4) || weekday < 1 || weekday > 7) {
            return NaN;
        }
        let resolved = dayOfYearFromWeeks(fields.weekYear, week, weekday, 1, 4);
        fields.year = resolved.year;
        fields.dayOfYear = resolved.dayOfYear;
    }
    let year = fields.year!;
    let month = fields.month ?? 0;
    let date = fields.date ?? 1;
    if (fields.dayOfYear !== undefined) {
        if (fields.dayOfYear > daysInYear(year) || fields.dayOfYear === 0) {
            return NaN;
        }
        let start = new Date(utcTime(year, 0, fields.dayOfYear));
        month = start.getUTCMonth();
        date = start.getUTCDate();
    }
    let hour = fields.hour ?? 0;
    let minute = fields.minute ?? 0;
    let second = fields.second ?? 0;
    let millisecond = fields.millisecond ?? 0;
    // 24:00 is the end of the day, any other time past 23:59:59.999 is invalid
    if (
        month < 0 ||
        month > 11 ||
        date < 1 ||
        date > daysInMonth(year, month) ||
        hour > 24 ||
        (hour === 24 && (minute !== 0 || second !== 0 || millisecond !== 0)) ||
        minute > 59 ||
        second > 59
    ) {
        return NaN;
    }
    // through Date to stay within its range
    return new Date(utcTime(year, month, date, hour, minute, second, millisecond) - (fields.offset ?? 0) * MS_PER_MINUTE).getTime();
}

// A literal in a format: escaped text ([W]) or a single character
function literalPattern(token: string): string {
    let text = token.startsWith('[') && token.endsWith(']') ? token.slice(1, -1) : token;
    return text.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
}

// moment's strict format parsing, limited to the tokens the ISO formats use. Each token takes the
// first match of its expression in what is left of the input, and in strict mode nothing may be
// skipped or left over.
function parseFormat(input: string, format: string): number {
    let rest = input;
    let fields: ParsedFields = {};
    for (let token of format.match(FORMATTING_TOKENS)!) {
        let pattern = PARSE_TOKENS.get(token) || new RegExp(literalPattern(token));
        let match = rest.match(pattern);
        if (!match || rest.indexOf(match[0]) !== 0) {
            return NaN;
        }
        rest = rest.slice(match[0].length);
        setField(fields, token, match[0]);
    }
    return rest ? NaN : timeFromFields(fields);
}

function parseIso(input: string): number {
    let match = EXTENDED_ISO.exec(input) || BASIC_ISO.exec(input);
    if (!match) {
        return NaN;
    }
    let dateFormat = ISO_DATES.find(([, pattern]) => pattern.test(match[1]));
    if (!dateFormat) {
        return NaN;
    }
    let timeFormat = '';
    if (match[3]) {
        let time = ISO_TIMES.find(([, pattern]) => pattern.test(match[3]));
        if (!time || !dateFormat[2]) {
            return NaN;
        }
        timeFormat = (match[2] || ' ') + time[0];
    }
    let tzFormat = '';
    if (match[4]) {
        if (!ISO_TZ.test(match[4])) {
            return NaN;
        }
        tzFormat = 'Z';
    }
    return parseFormat(input, dateFormat[0] + timeFormat + tzFormat);
}

// RFC 2822, as moment's RFC_2822 format constant parses it
const RFC_2822 =
    /^(?:(Mon|Tue|Wed|Thu|Fri|Sat|Sun),?\s)?(\d{1,2})\s(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s(\d{2,4})\s(\d\d):(\d\d)(?::(\d\d))?\s(?:(UT|GMT|[ECMP][SD]T)|([Zz])|([+-]\d{4}))$/;
const OBSOLETE_OFFSETS = new Map([
    ['UT', 0],
    ['GMT', 0],
    ['EDT', -4 * 60],
    ['EST', -5 * 60],
    ['CDT', -5 * 60],
    ['CST', -6 * 60],
    ['MDT', -6 * 60],
    ['MST', -7 * 60],
    ['PDT', -7 * 60],
    ['PST', -8 * 60]
]);

function parseRfc2822(input: string): number {
    // comments and folding whitespace removed, runs of whitespace collapsed
    let normalized = input
        .replace(/\([^()]*\)|[\n\t]/g, ' ')
        .replace(/(\s\s+)/g, ' ')
        .replace(/^\s\s*/, '')
        .replace(/\s\s*$/, '');
    let match = RFC_2822.exec(normalized);
    if (!match) {
        return NaN;
    }
    let [, weekdayName, dayStr, monthName, yearStr, hourStr, minuteStr, secondStr, obsoleteZone, militaryZone, numericOffset] = match;
    let year = parseInt(yearStr, 10);
    year = year <= 49 ? 2000 + year : year <= 999 ? 1900 + year : year;
    let month = MONTHS_SHORT.indexOf(monthName);
    let date = parseInt(dayStr, 10);
    let hour = parseInt(hourStr, 10);
    let minute = parseInt(minuteStr, 10);
    let second = secondStr ? parseInt(secondStr, 10) : undefined;

    if (weekdayName && WEEKDAYS_SHORT.indexOf(weekdayName) !== new Date(utcTime(year, month, date)).getUTCDay()) {
        return NaN;
    }

    // moment checks the fields for overflow; its 24:00 exception needs milliseconds, which this format has none of
    if (date < 1 || date > daysInMonth(year, month) || hour > 23 || minute > 59 || (second ?? 0) > 59) {
        return NaN;
    }

    let offset: number;
    if (obsoleteZone) {
        offset = OBSOLETE_OFFSETS.get(obsoleteZone)!;
    } else if (militaryZone) {
        offset = 0;
    } else {
        let hm = parseInt(numericOffset, 10);
        let minutes = hm % 100;
        offset = ((hm - minutes) / 100) * 60 + minutes;
    }
    return new Date(utcTime(year, month, date, hour, minute, second ?? 0) - offset * MS_PER_MINUTE).getTime();
}

/**
 * A timestamp from the formatDate argument: a Date, epoch milliseconds, a moment object, or an
 * ISO 8601 or RFC 2822 string, with Date parsing as the fallback for any other string.
 * NaN when there is no valid date.
 */
export function parseDate(value: unknown): number {
    if (value instanceof Date || typeof value === 'number') {
        return new Date(value).getTime();
    }
    // moment.isMoment(): any object carrying moment's marker property
    let momentMarker = value === null || value === undefined ? undefined : (value as { _isAMomentObject?: unknown })._isAMomentObject;
    if (momentMarker !== undefined && momentMarker !== null) {
        // a moment object from the caller's own moment
        let momentLike = value as { isValid?: () => boolean; valueOf(): unknown };
        return typeof momentLike.isValid === 'function' && !momentLike.isValid() ? NaN : new Date(Number(momentLike.valueOf())).getTime();
    }
    if (typeof value !== 'string' || !value.trim()) {
        return NaN;
    }
    let trimmed = value.trim();
    let time = parseIso(trimmed);
    if (isNaN(time)) {
        time = parseRfc2822(trimmed);
    }
    if (isNaN(time)) {
        time = new Date(value).getTime();
    }
    return time;
}

/**
 * The offset in minutes formatDate applies: "+0200", "-05:00" and other strings as above, or a
 * number, read as hours below 16 and as minutes otherwise. 0 when there is no usable offset.
 */
export function parseOffset(value: unknown): number {
    if (typeof value === 'string') {
        return offsetFromString(value) ?? 0;
    }
    if (typeof value === 'number') {
        return Math.abs(value) < 16 ? value * 60 : value;
    }
    return 0;
}

const ERA_ABBREVIATIONS = { AD: 'AD', BC: 'BC' };
const AD_START = utcTime(1, 0, 1);
const BC_END = utcTime(0, 11, 31);

// The calendar fields of a timestamp shifted by an offset, as the format tokens read them
class DateParts {
    readonly year: number;
    readonly month: number;
    readonly date: number;
    readonly day: number;
    readonly hour: number;
    readonly minute: number;
    readonly second: number;
    readonly millisecond: number;
    // what the offset tokens print, NaN prints as no offset
    readonly offset: number;
    // the instant itself, independent of the offset
    readonly time: number;
    private readonly shiftedTime: number;
    private cachedDayOfYear: number | undefined;

    constructor(shifted: Date, offset: number) {
        this.year = shifted.getUTCFullYear();
        this.month = shifted.getUTCMonth();
        this.date = shifted.getUTCDate();
        this.day = shifted.getUTCDay();
        this.hour = shifted.getUTCHours();
        this.minute = shifted.getUTCMinutes();
        this.second = shifted.getUTCSeconds();
        this.millisecond = shifted.getUTCMilliseconds();
        this.offset = offset || 0;
        this.shiftedTime = shifted.getTime();
        this.time = this.shiftedTime - this.offset * MS_PER_MINUTE;
    }

    get dayOfYear(): number {
        if (this.cachedDayOfYear === undefined) {
            this.cachedDayOfYear = Math.round((utcTime(this.year, this.month, this.date) - utcTime(this.year, 0, 1)) / MS_PER_DAY) + 1;
        }
        return this.cachedDayOfYear;
    }

    week(dow: number, doy: number): { week: number; year: number } {
        return weekOfYear(this.year, this.dayOfYear, dow, doy);
    }

    get hour12(): number {
        return this.hour % 12 || 12;
    }

    // The English locale's eras: Anno Domini from 0001-01-01, Before Christ up to 0000-12-31. As in
    // moment, the era is picked by the instant of the start of the day, while the era year counts
    // from the calendar year. moment put the boundaries at midnight in the process time zone,
    // this puts them at midnight UTC. A day starting between the two boundaries has no era.
    get era(): 'AD' | 'BC' | undefined {
        let dayStart = Math.floor(this.shiftedTime / MS_PER_DAY) * MS_PER_DAY - this.offset * MS_PER_MINUTE;
        return dayStart >= AD_START ? 'AD' : dayStart <= BC_END ? 'BC' : undefined;
    }

    get eraYear(): number {
        let era = this.era;
        return era === 'AD' ? this.year : era === 'BC' ? 1 - this.year : this.year;
    }
}

type TokenFormatter = (parts: DateParts) => string | number;

function eraName(names: { AD: string; BC: string }): TokenFormatter {
    return parts => {
        let era = parts.era;
        return era ? names[era] : '';
    };
}

function offsetFormatter(separator: string): TokenFormatter {
    return parts => {
        let offset = parts.offset;
        let sign = '+';
        if (offset < 0) {
            offset = -offset;
            sign = '-';
        }
        return sign + zeroFill(~~(offset / 60), 2) + separator + zeroFill(~~offset % 60, 2);
    };
}

const FORMATTERS = new Map<string, TokenFormatter>([
    ['M', p => p.month + 1],
    ['MM', p => zeroFill(p.month + 1, 2)],
    ['Mo', p => ordinal(p.month + 1)],
    ['MMM', p => MONTHS_SHORT[p.month]],
    ['MMMM', p => MONTHS[p.month]],

    ['Q', p => Math.ceil((p.month + 1) / 3)],
    ['Qo', p => ordinal(Math.ceil((p.month + 1) / 3))],

    ['D', p => p.date],
    ['DD', p => zeroFill(p.date, 2)],
    ['Do', p => ordinal(p.date)],
    ['DDD', p => p.dayOfYear],
    ['DDDD', p => zeroFill(p.dayOfYear, 3)],
    ['DDDo', p => ordinal(p.dayOfYear)],

    ['d', p => p.day],
    ['do', p => ordinal(p.day)],
    ['dd', p => WEEKDAYS_MIN[p.day]],
    ['ddd', p => WEEKDAYS_SHORT[p.day]],
    ['dddd', p => WEEKDAYS[p.day]],
    // the English locale's weeks start on Sunday, so its weekday is the day of the week
    ['e', p => p.day],
    ['E', p => p.day || 7],
    ['eHHmm', p => '' + p.day + zeroFill(p.hour, 2) + zeroFill(p.minute, 2)],

    ['w', p => p.week(0, 6).week],
    ['ww', p => zeroFill(p.week(0, 6).week, 2)],
    ['wo', p => ordinal(p.week(0, 6).week)],
    ['W', p => p.week(1, 4).week],
    ['WW', p => zeroFill(p.week(1, 4).week, 2)],
    ['Wo', p => ordinal(p.week(1, 4).week)],
    ['gg', p => zeroFill(p.week(0, 6).year % 100, 2)],
    ['gggg', p => zeroFill(p.week(0, 6).year, 4)],
    ['ggggg', p => zeroFill(p.week(0, 6).year, 5)],
    ['GG', p => zeroFill(p.week(1, 4).year % 100, 2)],
    ['GGGG', p => zeroFill(p.week(1, 4).year, 4)],
    ['GGGGG', p => zeroFill(p.week(1, 4).year, 5)],

    ['Y', p => (p.year <= 9999 ? zeroFill(p.year, 4) : '+' + p.year)],
    ['YY', p => zeroFill(p.year % 100, 2)],
    ['YYYY', p => zeroFill(p.year, 4)],
    ['YYYYY', p => zeroFill(p.year, 5)],
    ['YYYYYY', p => zeroFill(p.year, 6, true)],

    ['y', p => zeroFill(p.eraYear, 1)],
    ['yo', p => ordinal(p.eraYear)],
    ['yy', p => zeroFill(p.eraYear, 2)],
    ['yyy', p => zeroFill(p.eraYear, 3)],
    ['yyyy', p => zeroFill(p.eraYear, 4)],
    ['N', eraName(ERA_ABBREVIATIONS)],
    ['NN', eraName(ERA_ABBREVIATIONS)],
    ['NNN', eraName(ERA_ABBREVIATIONS)],
    ['NNNN', eraName({ AD: 'Anno Domini', BC: 'Before Christ' })],
    ['NNNNN', eraName(ERA_ABBREVIATIONS)],

    ['a', p => (p.hour > 11 ? 'pm' : 'am')],
    ['A', p => (p.hour > 11 ? 'PM' : 'AM')],
    ['H', p => p.hour],
    ['HH', p => zeroFill(p.hour, 2)],
    ['h', p => p.hour12],
    ['hh', p => zeroFill(p.hour12, 2)],
    ['k', p => p.hour || 24],
    ['kk', p => zeroFill(p.hour || 24, 2)],
    ['hmm', p => '' + p.hour12 + zeroFill(p.minute, 2)],
    ['hmmss', p => '' + p.hour12 + zeroFill(p.minute, 2) + zeroFill(p.second, 2)],
    ['Hmm', p => '' + p.hour + zeroFill(p.minute, 2)],
    ['Hmmss', p => '' + p.hour + zeroFill(p.minute, 2) + zeroFill(p.second, 2)],
    ['m', p => p.minute],
    ['mm', p => zeroFill(p.minute, 2)],
    ['s', p => p.second],
    ['ss', p => zeroFill(p.second, 2)],
    ['S', p => ~~(p.millisecond / 100)],
    ['SS', p => zeroFill(~~(p.millisecond / 10), 2)],
    ['SSS', p => zeroFill(p.millisecond, 3)],
    ['SSSS', p => zeroFill(p.millisecond * 10, 4)],
    ['SSSSS', p => zeroFill(p.millisecond * 100, 5)],
    ['SSSSSS', p => zeroFill(p.millisecond * 1000, 6)],
    ['SSSSSSS', p => zeroFill(p.millisecond * 10000, 7)],
    ['SSSSSSSS', p => zeroFill(p.millisecond * 100000, 8)],
    ['SSSSSSSSS', p => zeroFill(p.millisecond * 1000000, 9)],

    // always formatted in UTC or a fixed offset, never in a named zone
    ['z', () => 'UTC'],
    ['zz', () => 'Coordinated Universal Time'],
    ['Z', offsetFormatter(':')],
    ['ZZ', offsetFormatter('')],
    ['X', p => Math.floor(p.time / 1000)],
    ['x', p => p.time]
]);

function expandLongDateFormats(format: string): string {
    // moment repeats the expansion up to six times; an expansion never contains another one
    return format.replace(LOCAL_FORMATTING_TOKENS, token => LONG_DATE_FORMATS.get(token) || token);
}

/**
 * Formats a timestamp with moment format tokens, in UTC or shifted by `offset` minutes. Without a
 * format the output is ISO 8601, ending with Z in UTC and with the offset otherwise.
 */
export function formatDate(time: number, format: unknown, offset: number): string {
    // offset is applied the way moment's utcOffset() does: a NaN offset changes nothing, but is not UTC
    let shiftBy = (offset || 0) * MS_PER_MINUTE;
    let shifted = new Date(time + shiftBy);
    if (isNaN(shifted.getTime())) {
        return INVALID_DATE;
    }
    let pattern = typeof format === 'string' && format ? format : offset === 0 ? DEFAULT_FORMAT_UTC : DEFAULT_FORMAT;
    let parts = new DateParts(shifted, offset);
    let output = '';
    // line terminators are not matched by any token and drop out, as they do in moment
    for (let token of expandLongDateFormats(pattern).match(FORMATTING_TOKENS) || []) {
        let formatter = FORMATTERS.get(token);
        if (formatter) {
            output += formatter(parts);
        } else if (/\[[\s\S]/.test(token)) {
            output += token.replace(/^\[|\]$/g, '');
        } else {
            output += token.replace(/\\/g, '');
        }
    }
    return output;
}
