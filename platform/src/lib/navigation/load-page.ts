/** Full page load. Client-side `goto` can freeze the UI the same way a hung view transition did. */
export function loadPage(href: string) {
	window.location.assign(href);
}
