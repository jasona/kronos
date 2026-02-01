<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';

	interface Props {
		value: Record<string, string>;
	}

	let { value = $bindable() }: Props = $props();

	let newKey = $state('');
	let newValue = $state('');
	let showValues = $state<Record<string, boolean>>({});

	function addVar() {
		if (newKey && !value[newKey]) {
			value = { ...value, [newKey]: newValue };
			newKey = '';
			newValue = '';
		}
	}

	function removeVar(key: string) {
		const { [key]: _, ...rest } = value;
		value = rest;
	}

	function toggleShow(key: string) {
		showValues = { ...showValues, [key]: !showValues[key] };
	}

	function maskValue(val: string): string {
		if (val.length <= 4) return '****';
		return val.slice(0, 2) + '*'.repeat(val.length - 4) + val.slice(-2);
	}
</script>

<div class="space-y-4">
	<Label>Environment Variables</Label>

	{#if Object.keys(value).length > 0}
		<div class="space-y-2">
			{#each Object.entries(value) as [key, val]}
				<div class="flex items-center gap-2">
					<Input value={key} readonly class="w-1/3 font-mono bg-muted" />
					<Input
						value={showValues[key] ? val : maskValue(val)}
						readonly
						class="flex-1 font-mono bg-muted"
						type={showValues[key] ? 'text' : 'password'}
					/>
					<Button type="button" variant="ghost" size="sm" onclick={() => toggleShow(key)}>
						{showValues[key] ? 'Hide' : 'Show'}
					</Button>
					<Button
						type="button"
						variant="ghost"
						size="sm"
						class="text-destructive"
						onclick={() => removeVar(key)}
					>
						Remove
					</Button>
				</div>
			{/each}
		</div>
	{/if}

	<div class="flex items-end gap-2">
		<div class="space-y-2 flex-1">
			<Label for="newKey" class="text-xs">Key</Label>
			<Input
				id="newKey"
				bind:value={newKey}
				placeholder="MY_VAR"
				class="font-mono"
				onkeydown={(e) => e.key === 'Enter' && (e.preventDefault(), addVar())}
			/>
		</div>
		<div class="space-y-2 flex-1">
			<Label for="newValue" class="text-xs">Value</Label>
			<Input
				id="newValue"
				bind:value={newValue}
				placeholder="value"
				type="password"
				class="font-mono"
				onkeydown={(e) => e.key === 'Enter' && (e.preventDefault(), addVar())}
			/>
		</div>
		<Button type="button" variant="secondary" onclick={addVar}>Add</Button>
	</div>
</div>
