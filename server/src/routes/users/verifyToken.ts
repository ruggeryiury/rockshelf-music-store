import fp from 'fastify-plugin'

import { SwaggerAPI } from '../../core/api/SwaggerAPI'
import { userBearerAuth } from '../../core/plugins/auth'
import { success } from '../../core/plugins/response'

export const userVerifyToken = fp((fastify, _, done) => {
	fastify.get(
		'/api/v1/users/verify-token',
		{
			schema: {
				summary: 'Verifies a user token',
				tags: ['User Verification/Reset Password'],
				response: {
					200: SwaggerAPI.replySchema('OK').describe('User token is valid'),
					401: SwaggerAPI.replySchema('AUTH_TOKEN_ERROR').describe('Token error (No token on request headers, expired token, invalid token signature)'),
					403: SwaggerAPI.replySchema('FORBIDDEN_BANNED_USER').describe('User banned from the server'),
				},
				security: [
					{
						bearerAuth: [],
					},
				],
			},
			preHandler: fastify.auth([userBearerAuth]),
		},
		async (req, reply) => {
			return success(req, reply, { code: 'OK' })
		},
	)
	done()
})
