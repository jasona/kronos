import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { jobSchema, validateJobConfig } from '$lib/utils/schemas';

// GET /api/jobs - List all jobs
export const GET: RequestHandler = async ({ url, locals }) => {
	if (!locals.user) {
		error(401, 'Unauthorized');
	}

	const status = url.searchParams.get('status');
	const where: Record<string, unknown> = {};

	if (status && status !== 'all') {
		where.status = status;
	}

	const jobs = await db.job.findMany({
		where,
		orderBy: { createdAt: 'desc' }
	});

	return json({
		jobs: jobs.map((job) => ({
			...job,
			tags: JSON.parse(job.tags),
			config: JSON.parse(job.config),
			retryPolicy: JSON.parse(job.retryPolicy),
			envVars: JSON.parse(job.envVars)
		}))
	});
};

// POST /api/jobs - Create a new job
export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) {
		error(401, 'Unauthorized');
	}

	const body = await request.json();

	// Validate
	const result = jobSchema.safeParse(body);
	if (!result.success) {
		error(400, result.error.errors[0].message);
	}

	try {
		validateJobConfig(body.type, body.config);
	} catch (e) {
		error(400, e instanceof Error ? e.message : 'Invalid job configuration');
	}

	const job = await db.job.create({
		data: {
			name: body.name,
			description: body.description || null,
			schedule: body.schedule,
			type: body.type,
			config: typeof body.config === 'string' ? body.config : JSON.stringify(body.config),
			status: body.status || 'active',
			tags: JSON.stringify(body.tags || []),
			timeout: body.timeout || 300000,
			retryPolicy: JSON.stringify(body.retryPolicy || {}),
			envVars: JSON.stringify(body.envVars || {})
		}
	});

	return json(
		{
			...job,
			tags: JSON.parse(job.tags),
			config: JSON.parse(job.config),
			retryPolicy: JSON.parse(job.retryPolicy),
			envVars: JSON.parse(job.envVars)
		},
		{ status: 201 }
	);
};
