import fp from 'fastify-plugin'

import { LogAPI } from '../api/LogAPI'

export const LogPlugin = fp(async (fastify) => {
	await LogAPI.init(fastify)

	fastify.addHook('onClose', async () => {
		if (LogAPI.logFile && !LogAPI.logFile.isClosed) await LogAPI.closeLogStream()
	})
})
