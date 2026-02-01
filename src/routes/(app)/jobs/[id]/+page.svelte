<script lang="ts">
	import { enhance } from '$app/forms';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import * as Card from '$lib/components/ui/card';
	import * as Table from '$lib/components/ui/table';
	import * as Dialog from '$lib/components/ui/dialog';
	import { describeCron } from '$lib/utils/cron';

	let { data } = $props();

	let deleteDialogOpen = $state(false);

	function formatDate(date: Date | string) {
		return new Date(date).toLocaleString();
	}

	function getStatusVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
		switch (status) {
			case 'active':
			case 'success':
				return 'default';
			case 'paused':
				return 'secondary';
			case 'failed':
			case 'timeout':
				return 'destructive';
			case 'running':
				return 'outline';
			default:
				return 'secondary';
		}
	}

	function formatDuration(start: Date | string, end: Date | string | null): string {
		if (!end) return 'Running...';
		const ms = new Date(end).getTime() - new Date(start).getTime();
		if (ms < 1000) return `${ms}ms`;
		if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
		return `${(ms / 60000).toFixed(1)}m`;
	}
</script>

<svelte:head>
	<title>{data.job.name} - Kronos</title>
</svelte:head>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex items-start justify-between">
		<div>
			<div class="flex items-center gap-3">
				<h1 class="text-3xl font-bold tracking-tight">{data.job.name}</h1>
				<Badge variant={getStatusVariant(data.job.status)}>{data.job.status}</Badge>
			</div>
			{#if data.job.description}
				<p class="text-muted-foreground mt-1">{data.job.description}</p>
			{/if}
			{#if data.job.tags.length > 0}
				<div class="flex gap-2 mt-2">
					{#each data.job.tags as tag}
						<Badge variant="outline">{tag}</Badge>
					{/each}
				</div>
			{/if}
		</div>
		<div class="flex gap-2">
			<form method="POST" action="?/toggleStatus" use:enhance>
				<Button variant="outline">
					{data.job.status === 'active' ? 'Pause' : 'Resume'}
				</Button>
			</form>
			<Button href="/jobs/{data.job.id}/edit">Edit</Button>
			<Button variant="destructive" onclick={() => (deleteDialogOpen = true)}>Delete</Button>
		</div>
	</div>

	<div class="grid gap-6 md:grid-cols-2">
		<!-- Schedule Card -->
		<Card.Root>
			<Card.Header>
				<Card.Title>Schedule</Card.Title>
			</Card.Header>
			<Card.Content>
				<code class="text-lg">{data.job.schedule}</code>
				<p class="text-muted-foreground mt-1">{describeCron(data.job.schedule)}</p>
			</Card.Content>
		</Card.Root>

		<!-- Configuration Card -->
		<Card.Root>
			<Card.Header>
				<Card.Title>Configuration</Card.Title>
			</Card.Header>
			<Card.Content class="space-y-2">
				<div class="flex justify-between">
					<span class="text-muted-foreground">Type</span>
					<Badge variant="outline">{data.job.type}</Badge>
				</div>
				<div class="flex justify-between">
					<span class="text-muted-foreground">Timeout</span>
					<span>{data.job.timeout / 1000}s</span>
				</div>
				<div class="flex justify-between">
					<span class="text-muted-foreground">Max Retries</span>
					<span>{data.job.retryPolicy.maxRetries || 0}</span>
				</div>
			</Card.Content>
		</Card.Root>
	</div>

	<!-- Job Config Details -->
	<Card.Root>
		<Card.Header>
			<Card.Title>Job Details</Card.Title>
		</Card.Header>
		<Card.Content>
			{#if data.job.type === 'shell'}
				<div class="space-y-2">
					<div>
						<span class="text-sm text-muted-foreground">Command</span>
						<pre class="mt-1 rounded bg-muted p-3 font-mono text-sm">{data.job.config.command}</pre>
					</div>
					{#if data.job.config.workingDir}
						<div>
							<span class="text-sm text-muted-foreground">Working Directory</span>
							<p class="font-mono">{data.job.config.workingDir}</p>
						</div>
					{/if}
				</div>
			{:else if data.job.type === 'http'}
				<div class="space-y-2">
					<div>
						<span class="text-sm text-muted-foreground">Endpoint</span>
						<p class="font-mono">
							<Badge variant="outline">{data.job.config.method}</Badge>
							{data.job.config.url}
						</p>
					</div>
					{#if data.job.config.headers && Object.keys(data.job.config.headers).length > 0}
						<div>
							<span class="text-sm text-muted-foreground">Headers</span>
							<pre class="mt-1 rounded bg-muted p-3 font-mono text-sm">{JSON.stringify(data.job.config.headers, null, 2)}</pre>
						</div>
					{/if}
				</div>
			{:else if data.job.type === 'docker'}
				<div class="space-y-2">
					<div>
						<span class="text-sm text-muted-foreground">Image</span>
						<p class="font-mono">{data.job.config.image}</p>
					</div>
					{#if data.job.config.command}
						<div>
							<span class="text-sm text-muted-foreground">Command</span>
							<pre class="mt-1 rounded bg-muted p-3 font-mono text-sm">{data.job.config.command.join(' ')}</pre>
						</div>
					{/if}
				</div>
			{/if}
		</Card.Content>
	</Card.Root>

	<!-- Recent Executions -->
	<Card.Root>
		<Card.Header class="flex flex-row items-center justify-between">
			<Card.Title>Recent Executions</Card.Title>
			<Button variant="outline" href="/jobs/{data.job.id}/executions">View All</Button>
		</Card.Header>
		<Card.Content>
			{#if data.job.executions.length === 0}
				<p class="text-muted-foreground text-center py-8">No executions yet</p>
			{:else}
				<Table.Root>
					<Table.Header>
						<Table.Row>
							<Table.Head>Status</Table.Head>
							<Table.Head>Trigger</Table.Head>
							<Table.Head>Started</Table.Head>
							<Table.Head>Duration</Table.Head>
							<Table.Head>Exit Code</Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each data.job.executions as execution}
							<Table.Row>
								<Table.Cell>
									<Badge variant={getStatusVariant(execution.status)}>{execution.status}</Badge>
								</Table.Cell>
								<Table.Cell>
									<Badge variant="outline">{execution.trigger}</Badge>
								</Table.Cell>
								<Table.Cell>{formatDate(execution.startedAt)}</Table.Cell>
								<Table.Cell>{formatDuration(execution.startedAt, execution.finishedAt)}</Table.Cell>
								<Table.Cell>
									{execution.exitCode !== null ? execution.exitCode : '-'}
								</Table.Cell>
							</Table.Row>
						{/each}
					</Table.Body>
				</Table.Root>
			{/if}
		</Card.Content>
	</Card.Root>
</div>

<!-- Delete Confirmation Dialog -->
<Dialog.Root bind:open={deleteDialogOpen}>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>Delete Job</Dialog.Title>
			<Dialog.Description>
				Are you sure you want to delete "{data.job.name}"? This will also delete all execution
				history. This action cannot be undone.
			</Dialog.Description>
		</Dialog.Header>
		<Dialog.Footer>
			<Button variant="outline" onclick={() => (deleteDialogOpen = false)}>Cancel</Button>
			<form method="POST" action="?/delete" use:enhance>
				<Button type="submit" variant="destructive">Delete</Button>
			</form>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
