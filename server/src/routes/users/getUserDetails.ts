import fp from 'fastify-plugin'

import { SwaggerAPI } from '../../core/api/SwaggerAPI'
import { ServerError } from '../../core/plugins/errors'
import { success } from '../../core/plugins/response'
import { type UserIdParams, userIdParams } from '../../schemas'
import { dbSharedUserDocumentSchema, getUserDetailsSuccessSchema } from '../../schemas/db'

export const getUserDetails = fp((fastify, _, done) => {
	fastify.get<{ Params: UserIdParams }>(
		'/api/v1/users/:userId',
		{
			schema: {
				summary: 'Retrieves information about an user',
				tags: ['User (Data)'],
				response: {
					200: SwaggerAPI.replySchema('OK', getUserDetailsSuccessSchema.shape.data.nonoptional()).describe('User validated and found on the database, user data received'),
					400: SwaggerAPI.replySchema('BAD_REQUEST').describe('Wrong request querystring format, no authorization on request headers'),
					403: SwaggerAPI.replySchema('FORBIDDEN_BANNED_USER').describe('User banned'),
					404: SwaggerAPI.replySchema('USER_NOT_FOUND').describe('No registered user found with provided ID'),
				},
				params: userIdParams,
			},
		},
		async (req, reply) => {
			const { userId: id } = req.params
			const user = await fastify.dbFuncs.users.findById(id)
			if (!user) throw new ServerError({ code: 'USER_NOT_FOUND' })

			const sharedUser = dbSharedUserDocumentSchema.parse(user)
			return success(req, reply, {
				code: 'SUCCESS_GET_USER_DETAILS',
				data: {
					user: sharedUser,
					// songsCount: await fastify.dbFuncs.songs.countUserSongs(user._id),
				},
			})
		},
	)
	done()
})
