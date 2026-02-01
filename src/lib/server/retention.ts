import { db } from './db';

interface RetentionPolicy {
	retentionDays: number;
	retentionRuns: number;
}

async function getRetentionPolicy(): Promise<RetentionPolicy> {
	const daysSettings = await db.settings.findUnique({
		where: { key: 'log_retention_days' }
	});
	const runsSettings = await db.settings.findUnique({
		where: { key: 'log_retention_runs' }
	});

	return {
		retentionDays: daysSettings ? JSON.parse(daysSettings.value) : 30,
		retentionRuns: runsSettings ? JSON.parse(runsSettings.value) : 100
	};
}

export async function cleanupOldExecutions(): Promise<{
	deletedByDate: number;
	deletedByCount: number;
}> {
	const policy = await getRetentionPolicy();

	let deletedByDate = 0;
	let deletedByCount = 0;

	// Delete executions older than retention days
	if (policy.retentionDays > 0) {
		const cutoffDate = new Date();
		cutoffDate.setDate(cutoffDate.getDate() - policy.retentionDays);

		const result = await db.execution.deleteMany({
			where: {
				startedAt: { lt: cutoffDate },
				status: { not: 'running' } // Don't delete running executions
			}
		});
		deletedByDate = result.count;
		console.log(`[Retention] Deleted ${deletedByDate} executions older than ${policy.retentionDays} days`);
	}

	// Delete excess executions per job (keep only last N runs)
	if (policy.retentionRuns > 0) {
		const jobs = await db.job.findMany({
			select: { id: true }
		});

		for (const job of jobs) {
			// Get IDs of executions to keep
			const keepExecutions = await db.execution.findMany({
				where: { jobId: job.id },
				orderBy: { startedAt: 'desc' },
				take: policy.retentionRuns,
				select: { id: true }
			});

			const keepIds = keepExecutions.map((e) => e.id);

			// Delete executions not in the keep list
			const result = await db.execution.deleteMany({
				where: {
					jobId: job.id,
					id: { notIn: keepIds },
					status: { not: 'running' }
				}
			});

			deletedByCount += result.count;
		}

		if (deletedByCount > 0) {
			console.log(`[Retention] Deleted ${deletedByCount} excess executions (keeping last ${policy.retentionRuns} per job)`);
		}
	}

	return { deletedByDate, deletedByCount };
}

// Run cleanup periodically (every 6 hours)
let cleanupInterval: NodeJS.Timeout | null = null;

export function startRetentionService(): void {
	if (cleanupInterval) return;

	console.log('[Retention] Starting retention service');

	// Run immediately on start
	cleanupOldExecutions().catch((err) => {
		console.error('[Retention] Cleanup error:', err);
	});

	// Schedule periodic cleanup
	cleanupInterval = setInterval(
		() => {
			cleanupOldExecutions().catch((err) => {
				console.error('[Retention] Cleanup error:', err);
			});
		},
		6 * 60 * 60 * 1000 // Every 6 hours
	);
}

export function stopRetentionService(): void {
	if (cleanupInterval) {
		clearInterval(cleanupInterval);
		cleanupInterval = null;
		console.log('[Retention] Stopped retention service');
	}
}
