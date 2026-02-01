import { z } from 'zod';

// Cron expression validation (basic validation)
const cronRegex = /^(\*|([0-9]|1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9])|\*\/([0-9]|1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9])) (\*|([0-9]|1[0-9]|2[0-3])|\*\/([0-9]|1[0-9]|2[0-3])) (\*|([1-9]|1[0-9]|2[0-9]|3[0-1])|\*\/([1-9]|1[0-9]|2[0-9]|3[0-1])) (\*|([1-9]|1[0-2])|\*\/([1-9]|1[0-2])) (\*|([0-6])|\*\/([0-6]))$/;

export const cronExpressionSchema = z.string().refine(
	(val) => {
		// Allow common cron formats
		const parts = val.trim().split(/\s+/);
		return parts.length === 5;
	},
	{ message: 'Invalid cron expression. Expected format: minute hour day month weekday' }
);

// Shell job config
export const shellConfigSchema = z.object({
	command: z.string().min(1, 'Command is required'),
	workingDir: z.string().optional(),
	shell: z.string().default('/bin/sh')
});

// HTTP job config
export const httpConfigSchema = z.object({
	url: z.string().url('Invalid URL'),
	method: z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']).default('GET'),
	headers: z.record(z.string()).optional(),
	body: z.string().optional(),
	timeout: z.number().min(1000).max(300000).optional()
});

// Docker job config
export const dockerConfigSchema = z.object({
	image: z.string().min(1, 'Image is required'),
	command: z.array(z.string()).optional(),
	entrypoint: z.array(z.string()).optional(),
	env: z.record(z.string()).optional(),
	volumes: z.array(z.string()).optional(),
	network: z.string().optional(),
	remove: z.boolean().default(true)
});

// Retry policy
export const retryPolicySchema = z.object({
	maxRetries: z.number().min(0).max(10).default(0),
	backoff: z.enum(['fixed', 'exponential']).default('fixed'),
	delayMs: z.number().min(1000).max(3600000).default(60000)
});

// Environment variables
export const envVarsSchema = z.record(z.string());

// Job creation/update schema
export const jobSchema = z.object({
	name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
	description: z.string().max(500).optional(),
	schedule: cronExpressionSchema,
	type: z.enum(['shell', 'http', 'docker']),
	config: z.string(), // JSON string, validated separately based on type
	status: z.enum(['active', 'paused']).default('active'),
	tags: z.array(z.string()).default([]),
	timeout: z.number().min(1000).max(3600000).default(300000),
	retryPolicy: retryPolicySchema.optional(),
	envVars: envVarsSchema.optional()
});

// Job config validators based on type
export function validateJobConfig(type: string, configStr: string) {
	try {
		const config = JSON.parse(configStr);
		switch (type) {
			case 'shell':
				return shellConfigSchema.parse(config);
			case 'http':
				return httpConfigSchema.parse(config);
			case 'docker':
				return dockerConfigSchema.parse(config);
			default:
				throw new Error(`Unknown job type: ${type}`);
		}
	} catch (e) {
		if (e instanceof z.ZodError) {
			throw new Error(e.errors.map((err) => err.message).join(', '));
		}
		throw e;
	}
}

// Type exports
export type JobInput = z.infer<typeof jobSchema>;
export type ShellConfig = z.infer<typeof shellConfigSchema>;
export type HttpConfig = z.infer<typeof httpConfigSchema>;
export type DockerConfig = z.infer<typeof dockerConfigSchema>;
export type RetryPolicy = z.infer<typeof retryPolicySchema>;
