import fp from 'fastify-plugin'

import type { ServerEnvObject } from '@schemas'

/**
 * ## Environment Plugin
 * - - - -
 * Populates the `fastify` instance with the environment variables and a `isDev` function. For `isDev` to work properly you need to set the environment variable `NODE_ENV` properly when running the script.
 *
 * ```sh
 * pnpm add cross-env tsx -D
 * cross-env NODE_ENV=development tsx watch ./src/index.ts"
 * ```
 */
export const NodeEnvPlugin = fp((fastify, _, done) => {
	fastify.decorate('env', fastify.getEnvs<ServerEnvObject>())
	fastify.decorate('isDev', function isDev(): boolean {
		const nodeEnv = (process.env.NODE_DEV as 'development' | 'production' | undefined) ?? 'development'
		return nodeEnv === 'development'
	})
	done()
})
