<script lang="ts">
	import { page } from '$app/stores';
	import { enhance } from '$app/forms';
	import { Button } from '$lib/components/ui/button';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';

	let { children, data } = $props();

	const navItems = [
		{ href: '/dashboard', label: 'Dashboard' },
		{ href: '/jobs', label: 'Jobs' }
	];
</script>

<div class="min-h-screen bg-background">
	<!-- Header -->
	<header class="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
		<div class="container flex h-14 items-center">
			<div class="mr-4 flex">
				<a href="/dashboard" class="mr-6 flex items-center space-x-2">
					<span class="font-bold">Kronos</span>
				</a>
				<nav class="flex items-center space-x-6 text-sm font-medium">
					{#each navItems as item}
						<a
							href={item.href}
							class="transition-colors hover:text-foreground/80 {$page.url.pathname.startsWith(item.href) ? 'text-foreground' : 'text-foreground/60'}"
						>
							{item.label}
						</a>
					{/each}
				</nav>
			</div>
			<div class="flex flex-1 items-center justify-end space-x-2">
				<DropdownMenu.Root>
					<DropdownMenu.Trigger>
						<Button variant="ghost" size="sm">
							{data.user.username}
						</Button>
					</DropdownMenu.Trigger>
					<DropdownMenu.Content align="end">
						<DropdownMenu.Label>My Account</DropdownMenu.Label>
						<DropdownMenu.Separator />
						<DropdownMenu.Item href="/settings/api-keys">API Keys</DropdownMenu.Item>
						<DropdownMenu.Separator />
						<form method="POST" action="/auth/logout" use:enhance>
							<DropdownMenu.Item>
								<button type="submit" class="w-full text-left">Log out</button>
							</DropdownMenu.Item>
						</form>
					</DropdownMenu.Content>
				</DropdownMenu.Root>
			</div>
		</div>
	</header>

	<!-- Main content -->
	<main class="container py-6">
		{@render children()}
	</main>
</div>
