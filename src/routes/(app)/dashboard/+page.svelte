<script lang="ts">
	import { enhance } from '$app/forms';
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import * as Table from '$lib/components/ui/table';
	import { describeCron } from '$lib/utils/cron';

	let { data } = $props();

	function formatDate(date: Date | string) {
		return new Date(date).toLocaleString();
	}

	function formatDuration(ms: number | null): string {
		if (ms === null) return 'Running...';
		if (ms < 1000) return `${ms}ms`;
		if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
		return `${(ms / 60000).toFixed(1)}m`;
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

	function getHealthColor(job: { status: string; lastExecution: { status: string } | null }): string {
		if (job.status === 'paused') return 'bg-yellow-500';
		if (!job.lastExecution) return 'bg-gray-500';
		if (job.lastExecution.status === 'success') return 'bg-green-500';
		if (job.lastExecution.status === 'running') return 'bg-blue-500';
		return 'bg-red-500';
	}
</script>

<svelte:head>
	<title>Dashboard - Kronos</title>
</svelte:head>

<div class="space-y-6">
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold tracking-tight">Dashboard</h1>
			<p class="text-muted-foreground">Welcome back, {data.user.username}</p>
		</div>
		<div class="flex gap-2">
			<Button href="/jobs/new">Create Job</Button>
		</div>
	</div>

	<!-- Stats Cards -->
	<div class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
		<Card.Root>
			<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
				<Card.Title class="text-sm font-medium">Total Jobs</Card.Title>
			</Card.Header>
			<Card.Content>
				<div class="text-2xl font-bold">{data.stats.totalJobs}</div>
				<p class="text-xs text-muted-foreground">
					{data.stats.activeJobs} active, {data.stats.pausedJobs} paused
				</p>
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
				<Card.Title class="text-sm font-medium">Success Rate (24h)</Card.Title>
			</Card.Header>
			<Card.Content>
				<div class="text-2xl font-bold {data.stats.successRate < 80 ? 'text-destructive' : ''}">
					{data.stats.successRate}%
				</div>
				<p class="text-xs text-muted-foreground">
					{data.stats.executions24h} executions
				</p>
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
				<Card.Title class="text-sm font-medium">Currently Running</Card.Title>
			</Card.Header>
			<Card.Content>
				<div class="text-2xl font-bold">{data.stats.runningJobs}</div>
				<p class="text-xs text-muted-foreground">jobs in progress</p>
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
				<Card.Title class="text-sm font-medium">Failed (24h)</Card.Title>
			</Card.Header>
			<Card.Content>
				<div class="text-2xl font-bold text-destructive">
					{data.stats.failedJobs + data.stats.timeoutJobs}
				</div>
				<p class="text-xs text-muted-foreground">
					{data.stats.failedJobs} failed, {data.stats.timeoutJobs} timeout
				</p>
			</Card.Content>
		</Card.Root>
	</div>

	<!-- Health Overview -->
	<div class="grid gap-6 md:grid-cols-2">
		<Card.Root>
			<Card.Header>
				<Card.Title>Job Health Overview</Card.Title>
				<Card.Description>Status of all configured jobs</Card.Description>
			</Card.Header>
			<Card.Content>
				<div class="flex gap-4 mb-4">
					<div class="flex items-center gap-2">
						<div class="h-3 w-3 rounded-full bg-green-500"></div>
						<span class="text-sm">Healthy ({data.stats.healthyJobs})</span>
					</div>
					<div class="flex items-center gap-2">
						<div class="h-3 w-3 rounded-full bg-red-500"></div>
						<span class="text-sm">Failing ({data.stats.failingJobs})</span>
					</div>
					<div class="flex items-center gap-2">
						<div class="h-3 w-3 rounded-full bg-yellow-500"></div>
						<span class="text-sm">Paused ({data.stats.pausedJobs})</span>
					</div>
				</div>

				{#if data.jobsOverview.length === 0}
					<p class="text-muted-foreground text-center py-4">No jobs configured</p>
				{:else}
					<div class="space-y-2">
						{#each data.jobsOverview.slice(0, 10) as job}
							<a
								href="/jobs/{job.id}"
								class="flex items-center justify-between p-2 rounded-md hover:bg-muted"
							>
								<div class="flex items-center gap-3">
									<div class="h-2 w-2 rounded-full {getHealthColor(job)}"></div>
									<span class="font-medium">{job.name}</span>
								</div>
								<div class="flex items-center gap-2">
									<span class="text-xs text-muted-foreground">{describeCron(job.schedule)}</span>
									<Badge variant={getStatusVariant(job.status)} class="text-xs">
										{job.status}
									</Badge>
								</div>
							</a>
						{/each}
					</div>
					{#if data.jobsOverview.length > 10}
						<div class="mt-4 text-center">
							<Button variant="outline" href="/jobs">View All Jobs</Button>
						</div>
					{/if}
				{/if}
			</Card.Content>
		</Card.Root>

		<!-- Recent Executions -->
		<Card.Root>
			<Card.Header>
				<Card.Title>Recent Executions</Card.Title>
				<Card.Description>Latest job runs in the last 24 hours</Card.Description>
			</Card.Header>
			<Card.Content>
				{#if data.recentTimeline.length === 0}
					<p class="text-muted-foreground text-center py-4">No recent executions</p>
				{:else}
					<div class="space-y-3">
						{#each data.recentTimeline.slice(0, 8) as execution}
							<div class="flex items-center justify-between">
								<div class="flex items-center gap-3">
									<Badge variant={getStatusVariant(execution.status)} class="w-16 justify-center">
										{execution.status}
									</Badge>
									<div>
										<p class="font-medium text-sm">{execution.jobName}</p>
										<p class="text-xs text-muted-foreground">{formatDate(execution.startedAt)}</p>
									</div>
								</div>
								<span class="text-sm text-muted-foreground">
									{formatDuration(execution.duration)}
								</span>
							</div>
						{/each}
					</div>
				{/if}
			</Card.Content>
		</Card.Root>
	</div>

	<!-- Quick Actions -->
	<Card.Root>
		<Card.Header>
			<Card.Title>Quick Actions</Card.Title>
		</Card.Header>
		<Card.Content>
			<div class="flex flex-wrap gap-2">
				<Button href="/jobs/new">Create New Job</Button>
				<Button variant="outline" href="/jobs">Manage Jobs</Button>
				<Button variant="outline" href="/settings/api-keys">API Keys</Button>
			</div>
		</Card.Content>
	</Card.Root>
</div>
