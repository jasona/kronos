<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import * as Table from '$lib/components/ui/table';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import * as Dialog from '$lib/components/ui/dialog';

	let { data } = $props();

	let selectedExecution = $state<string | null>(null);
	let logs = $state<Array<{ id: string; stream: string; content: string; createdAt: Date }>>([]);
	let loadingLogs = $state(false);
	let logDialogOpen = $state(false);

	function formatDate(date: Date | string) {
		return new Date(date).toLocaleString();
	}

	function formatDuration(start: Date | string, end: Date | string | null): string {
		if (!end) return 'Running...';
		const ms = new Date(end).getTime() - new Date(start).getTime();
		if (ms < 1000) return `${ms}ms`;
		if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
		return `${(ms / 60000).toFixed(1)}m`;
	}

	function getStatusVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
		switch (status) {
			case 'success':
				return 'default';
			case 'failed':
			case 'timeout':
				return 'destructive';
			case 'running':
				return 'outline';
			default:
				return 'secondary';
		}
	}

	async function viewLogs(executionId: string) {
		selectedExecution = executionId;
		loadingLogs = true;
		logDialogOpen = true;

		try {
			const response = await fetch(`/api/executions/${executionId}`);
			if (response.ok) {
				const execution = await response.json();
				logs = execution.logs;
			}
		} catch (err) {
			console.error('Failed to load logs:', err);
		} finally {
			loadingLogs = false;
		}
	}

	function changePage(newPage: number) {
		const url = new URL($page.url);
		url.searchParams.set('page', String(newPage));
		goto(url.toString());
	}

	function changeStatus(status: string | null) {
		const url = new URL($page.url);
		if (status) {
			url.searchParams.set('status', status);
		} else {
			url.searchParams.delete('status');
		}
		url.searchParams.delete('page');
		goto(url.toString());
	}
</script>

<svelte:head>
	<title>Execution History - {data.job.name} - Kronos</title>
</svelte:head>

<div class="space-y-6">
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold tracking-tight">Execution History</h1>
			<p class="text-muted-foreground">
				<a href="/jobs/{data.job.id}" class="hover:underline">{data.job.name}</a>
			</p>
		</div>
		<Button href="/jobs/{data.job.id}">Back to Job</Button>
	</div>

	<!-- Filters -->
	<div class="flex gap-4">
		<DropdownMenu.Root>
			<DropdownMenu.Trigger>
				<Button variant="outline">
					Status: {data.filters.status || 'All'}
				</Button>
			</DropdownMenu.Trigger>
			<DropdownMenu.Content>
				<DropdownMenu.Item onclick={() => changeStatus(null)}>All</DropdownMenu.Item>
				<DropdownMenu.Item onclick={() => changeStatus('success')}>Success</DropdownMenu.Item>
				<DropdownMenu.Item onclick={() => changeStatus('failed')}>Failed</DropdownMenu.Item>
				<DropdownMenu.Item onclick={() => changeStatus('running')}>Running</DropdownMenu.Item>
				<DropdownMenu.Item onclick={() => changeStatus('timeout')}>Timeout</DropdownMenu.Item>
			</DropdownMenu.Content>
		</DropdownMenu.Root>
	</div>

	<!-- Executions Table -->
	{#if data.executions.length === 0}
		<div class="flex flex-col items-center justify-center py-12 text-center">
			<p class="text-muted-foreground">No executions found</p>
		</div>
	{:else}
		<Table.Root>
			<Table.Header>
				<Table.Row>
					<Table.Head>Status</Table.Head>
					<Table.Head>Trigger</Table.Head>
					<Table.Head>Started</Table.Head>
					<Table.Head>Duration</Table.Head>
					<Table.Head>Exit Code</Table.Head>
					<Table.Head class="text-right">Actions</Table.Head>
				</Table.Row>
			</Table.Header>
			<Table.Body>
				{#each data.executions as execution}
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
						<Table.Cell class="text-right">
							<Button
								variant="outline"
								size="sm"
								onclick={() => viewLogs(execution.id)}
								disabled={!execution.hasLogs}
							>
								View Logs
							</Button>
						</Table.Cell>
					</Table.Row>
				{/each}
			</Table.Body>
		</Table.Root>

		<!-- Pagination -->
		{#if data.pagination.totalPages > 1}
			<div class="flex items-center justify-between">
				<p class="text-sm text-muted-foreground">
					Showing {(data.pagination.page - 1) * 20 + 1} to {Math.min(
						data.pagination.page * 20,
						data.pagination.total
					)} of {data.pagination.total} executions
				</p>
				<div class="flex gap-2">
					<Button
						variant="outline"
						size="sm"
						disabled={data.pagination.page === 1}
						onclick={() => changePage(data.pagination.page - 1)}
					>
						Previous
					</Button>
					<Button
						variant="outline"
						size="sm"
						disabled={data.pagination.page === data.pagination.totalPages}
						onclick={() => changePage(data.pagination.page + 1)}
					>
						Next
					</Button>
				</div>
			</div>
		{/if}
	{/if}
</div>

<!-- Log Viewer Dialog -->
<Dialog.Root bind:open={logDialogOpen}>
	<Dialog.Content class="max-w-4xl max-h-[80vh]">
		<Dialog.Header>
			<Dialog.Title>Execution Logs</Dialog.Title>
		</Dialog.Header>
		<div class="overflow-auto max-h-[60vh]">
			{#if loadingLogs}
				<div class="flex items-center justify-center py-8">
					<p class="text-muted-foreground">Loading logs...</p>
				</div>
			{:else if logs.length === 0}
				<div class="flex items-center justify-center py-8">
					<p class="text-muted-foreground">No logs available</p>
				</div>
			{:else}
				<div class="space-y-2">
					{#each logs as log}
						<div class="rounded border p-3">
							<div class="flex items-center gap-2 mb-2">
								<Badge variant={log.stream === 'stderr' ? 'destructive' : 'outline'}>
									{log.stream}
								</Badge>
								<span class="text-xs text-muted-foreground">{formatDate(log.createdAt)}</span>
							</div>
							<pre class="whitespace-pre-wrap break-all text-sm font-mono bg-muted p-2 rounded">{log.content}</pre>
						</div>
					{/each}
				</div>
			{/if}
		</div>
		<Dialog.Footer>
			<Button variant="outline" onclick={() => (logDialogOpen = false)}>Close</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
