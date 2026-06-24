type SuccessState<TData = void> = { data: TData };

type FieldErrorsState<TSchema> = { errors: { [P in keyof TSchema]?: string[] } };

type ErrorMessageState = { error: { message: string } };

/**
 * Used in Form Components to standardize form ActionData props.
 */
export type FormState<TSchema, TData = void> =
	| SuccessState<TData>
	| FieldErrorsState<TSchema>
	| ErrorMessageState;
