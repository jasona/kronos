import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { jobSchema, validateJobConfig } from '$lib/utils/schemas';

// GET /api/jobs/[id] - Get a single job
export const GET: RequestHandler = async ({ params, locals }) => {
	if (!locals.user) {
		error(401, 'Unauthorized');
	}

	const job = await db.job.findUnique({
		where: { id: params.id }
	});

	if (!job) {
		error(404, 'Job not found');
	}

	return json({
		...job,
		tags: JSON.parse(job.tags),
		config: JSON.parse(job.config),
		retryPolicy: JSON.parse(job.retryPolicy),
		envVars: JSON.parse(job.envVars)
	});
};

// PUT /api/jobs/[id] - Update a job
export const PUT: RequestHandler = async ({ params, request, locals }) => {
	if (!locals.user) {
		error(401, 'Unauthorized');
	}

	const existing = await db.job.findUnique({ where: { id: params.id } });
	if (!existing) {
		error(404, 'Job not found');
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

	const job = await db.job.update({
		where: { id: params.id },
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

	return json({
		...job,
		tags: JSON.parse(job.tags),
		config: JSON.parse(job.config),
		retryPolicy: JSON.parse(job.retryPolicy),
		envVars: JSON.parse(job.envVars)
	});
};

// DELETE /api/jobs/[id] - Delete a job
export const DELETE: RequestHandler = async ({ params, locals }) => {
	if (!locals.user) {
		error(401, 'Unauthorized');
	}

	const existing = await db.job.findUnique({ where: { id: params.id } });
	if (!existing) {
		error(404, 'Job not found');
	}

	await db.job.delete({ where: { id: params.id } });

	return new Response(null, { status: 204 });
};

// PATCH /api/jobs/[id] - Partial update (e.g., toggle status)
export const PATCH: RequestHandler = async ({ params, request, locals }) => {
	if (!locals.user) {
		error(401, 'Unauthorized');
	}

	const existing = await db.job.findUnique({ where: { id: params.id } });
	if (!existing) {
		error(404, 'Job not found');
	}

	const body = await request.json();
	const updateData: Record<string, unknown> = {};

	if (body.status !== undefined) {
		updateData.status = body.status;
	}

	if (Object.keys(updateData).length === 0) {
		error(400, 'No valid fields to update');
	}

	const job = await db.job.update({
		where: { id: params.id },
		data: updateData
	});

	return json({
		...job,
		tags: JSON.parse(job.tags),
		config: JSON.parse(job.config),
		retryPolicy: JSON.parse(job.retryPolicy),
		envVars: JSON.parse(job.envVars)
	});
};
