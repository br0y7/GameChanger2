<script lang="ts">
	import { gameTypeClass, gameTypeLabel } from '$lib/schemas/game';

	let { gameType }: { gameType?: string | null } = $props();
</script>

<span class="whitespace-nowrap {gameTypeClass(gameType)}">{gameTypeLabel(gameType)}</span>
