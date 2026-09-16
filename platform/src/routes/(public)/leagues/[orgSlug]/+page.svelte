<script lang="ts">
	import { resolve } from '$app/paths';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<div class="mx-auto max-w-6xl px-4 py-16 text-center">
	<h1 class="text-2xl font-bold text-[#E8F0EA]">{data.leagueName}</h1>
	<p class="mt-2 text-sm text-[#8FA398]">No public seasons available yet.</p>
	<a href={resolve('/leagues')} class="mt-6 inline-block text-sm text-[#B8E05C] hover:underline"
		>← All leagues</a
	>
</div>
