export type SuccessState<TData = void> = { data: TData };

export type FieldErrorsState<TSchema> = { errors: { [P in keyof TSchema]?: string[] } };

export type ErrorMessageState = { error: string };

type FormState<TSchema, TSuccess = void> = SuccessState<TSuccess> &
	FieldErrorsState<TSchema> &
	ErrorMessageState;

/**
 * Used in form components to standardize form actions' results.
 * Give this as the type of the form you pass as the prop.
 */
export type FormStateProp<TSchema, TSuccess = void> =
	| Partial<FormState<TSchema, TSuccess>>
	| null
	| undefined;
