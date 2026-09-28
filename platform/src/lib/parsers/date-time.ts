import { SpreadsheetParserError } from './base';
import { Temporal } from 'temporal-polyfill';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const MONTHS: Record<string, number> = {
	jan: 1,
	january: 1,
	feb: 2,
	february: 2,
	mar: 3,
	march: 3,
	apr: 4,
	april: 4,
	may: 5,
	jun: 6,
	june: 6,
	jul: 7,
	july: 7,
	aug: 8,
	august: 8,
	sep: 9,
	sept: 9,
	september: 9,
	oct: 10,
	october: 10,
	nov: 11,
	november: 11,
	dec: 12,
	december: 12,
};

/** A time tacked onto the end of a date cell, eg. "2026-08-23 7:00 PM" or "2026-08-23T19:00". */
const TRAILING_TIME = /[\sT]+\d{1,2}:\d{2}(?::\d{2})?\s*(?:am|pm)?$/i;

const CLOCK_TIME = /^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(am|pm)?$/i;

/**
 * Converts excel date value into a Temporal Date
 * @param date Excel date value
 * @param timeZone IANA Time zone eg. America/Winnipeg
 * @returns ZonedDateTime
 * @throws SpreadsheetParserError
 */
export function convertExcelDate(date: number, timeZone: string) {
	if (typeof date !== 'number' || date < 0) {
		throw new SpreadsheetParserError(`Invalid date ${date}. Expected date > 0`);
	}

	// apparently excel date starts at this
	const EXCEL_EPOCH = Temporal.PlainDate.from({ year: 1899, month: 12, day: 30 });

	const convertedDate = EXCEL_EPOCH.add({ milliseconds: Math.round(date * MS_PER_DAY) });

	return convertedDate.toZonedDateTime(timeZone);
}

/**
 * Applies the excel time to the date.
 * @param date Date without time info
 * @param time Raw fractional time value in excel
 * @returns New Date with the time applied
 * @throws SpreadsheetParserError
 */
export function applyExcelTime(date: Temporal.ZonedDateTime, time: number) {
	if (typeof time !== 'number' || time < 0 || time > 1) {
		throw new SpreadsheetParserError(`Invalid time ${time}. Expected fractional excel time`);
	}

	return date.add({ milliseconds: Math.round(time * MS_PER_DAY) });
}

function toPlainDate(year: number, month: number, day: number) {
	try {
		return Temporal.PlainDate.from({ year, month, day }, { overflow: 'reject' });
	} catch {
		return null;
	}
}

/** Reads a date typed as text rather than entered as a real date cell. */
function parseWrittenDate(text: string) {
	const cleaned = text.trim().replace(/,/g, ' ').replace(/\s+/g, ' ');

	const isoMatch = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/.exec(cleaned);
	if (isoMatch) {
		return toPlainDate(Number(isoMatch[1]), Number(isoMatch[2]), Number(isoMatch[3]));
	}

	const monthFirst = /^([a-z]+)\.? (\d{1,2})(?:st|nd|rd|th)? (\d{4})$/i.exec(cleaned);
	if (monthFirst) {
		const month = MONTHS[monthFirst[1].toLowerCase()];
		return month ? toPlainDate(Number(monthFirst[3]), month, Number(monthFirst[2])) : null;
	}

	const dayFirst = /^(\d{1,2})(?:st|nd|rd|th)? ([a-z]+)\.? (\d{4})$/i.exec(cleaned);
	if (dayFirst) {
		const month = MONTHS[dayFirst[2].toLowerCase()];
		return month ? toPlainDate(Number(dayFirst[3]), month, Number(dayFirst[1])) : null;
	}

	const numeric = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2}|\d{4})$/.exec(cleaned);
	if (numeric) {
		const year = numeric[3].length === 2 ? 2000 + Number(numeric[3]) : Number(numeric[3]);
		const first = Number(numeric[1]);
		const second = Number(numeric[2]);
		// 23/08 can only be day-first; anything still ambiguous is read as month-first.
		return first > 12 ? toPlainDate(year, second, first) : toPlainDate(year, first, second);
	}

	return null;
}

function parseClockTime(text: string) {
	const match = CLOCK_TIME.exec(text.trim());
	if (!match) return null;

	let hour = Number(match[1]);
	const minute = Number(match[2]);
	const second = match[3] ? Number(match[3]) : 0;
	const meridiem = match[4]?.toLowerCase();

	if (meridiem === 'pm' && hour < 12) hour += 12;
	if (meridiem === 'am' && hour === 12) hour = 0;
	if (hour > 23 || minute > 59 || second > 59) return null;

	return { hour, minute, second };
}

/**
 * Reads a Date row cell: an excel date value, or text like "2026-08-23", "August 23 2026" or "8/23/2026".
 * @throws SpreadsheetParserError
 */
export function parseSheetDate(value: unknown, timeZone: string) {
	if (typeof value === 'number') return convertExcelDate(value, timeZone);

	const text = typeof value === 'string' ? value.trim() : '';
	if (text === '') {
		throw new SpreadsheetParserError(
			`Invalid date ${String(value)}. Use a date cell or text like 2026-08-23.`
		);
	}

	// An excel date value can arrive as text when the cell is formatted as text.
	if (/^\d+(?:\.\d+)?$/.test(text)) return convertExcelDate(Number(text), timeZone);

	let dateText = text;
	let time: ReturnType<typeof parseClockTime> = null;

	const trailing = TRAILING_TIME.exec(text);
	if (trailing) {
		time = parseClockTime(trailing[0].replace(/^[\sT]+/, ''));
		if (time) dateText = text.slice(0, trailing.index);
	}

	const date = parseWrittenDate(dateText);
	if (!date) {
		throw new SpreadsheetParserError(
			`Invalid date "${text}". Use a date cell or text like 2026-08-23, August 23 2026, or 8/23/2026.`
		);
	}

	const zoned = date.toZonedDateTime(timeZone);
	return time ? zoned.with(time) : zoned;
}

/**
 * Applies a Time row cell to the date: an excel time value, or text like "7:00 PM".
 * @throws SpreadsheetParserError
 */
export function applySheetTime(date: Temporal.ZonedDateTime, value: unknown) {
	// The date may already carry a time when it was written as "2026-08-23 7:00 PM".
	const startOfDay = date.startOfDay();

	if (typeof value === 'number') return applyExcelTime(startOfDay, value);

	if (typeof value === 'string') {
		const time = parseClockTime(value);
		if (time) return startOfDay.with(time);
	}

	throw new SpreadsheetParserError(
		`Invalid time ${String(value)}. Use a time cell or text like 7:00 PM.`
	);
}
