import fp from 'fastify-plugin'

import { SwaggerAPI } from '../../core/api/SwaggerAPI'
import { adminBearerAuth } from '../../core/plugins/auth'
import { ServerError } from '../../core/plugins/errors'
import { success } from '../../core/plugins/response'
import { type UserBanBody, userBanBodySchema } from '../../schemas'

export const userBan = fp((fastify, _, done) => {
	fastify.post<{ Body: UserBanBody }>(
		'/api/v1/admin/ban',
		{
			schema: {
				summary: 'Bans an user from the server',
				tags: ['Admin'],
				response: {
					200: SwaggerAPI.replySchema('SUCCESS_USER_BANNED').describe('User was banned succesfully'),
					400: SwaggerAPI.replySchema('BAD_REQUEST').describe('Wrong request body format, no authorization on request headers'),
					401: SwaggerAPI.replySchema('AUTH_TOKEN_ERROR').describe('Token error (No token on request headers, expired token, invalid token signature)'),
					403: SwaggerAPI.replySchema('FORBIDDEN_BANNED_USER').describe('User banned from the server, request user has no administrator privileges'),
					404: SwaggerAPI.replySchema('USER_NOT_FOUND').describe('No registered user found with provided ID'),
				},
				body: userBanBodySchema,
				security: [
					{
						bearerAuth: [],
					},
				],
			},
			preHandler: fastify.auth([adminBearerAuth]),
		},
		async (req, reply) => {
			const { userId } = req.body

			const user = await fastify.db.users.findOneAndUpdate({ _id: new fastify.mongo.ObjectId(userId) }, { $set: { active: false }, $currentDate: { modifiedAt: true } }, { returnDocument: 'after' })

			if (!user) throw new ServerError({ code: 'USER_NOT_FOUND' })

			return success(req, reply, { code: 'SUCCESS_USER_BANNED', messageValues: { user: user.username } })
		},
	)
	done()
})
