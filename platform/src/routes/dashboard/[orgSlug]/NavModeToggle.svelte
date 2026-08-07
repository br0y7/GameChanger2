<script lang="ts">
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import { mode, toggleMode } from 'mode-watcher';
	import SunIcon from '@lucide/svelte/icons/sun';
	import MoonIcon from '@lucide/svelte/icons/moon';
</script>

<Sidebar.Menu>
	<Sidebar.MenuItem>
		<Sidebar.MenuButton onclick={toggleMode}>
			<SunIcon
				class="inline-block h-[1.2rem] w-[1.2rem] scale-100 rotate-0 transition-all! dark:scale-0 dark:-rotate-90"
			/>
			<MoonIcon
				class="inline-block absolute h-[1.2rem] w-[1.2rem] scale-0 rotate-90 transition-all! dark:scale-100 dark:rotate-0"
			/>
			<span class="sr-only">Toggle theme</span>
			<span class="capitalize">Theme: {mode.current} Mode</span>
		</Sidebar.MenuButton>
	</Sidebar.MenuItem>
</Sidebar.Menu>
