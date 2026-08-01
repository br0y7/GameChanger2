export type SuccessState = { data: unknown };

export type FieldErrorsState<TSchema> = { errors: { [P in keyof TSchema]?: string[] } };

export type ErrorMessageState = { error: string };

export type CrudAction = 'create' | 'read' | 'update' | 'delete';

export type AuthAction = 'login' | 'signup';

export type FormAction = CrudAction | AuthAction;

export type Resource =
	'user' | 'player' | 'team' | 'coach' | 'season' | 'division' | 'league' | 'organization';

export type ResourceTarget = {
	id?: string;
	resource: Resource;
};
