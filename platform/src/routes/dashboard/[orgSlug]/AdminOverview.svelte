<script lang="ts">
	import { requireAdmin } from '$lib/api/auth.remote';
	import { getUserCount } from '$lib/api/user.remote';
	import type { Organization } from '$lib/server/db/auth-schema';
	import * as Card from '$lib/components/ui/card/index.js';
	import * as Alert from '$lib/components/ui/alert/index.js';
	import InfoIcon from '@lucide/svelte/icons/info';
	import SubmitButton from '$lib/components/SubmitButton.svelte';
	import { createLeague } from '$lib/api/league.remote';
	import * as Field from '$lib/components/ui/field/index.js';
	import NameSlugFields from '$lib/forms/NameSlugFields.svelte';
	import { leagueFormLabels } from '$lib/forms/labels';
	import ErrorAlert from '$lib/components/ErrorAlert.svelte';

	let { org }: { org: Organization } = $props();
	await requireAdmin();

	const submitting = $derived(!!createLeague.pending);
</script>

<div class="m-6 flex flex-col gap-6">
	<h1 class="text-2xl font-bold">{org.name} Overview</h1>

	<section>
		<h2 class="text-xl">Metrics</h2>
		<p>Number of users: {await getUserCount()}</p>
	</section>

	<section class="max-w-xl">
		<Card.Root>
			<Card.Header>
				<Card.Title class="text-center text-xl">Create a League</Card.Title>
				<Card.Description class="space-y-3">
					Manage seasons and divisions from the league dashboard, and import stats once they're set
					up.
				</Card.Description>
			</Card.Header>
			<form class="contents" {...createLeague}>
				<Card.Content>
					<Field.Set disabled={submitting}>
						<Field.Group>
							<NameSlugFields
								labels={leagueFormLabels}
								remoteFields={{ name: createLeague.fields.name, slug: createLeague.fields.slug }}
								required
							/>
							<ErrorAlert errors={createLeague.fields.issues()} />
						</Field.Group>
					</Field.Set>
				</Card.Content>
				<Card.Footer class="flex flex-col gap-4">
					<Alert.Root>
						<InfoIcon class="size-6 stroke-info" />
						<Alert.Title>You will be redirected</Alert.Title>
						<Alert.Description>
							After creating the league, you'll be redirected to its dashboard. You can return to
							the admin org by selecting it from the top-left sidebar.
						</Alert.Description>
					</Alert.Root>

					<SubmitButton {submitting} class="w-full sm:w-4/5">Create League</SubmitButton>
				</Card.Footer>
			</form>
		</Card.Root>
	</section>
</div>
