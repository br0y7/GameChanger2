export type SuccessState = { data: unknown };

export type FieldErrorsState<TSchema> = { errors: { [P in keyof TSchema]?: string[] } };

export type ErrorMessageState = { error: string };

export type CrudAction = 'create' | 'update' | 'delete';

export type AuthAction = 'login' | 'signup';

export type FormAction = CrudAction | AuthAction;

export type Resource = 'user' | 'player' | 'team' | 'coach' | 'season' | 'division' | 'league';

export type ResourceTarget = {
	id?: string;
	resource: Resource;
};

// Prevents TypeScript from collapsing the FormAction union into a generic 'string'.
// It stops collapsing since it sees a type intersection (&). An empty object ({})
// just means any value that is not null or undefined.
// SvelteKit uses the generic string for the form.action ActionData,
// but we want the autocomplete when using form.action inside a component.
type LooseString = string & {};

type FormState<TSchema> = {
	action: FormAction | LooseString;
	target: ResourceTarget;
} & SuccessState &
	FieldErrorsState<TSchema> &
	ErrorMessageState;

/**
 * Used in form components to standardize form actions' results.
 * Give this as the type of the form you pass as the prop.
 */
export type FormStateProp<TSchema> = Partial<FormState<TSchema>> | null | undefined;
