// Differential test: formatDate used to be implemented with moment, and operators have stored
// templates relying on its output. Every input here is rendered both through the helper and
// through a copy of the moment-based helper it replaced, and the results have to be identical.
// moment is a devDependency for this test only.

import test from 'node:test';
import assert from 'node:assert/strict';
import moment from 'moment';

import { getTemplate } from '../src/templates.js';

// The helper as it was before moment was removed (2.1.0)
function momentParseDate(value: unknown): moment.Moment {
    if (value instanceof Date || typeof value === 'number') {
        return moment.utc(value);
    }
    if (moment.isMoment(value)) {
        return value.clone().utc();
    }
    if (typeof value !== 'string' || !value.trim()) {
        return moment.invalid();
    }
    let date = moment.utc(value.trim(), [moment.ISO_8601, moment.RFC_2822], true);
    if (!date.isValid()) {
        let parsed = new Date(value);
        date = isNaN(parsed.getTime()) ? moment.invalid() : moment.utc(parsed);
    }
    return date;
}

function momentFormatDate(timeStamp: unknown, dateFormat: unknown, timezoneOffset: unknown): string {
    let date = momentParseDate(timeStamp);
    if (!date.isValid()) {
        return '';
    }
    if (typeof timezoneOffset === 'string' || typeof timezoneOffset === 'number') {
        date = date.utcOffset(timezoneOffset);
    }
    return date.format(typeof dateFormat === 'string' && dateFormat ? dateFormat : undefined);
}

const render = getTemplate('{{formatDate d f o}}');

let comparisons = 0;
function check(d: unknown, f: unknown, o: unknown): void {
    comparisons++;
    let expected = momentFormatDate(d, f, o);
    let actual = render({ d, f, o });
    if (actual !== expected) {
        assert.fail(`formatDate(${describe(d)}, ${describe(f)}, ${describe(o)}): expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    }
}

function describe(value: unknown): string {
    if (value instanceof Date) {
        return `Date(${value.getTime()})`;
    }
    if (moment.isMoment(value)) {
        return `moment(${value.toISOString()}, ${value.utcOffset()})`;
    }
    return typeof value === 'number' ? String(value) : JSON.stringify(value);
}

// Seeded, so a failure reproduces (mulberry32)
/* eslint-disable no-bitwise */
function prng(seed: number): () => number {
    return () => {
        seed = (seed + 0x6d2b79f5) | 0;
        let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}
/* eslint-enable no-bitwise */
const random = prng(20261020);
const randomInt = (min: number, max: number): number => min + Math.floor(random() * (max - min + 1));
const pick = <T>(list: T[]): T => list[Math.floor(random() * list.length)]!;
const pad = (value: number, length = 2): string => String(value).padStart(length, '0');

// Every token moment formats, each on its own
const TOKENS = [
    'M',
    'Mo',
    'MM',
    'MMM',
    'MMMM',
    'Q',
    'Qo',
    'D',
    'Do',
    'DD',
    'DDD',
    'DDDo',
    'DDDD',
    'd',
    'do',
    'dd',
    'ddd',
    'dddd',
    'e',
    'E',
    'eHHmm',
    'w',
    'wo',
    'ww',
    'W',
    'Wo',
    'WW',
    'gg',
    'gggg',
    'ggggg',
    'GG',
    'GGGG',
    'GGGGG',
    'Y',
    'YY',
    'YYYY',
    'YYYYY',
    'YYYYYY',
    'y',
    'yo',
    'yy',
    'yyy',
    'yyyy',
    'N',
    'NN',
    'NNN',
    'NNNN',
    'NNNNN',
    'A',
    'a',
    'H',
    'HH',
    'h',
    'hh',
    'k',
    'kk',
    'hmm',
    'hmmss',
    'Hmm',
    'Hmmss',
    'm',
    'mm',
    's',
    'ss',
    'S',
    'SS',
    'SSS',
    'SSSS',
    'SSSSS',
    'SSSSSS',
    'SSSSSSS',
    'SSSSSSSS',
    'SSSSSSSSS',
    'z',
    'zz',
    'Z',
    'ZZ',
    'X',
    'x',
    'LT',
    'LTS',
    'L',
    'LL',
    'LLL',
    'LLLL',
    'l',
    'll',
    'lll',
    'llll'
];

// The examples in the EmailEngine documentation and SendGrid's, plus escaping and literal text
const PATTERNS = [
    'YYYY-MM-DD',
    'YYYY-MM-DD HH:mm',
    'YYYY-MM-DD HH:mm:ss',
    'MMMM D, YYYY',
    'MMMM Do, YYYY',
    'dddd, MMMM Do YYYY, h:mm:ss a',
    'ddd, hA',
    'MM/DD/YYYY',
    'DD/MM/YYYY',
    'D MMM YYYY',
    'h:mm A',
    'HH:mm',
    'HH:mm:ss.SSS',
    'YYYY-MM-DDTHH:mm:ssZ',
    'YYYY-MM-DDTHH:mm:ss.SSSZZ',
    'ddd, DD MMM YYYY HH:mm:ss ZZ',
    'YYYY [escaped] YYYY',
    '[Today is] dddd',
    '[[nested]] [] [unclosed',
    '\\Y\\Y \\[Y\\] \\e eHHmm',
    'GGGG-[W]WW-E',
    'gggg-[w]ww-e',
    'Qo [quarter], DDDo [day], wo [week]',
    'X x',
    'w| W|',
    'line\nbreak\r\u2028end',
    'Lorem ipsum dolor sit amet',
    'The time is LT on LL',
    '[LT] \\LT LTS',
    '\u00e9\u6f22\u5b57 YYYY'
];

const OFFSETS: unknown[] = [
    undefined,
    null,
    '+0200',
    '-05:00',
    '+05',
    '-0330',
    '+05:45',
    '+14:00',
    '-12:00',
    '+14:01',
    '-12:01',
    '+05:60',
    'Z',
    'z',
    '+00:00',
    '-00:00',
    'UTC+0200',
    '+0100 +0300',
    'GMT',
    'Europe/Zurich',
    '120',
    '',
    0,
    -0,
    2,
    -5,
    5.5,
    -9.75,
    15,
    15.99,
    16,
    -16,
    120,
    -300,
    90.5,
    1e7,
    -1e9,
    1e12,
    NaN,
    Infinity,
    -Infinity,
    true,
    {}
];

function randomTime(fromYear: number, toYear: number): number {
    let start = Date.UTC(fromYear, 0, 1);
    let end = Date.UTC(toYear + 1, 0, 1);
    return start + Math.floor(random() * (end - start));
}

// Instants across 1900..2100: random ones, leap days and the days around year and week boundaries
const TIMES: number[] = [];
for (let i = 0; i < 400; i++) {
    TIMES.push(randomTime(1900, 2100));
}
for (let year = 1900; year <= 2100; year += randomInt(1, 7)) {
    if ((year % 4 === 0 && year % 100 !== 0) || year % 400 === 0) {
        TIMES.push(Date.UTC(year, 1, 29, randomInt(0, 23), randomInt(0, 59), randomInt(0, 59), randomInt(0, 999)));
    }
    for (let [month, day] of [
        [0, 1],
        [0, 2],
        [0, 3],
        [0, 4],
        [0, 7],
        [11, 28],
        [11, 29],
        [11, 30],
        [11, 31],
        [1, 28],
        [2, 1]
    ]) {
        TIMES.push(Date.UTC(year, month!, day!, pick([0, 0, 11, 12, 23]), pick([0, 30, 59]), randomInt(0, 59), randomInt(0, 999)));
    }
}
// noon and midnight edges, the epoch, and a few years far outside the usual range
TIMES.push(0, -1, 1, Date.UTC(2024, 0, 1, 0, 0, 0, 0), Date.UTC(2024, 0, 1, 12, 0, 0, 0), Date.UTC(2024, 0, 1, 23, 59, 59, 999));
TIMES.push(Date.UTC(-500, 5, 15, 10), Date.UTC(10000, 0, 1), Date.UTC(123456, 6, 1), new Date('0050-03-01T00:00:00Z').getTime(), 8.64e15, -8.64e15);

test('every token renders as moment rendered it', () => {
    for (let time of TIMES) {
        let offset = pick(OFFSETS);
        for (let token of TOKENS) {
            check(time, token, offset);
        }
    }
});

test('every token with every offset form', () => {
    for (let time of TIMES.slice(0, 40)) {
        for (let offset of OFFSETS) {
            check(time, TOKENS.join('|'), offset);
        }
    }
});

test('documented and literal patterns', () => {
    for (let time of TIMES) {
        for (let pattern of PATTERNS) {
            check(time, pattern, pick(OFFSETS));
        }
    }
});

test('default format, with and without an offset', () => {
    for (let time of TIMES) {
        for (let format of [undefined, '', null, 0, 5, true]) {
            for (let offset of OFFSETS) {
                check(time, format, offset);
            }
        }
    }
});

function isoStrings(time: number): string[] {
    let date = new Date(time);
    let y = date.getUTCFullYear();
    let year = y >= 0 && y <= 9999 ? pad(y, 4) : (y < 0 ? '-' : '+') + pad(Math.abs(y), 6);
    let mo = pad(date.getUTCMonth() + 1);
    let d = pad(date.getUTCDate());
    let h = pad(date.getUTCHours());
    let mi = pad(date.getUTCMinutes());
    let s = pad(date.getUTCSeconds());
    let ms = pad(date.getUTCMilliseconds(), 3);
    let doy = pad(Math.round((Date.UTC(y, date.getUTCMonth(), date.getUTCDate()) - Date.UTC(y, 0, 1)) / 864e5) + 1, 3);
    let week = pad(randomInt(0, 54));
    let tz = pick(['Z', '+02:00', '-0530', '+05', '-12:00', '+14:00', '+15:00', '-12:30', '+05:61', ' Z', 'z', '']);
    return [
        date.toISOString(),
        `${year}-${mo}-${d}`,
        `${year}-${mo}`,
        `${year}`,
        `${year}-${mo}-${d}T${h}:${mi}`,
        `${year}-${mo}-${d} ${h}:${mi}:${s}`,
        `${year}-${mo}-${d}T${h}:${mi}:${s}.${ms}${tz}`,
        `${year}-${mo}-${d}T${h}:${mi}:${s},${ms}${randomInt(0, 99)}${tz}`,
        `${year}-${mo}-${d}T${h}${tz}`,
        `${year}${mo}${d}`,
        `${year}${mo}${d}T${h}${mi}${s}${tz}`,
        `${year}${mo}${d} ${h}${mi}`,
        `${year}${mo}`,
        `${year}-${doy}`,
        `${year}${doy}T${h}`,
        `${year}-W${week}`,
        `${year}-W${week}-${randomInt(0, 9)}`,
        `${year}W${week}${randomInt(0, 9)}T${h}:${mi}`,
        `${year}-${mo}-${d}T24:00`,
        `${year}-${mo}-${d}T24:00:00.000Z`,
        `${year}-${mo}-${d}T24:01`,
        `${year}-${mo}-${d}T${h}:${mi}:60`,
        `${year}-${mo}-${pad(randomInt(28, 32))}`,
        `${year}-${pad(randomInt(0, 13))}-${d}`,
        `${year}-${pad(randomInt(0, 400), 3)}`,
        `+00${year}-${mo}-${d}`,
        `${year}-${mo}-${d}t${h}:${mi}`,
        `  ${year}-${mo}-${d}T${h}:${mi}Z  `
    ];
}

function rfcStrings(time: number): string[] {
    let date = new Date(time);
    let y = date.getUTCFullYear();
    let day = date.getUTCDate();
    let month = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][date.getUTCMonth()];
    let weekday = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getUTCDay()];
    let wrongWeekday = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][(date.getUTCDay() + 1) % 7];
    let time24 = `${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}`;
    let seconds = pad(date.getUTCSeconds());
    let zone = pick(['+0000', '-0700', '+0530', '+0099', 'GMT', 'UT', 'EST', 'EDT', 'CST', 'CDT', 'MST', 'MDT', 'PST', 'PDT', 'Z', 'z', 'XST', 'A']);
    return [
        `${weekday}, ${pad(day)} ${month} ${y} ${time24}:${seconds} ${zone}`,
        `${weekday} ${day} ${month} ${y} ${time24} ${zone}`,
        `${day} ${month} ${y} ${time24}:${seconds} ${zone}`,
        `${wrongWeekday}, ${day} ${month} ${y} ${time24} ${zone}`,
        `${day} ${month} ${pad(y % 100)} ${time24} ${zone}`,
        `${day} ${month} ${y % 1000} ${time24} ${zone}`,
        `${weekday}, ${day} (comment) ${month}\t${y}  ${time24} ${zone} (more)`,
        `${pad(randomInt(0, 35))} ${month} ${y} ${pad(randomInt(0, 25))}:${pad(randomInt(0, 61))}:${pad(randomInt(0, 61))} ${zone}`,
        `${day} ${month.toUpperCase()} ${y} ${time24} ${zone}`
    ];
}

test('ISO 8601, RFC 2822, epoch, Date and moment inputs', () => {
    let formats = ['YYYY-MM-DDTHH:mm:ss.SSSZ', 'x', 'GGGG-[W]WW-E dddd', undefined];
    for (let time of TIMES) {
        for (let input of [...isoStrings(time), ...rfcStrings(time)]) {
            for (let format of formats) {
                check(input, format, pick(OFFSETS));
            }
        }
        check(time, 'x', undefined);
        check(new Date(time), 'YYYY-MM-DDTHH:mm:ss.SSSZ', pick(OFFSETS));
        check(moment.utc(time), 'YYYY-MM-DDTHH:mm:ss.SSSZ', pick(OFFSETS));
        check(moment.utc(time).utcOffset(randomInt(-720, 840)), 'x Z', pick(OFFSETS));
        check(String(time), 'x', undefined);
    }
});

test('strings only Date can parse, and invalid input', () => {
    let inputs: unknown[] = [
        'July 5, 2020 12:00',
        'Jan 15 2024 10:00 GMT+0200',
        '2024/01/15 10:00 UTC',
        '01/15/2024',
        'Mon Jan 15 2024 10:00:00 GMT+0000 (Coordinated Universal Time)',
        'Wed, 01 Jan 2020 10:00:00 +0200',
        '2024-01-15T10:00:00+05:30:00',
        '2024-01-15T10:00:00.123456789Z',
        '2024-01-15T10:00:00.029Z',
        '2024-02-30',
        '2023-02-29',
        '2024-02-29',
        '1900-02-29',
        '2000-02-29',
        '2024-W53-1',
        '2026-W53-1',
        '2024-W00-1',
        '2024-W01-0',
        '2024-W01-8',
        '2024-000',
        '2024-366',
        '2023-366',
        '-000001-01-01',
        '+275760-09-13T00:00:00Z',
        '+275760-09-13T00:00:01Z',
        '1 Jan 0049 00:00 +0000',
        '1 Jan 0999 00:00 +0000',
        '31 Feb 2024 10:00 +0000',
        '29 Feb 2023 10:00 +0000',
        '0 Jan 2024 10:00 +0000',
        '1 Jan 2024 24:00:00 +0000',
        '1 Jan 2024 23:60 +0000',
        '1 Jan 2024 23:59:60 +0000',
        '',
        '   ',
        'not a date',
        'tomorrow',
        '0',
        '1700000000000',
        null,
        undefined,
        true,
        false,
        {},
        [],
        [2024, 1, 15],
        NaN,
        Infinity,
        -Infinity,
        8.64e15 + 1,
        1.5,
        -1.5,
        new Date(NaN),
        moment.invalid(),
        moment.parseZone('2024-01-15T10:00:00+05:30')
    ];
    for (let input of inputs) {
        for (let format of ['YYYY-MM-DD HH:mm:ss.SSS Z', 'x', undefined]) {
            for (let offset of OFFSETS) {
                check(input, format, offset);
            }
        }
    }
});

test('random strings near ISO 8601 and RFC 2822 parse as moment parsed them', () => {
    let isoAlphabet = '0123456789-:T WZ+.,';
    let samples: string[] = [];
    for (let i = 0; i < 3000; i++) {
        let length = randomInt(4, 28);
        let value = '';
        for (let j = 0; j < length; j++) {
            value += pick([...isoAlphabet]);
        }
        samples.push(value);
    }
    // valid strings with one character replaced, dropped or doubled
    for (let i = 0; i < 3000; i++) {
        let source = pick([...isoStrings(pick(TIMES)), ...rfcStrings(pick(TIMES))]);
        let position = randomInt(0, source.length - 1);
        let mutation = randomInt(0, 2);
        samples.push(
            mutation === 0
                ? source.slice(0, position) + pick([...isoAlphabet]) + source.slice(position + 1)
                : mutation === 1
                  ? source.slice(0, position) + source.slice(position + 1)
                  : source.slice(0, position) + source[position] + source.slice(position)
        );
    }
    for (let sample of samples) {
        check(sample, 'x', undefined);
    }
});

test('random format strings render as moment rendered them', () => {
    let alphabet = 'YMDdHhmsSAaZzEeWwGgQXxkNyLlo[]\\ -:/.,|\n';
    for (let i = 0; i < 4000; i++) {
        let length = randomInt(1, 14);
        let format = '';
        for (let j = 0; j < length; j++) {
            format += pick([...alphabet]);
        }
        // moment throws on a format made of line terminators only, the helper renders nothing
        if (/^\n+$/.test(format)) {
            continue;
        }
        check(pick(TIMES), format, pick(OFFSETS));
    }
});

test('a format made of line terminators only renders nothing', () => {
    // the one deliberate difference: moment threw a TypeError here
    assert.throws(() => momentFormatDate(0, '\n', undefined), TypeError);
    assert.equal(render({ d: 0, f: '\n' }), '');
});

test('comparison count', () => {
    // a guard against the loops above silently shrinking
    assert.ok(comparisons > 100000, `${comparisons} comparisons`);
});
