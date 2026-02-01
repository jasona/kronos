<script lang="ts">
	import { enhance } from '$app/forms';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';

	let { data, form } = $props();
	let copied = $state(false);

	function copyApiKey() {
		if (form?.apiKey) {
			navigator.clipboard.writeText(form.apiKey);
			copied = true;
			setTimeout(() => (copied = false), 2000);
		}
	}
</script>

<svelte:head>
	<title>API Keys - Kronos</title>
</svelte:head>

<div class="space-y-6">
	<div>
		<h1 class="text-3xl font-bold tracking-tight">API Keys</h1>
		<p class="text-muted-foreground">Manage your API keys for programmatic access</p>
	</div>

	<Card.Root class="max-w-2xl">
		<Card.Header>
			<Card.Title>API Key</Card.Title>
			<Card.Description>
				Use your API key to authenticate requests to the Kronos API.
				Include it in the Authorization header as: Bearer YOUR_API_KEY
			</Card.Description>
		</Card.Header>
		<Card.Content class="space-y-4">
			{#if form?.message}
				<div
					class="rounded-md p-3 text-sm {form.success ? 'bg-green-500/10 text-green-600' : 'bg-destructive/10 text-destructive'}"
				>
					{form.message}
				</div>
			{/if}

			{#if form?.apiKey}
				<div class="space-y-2">
					<p class="text-sm font-medium text-destructive">
						Copy your new API key now. It will not be shown again!
					</p>
					<div class="flex gap-2">
						<Input value={form.apiKey} readonly class="font-mono" />
						<Button variant="outline" onclick={copyApiKey}>
							{copied ? 'Copied!' : 'Copy'}
						</Button>
					</div>
				</div>
			{:else if data.hasApiKey}
				<div class="space-y-2">
					<p class="text-sm text-muted-foreground">Current API key:</p>
					<code class="rounded bg-muted px-2 py-1 font-mono text-sm">{data.apiKeyPreview}</code>
				</div>
			{:else}
				<p class="text-sm text-muted-foreground">No API key generated yet.</p>
			{/if}
		</Card.Content>
		<Card.Footer class="flex gap-2">
			<form method="POST" action="?/generate" use:enhance>
				<Button type="submit" variant={data.hasApiKey ? 'outline' : 'default'}>
					{data.hasApiKey ? 'Regenerate API Key' : 'Generate API Key'}
				</Button>
			</form>
			{#if data.hasApiKey}
				<form method="POST" action="?/revoke" use:enhance>
					<Button type="submit" variant="destructive">Revoke API Key</Button>
				</form>
			{/if}
		</Card.Footer>
	</Card.Root>
</div>
