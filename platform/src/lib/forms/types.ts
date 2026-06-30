export type SuccessState = { data: unknown };

export type FieldErrorsState<TSchema> = { errors: { [P in keyof TSchema]?: string[] } };

export type ErrorMessageState = { error: string };

export type CrudAction = 'create' | 'update' | 'delete';

export type AuthAction = 'login' | 'signup';

export type FormAction = CrudAction | AuthAction;

export type Resource = 'auth' | 'player' | 'team' | 'coach' | 'season' | 'division' | 'league';

export type ResourceTarget = {
	id?: string;
	resource: Resource;
};

type FormState<TSchema> = {
	action: FormAction;
	target: ResourceTarget;
} & SuccessState &
	FieldErrorsState<TSchema> &
	ErrorMessageState;

/**
 * Used in form components to standardize form actions' results.
 * Give this as the type of the form you pass as the prop.
 */
export type FormStateProp<TSchema> = Partial<FormState<TSchema>> | null | undefined;
