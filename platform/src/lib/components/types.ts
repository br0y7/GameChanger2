/**
 * Used for extending a component's props
 * to conditionally show actions.
 */
export interface ActionVisibility {
	canEdit?: boolean;
	canDelete?: boolean;
}
