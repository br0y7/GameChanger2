import type { SpreadsheetPreview } from '$lib/schemas/preview';
import type { WorkBook } from 'xlsx';

/** Use this so you can have multiple version later */
export type SpreadsheetParserVersion = 'v1';
export const spreadsheetParserVersions: SpreadsheetParserVersion[] = ['v1'];

export interface SpreadsheetParseOptions {
	timeZone: string;
}

export interface SpreadsheetParser {
	version: SpreadsheetParserVersion;
	parse: (workbook: WorkBook, options: SpreadsheetParseOptions) => SpreadsheetPreview;
}

export class SpreadsheetParserError extends Error {
	readonly issues: string[];

	constructor(message: string, options?: ErrorOptions & { issues?: string[] }) {
		super(message, options);
		this.name = 'SpreadsheetParserError';
		this.issues = options?.issues?.length ? options.issues : [message];
	}
}
