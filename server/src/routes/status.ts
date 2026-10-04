import fp from 'fastify-plugin'

import { SwaggerAPI } from '../core/api/SwaggerAPI'
import { success } from '../core/plugins/response'

const schema = {
	summary: 'Pings the server to test its availability',
	tags: ['Status'],
	response: {
		200: SwaggerAPI.replySchema('OK').describe('Server is running normally'),
	},
} as const

export const StatusRoute = fp((fastify, _, done) => {
	fastify.get('/api/v1/status', { schema }, (req, reply) => {
		success(req, reply, { code: 'OK' })
	})
	done()
})
