import { SQL } from 'bun';
import { DrizzleQueryError } from 'drizzle-orm';

export const getConstraint = (err: unknown) => {
	if (err instanceof DrizzleQueryError && err.cause instanceof SQL.PostgresError) {
		return err.cause.constraint;
	}
};

export const isConstraintError = (err: unknown, constraint: string) =>
	getConstraint(err) === constraint;
