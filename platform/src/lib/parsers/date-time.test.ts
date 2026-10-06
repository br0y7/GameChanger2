import { describe, expect, test } from 'bun:test';
import { applySheetTime, parseSheetDate } from './date-time';
import { SpreadsheetParserError } from './base';

const TIME_ZONE = 'America/Winnipeg';

describe('parseSheetDate', () => {
	test('reads a Date cell as that calendar day', () => {
		expect(
			parseSheetDate(new Date(Date.UTC(2026, 7, 23)), TIME_ZONE).toPlainDate().toString()
		).toBe('2026-08-23');
	});

	test('reads excel date values', () => {
		// 2026-08-23 as an excel serial
		expect(parseSheetDate(46257, TIME_ZONE).toPlainDate().toString()).toBe('2026-08-23');
		expect(parseSheetDate('46257', TIME_ZONE).toPlainDate().toString()).toBe('2026-08-23');
	});

	test('reads dates typed as text', () => {
		const expected = '2026-08-23';
		expect(parseSheetDate('2026-08-23', TIME_ZONE).toPlainDate().toString()).toBe(expected);
		expect(parseSheetDate('2026/08/23', TIME_ZONE).toPlainDate().toString()).toBe(expected);
		expect(parseSheetDate('August 23, 2026', TIME_ZONE).toPlainDate().toString()).toBe(expected);
		expect(parseSheetDate('Aug 23 2026', TIME_ZONE).toPlainDate().toString()).toBe(expected);
		expect(parseSheetDate('23rd August 2026', TIME_ZONE).toPlainDate().toString()).toBe(expected);
		expect(parseSheetDate('8/23/2026', TIME_ZONE).toPlainDate().toString()).toBe(expected);
		expect(parseSheetDate('23/8/2026', TIME_ZONE).toPlainDate().toString()).toBe(expected);
		expect(parseSheetDate('8/23/26', TIME_ZONE).toPlainDate().toString()).toBe(expected);
	});

	test('reads a month-first numeric date when the day does not disambiguate it', () => {
		expect(parseSheetDate('5/6/2026', TIME_ZONE).toPlainDate().toString()).toBe('2026-05-06');
	});

	test('keeps a time written on the date', () => {
		expect(parseSheetDate('2026-08-23 7:05 PM', TIME_ZONE).toPlainTime().toString()).toBe(
			'19:05:00'
		);
		expect(parseSheetDate('2026-08-23T19:05', TIME_ZONE).toPlainTime().toString()).toBe('19:05:00');
		expect(parseSheetDate('2026-08-23', TIME_ZONE).toPlainTime().toString()).toBe('00:00:00');
	});

	test('rejects dates it cannot read', () => {
		expect(() => parseSheetDate('2026-02-30', TIME_ZONE)).toThrow(SpreadsheetParserError);
		expect(() => parseSheetDate('next tuesday', TIME_ZONE)).toThrow(SpreadsheetParserError);
		expect(() => parseSheetDate('', TIME_ZONE)).toThrow(SpreadsheetParserError);
		expect(() => parseSheetDate(null, TIME_ZONE)).toThrow(SpreadsheetParserError);
	});
});

describe('applySheetTime', () => {
	const date = parseSheetDate('2026-08-23', TIME_ZONE);

	test('reads excel time values', () => {
		expect(applySheetTime(date, 0.5).toPlainTime().toString()).toBe('12:00:00');
		expect(
			applySheetTime(date, new Date(Date.UTC(1899, 11, 30, 10, 0, 0)))
				.toPlainTime()
				.toString()
		).toBe('10:00:00');
	});

	test('reads times typed as text', () => {
		expect(applySheetTime(date, '7:05 PM').toPlainTime().toString()).toBe('19:05:00');
		expect(applySheetTime(date, '19:05').toPlainTime().toString()).toBe('19:05:00');
		expect(applySheetTime(date, '12:00 AM').toPlainTime().toString()).toBe('00:00:00');
	});

	test('replaces a time already carried by the date', () => {
		const dated = parseSheetDate('2026-08-23 7:05 PM', TIME_ZONE);
		expect(applySheetTime(dated, '9:00 AM').toPlainTime().toString()).toBe('09:00:00');
	});

	test('rejects times it cannot read', () => {
		expect(() => applySheetTime(date, 'halftime')).toThrow(SpreadsheetParserError);
		expect(() => applySheetTime(date, '25:00')).toThrow(SpreadsheetParserError);
	});
});
