<script lang="ts">
	import { Label } from '$lib/components/ui/label';
	import { Input } from '$lib/components/ui/input';
	import { parseCron, buildCron, describeCron, type CronParts } from '$lib/utils/cron';

	interface Props {
		value: string;
		onchange: (value: string) => void;
	}

	let { value, onchange }: Props = $props();

	let parts = $state<CronParts>(parseCron(value) || {
		minute: '0',
		hour: '*',
		dayOfMonth: '*',
		month: '*',
		dayOfWeek: '*'
	});

	let manualMode = $state(false);
	let manualValue = $state(value);

	$effect(() => {
		const parsed = parseCron(value);
		if (parsed) {
			parts = parsed;
			manualValue = value;
		}
	});

	function updateCron() {
		const newValue = buildCron(parts);
		manualValue = newValue;
		onchange(newValue);
	}

	function handleManualChange(e: Event) {
		const target = e.target as HTMLInputElement;
		manualValue = target.value;
		const parsed = parseCron(target.value);
		if (parsed) {
			parts = parsed;
			onchange(target.value);
		}
	}

	const minuteOptions = [
		{ value: '*', label: 'Every minute' },
		{ value: '0', label: 'At minute 0' },
		{ value: '*/5', label: 'Every 5 minutes' },
		{ value: '*/10', label: 'Every 10 minutes' },
		{ value: '*/15', label: 'Every 15 minutes' },
		{ value: '*/30', label: 'Every 30 minutes' }
	];

	const hourOptions = [
		{ value: '*', label: 'Every hour' },
		{ value: '0', label: 'Midnight (0:00)' },
		{ value: '6', label: '6:00 AM' },
		{ value: '9', label: '9:00 AM' },
		{ value: '12', label: 'Noon (12:00)' },
		{ value: '18', label: '6:00 PM' },
		{ value: '*/2', label: 'Every 2 hours' },
		{ value: '*/6', label: 'Every 6 hours' }
	];

	const dayOfMonthOptions = [
		{ value: '*', label: 'Every day' },
		{ value: '1', label: '1st of month' },
		{ value: '15', label: '15th of month' },
		{ value: '1,15', label: '1st and 15th' }
	];

	const monthOptions = [
		{ value: '*', label: 'Every month' },
		{ value: '1', label: 'January' },
		{ value: '*/3', label: 'Every quarter' },
		{ value: '6', label: 'June' },
		{ value: '12', label: 'December' }
	];

	const dayOfWeekOptions = [
		{ value: '*', label: 'Every day' },
		{ value: '1-5', label: 'Weekdays (Mon-Fri)' },
		{ value: '0,6', label: 'Weekends' },
		{ value: '1', label: 'Monday' },
		{ value: '5', label: 'Friday' }
	];
</script>

<div class="space-y-4">
	<div class="flex items-center justify-between">
		<Label>Schedule (Cron Expression)</Label>
		<button
			type="button"
			class="text-sm text-muted-foreground hover:text-foreground"
			onclick={() => (manualMode = !manualMode)}
		>
			{manualMode ? 'Use builder' : 'Edit manually'}
		</button>
	</div>

	{#if manualMode}
		<Input
			value={manualValue}
			oninput={handleManualChange}
			placeholder="* * * * *"
			class="font-mono"
		/>
	{:else}
		<div class="grid grid-cols-5 gap-2">
			<div>
				<Label class="text-xs">Minute</Label>
				<select
					class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
					bind:value={parts.minute}
					onchange={updateCron}
				>
					{#each minuteOptions as opt}
						<option value={opt.value}>{opt.label}</option>
					{/each}
				</select>
			</div>
			<div>
				<Label class="text-xs">Hour</Label>
				<select
					class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
					bind:value={parts.hour}
					onchange={updateCron}
				>
					{#each hourOptions as opt}
						<option value={opt.value}>{opt.label}</option>
					{/each}
				</select>
			</div>
			<div>
				<Label class="text-xs">Day</Label>
				<select
					class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
					bind:value={parts.dayOfMonth}
					onchange={updateCron}
				>
					{#each dayOfMonthOptions as opt}
						<option value={opt.value}>{opt.label}</option>
					{/each}
				</select>
			</div>
			<div>
				<Label class="text-xs">Month</Label>
				<select
					class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
					bind:value={parts.month}
					onchange={updateCron}
				>
					{#each monthOptions as opt}
						<option value={opt.value}>{opt.label}</option>
					{/each}
				</select>
			</div>
			<div>
				<Label class="text-xs">Weekday</Label>
				<select
					class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
					bind:value={parts.dayOfWeek}
					onchange={updateCron}
				>
					{#each dayOfWeekOptions as opt}
						<option value={opt.value}>{opt.label}</option>
					{/each}
				</select>
			</div>
		</div>
	{/if}

	<div class="rounded-md bg-muted p-3">
		<p class="text-sm">
			<span class="font-medium">Expression:</span>
			<code class="ml-2">{manualMode ? manualValue : buildCron(parts)}</code>
		</p>
		<p class="text-sm text-muted-foreground">
			{describeCron(manualMode ? manualValue : buildCron(parts))}
		</p>
	</div>
</div>
