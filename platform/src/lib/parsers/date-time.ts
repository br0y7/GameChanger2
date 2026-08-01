import { SpreadsheetParserError } from './base';
import { Temporal } from 'temporal-polyfill';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

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
