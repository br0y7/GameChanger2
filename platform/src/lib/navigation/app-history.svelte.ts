/** True after an in-app navigation, so Back returns to the previous page. */
export const appHistory = $state({
	canGoBack: false,
});

export function noteNavigation(canGoBack: boolean) {
	appHistory.canGoBack = canGoBack;
}
