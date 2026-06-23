import { type Session, type User } from '$lib/server/auth';
import type { Onboarding } from '$lib/server/db/schema';

// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		interface Locals {
			session?: Session['session'];
			user?: User;
			onboarding?: Onboarding;
		}

		// interface Error {}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
