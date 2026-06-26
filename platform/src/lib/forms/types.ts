export type SuccessState = { data: unknown };

export type FieldErrorsState<TSchema> = { errors: { [P in keyof TSchema]?: string[] } };

export type ErrorMessageState = { error: string };

type FormState<TSchema> = SuccessState & FieldErrorsState<TSchema> & ErrorMessageState;

/**
 * Used in form components to standardize form actions' results.
 * Give this as the type of the form you pass as the prop.
 */
export type FormStateProp<TSchema> = Partial<FormState<TSchema>> | null | undefined;
