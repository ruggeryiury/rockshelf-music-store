import fp from 'fastify-plugin'

import { ServerFileSystem } from '../../core/api/ServerFileSystem'
import { SwaggerAPI } from '../../core/api/SwaggerAPI'
import { userBearerAuth } from '../../core/plugins/auth'
import { success } from '../../core/plugins/response'

export const deleteMyAvatar = fp((fastify, _, done) => {
	fastify.delete(
		'/api/v1/users/me/avatar',
		{
			schema: {
				summary: 'Deletes an user avatar by its authorization token',
				tags: ['User (Methods)'],
				response: {
					200: SwaggerAPI.replySchema('OK').describe('User avatar has been deleted successfully'),
					401: SwaggerAPI.replySchema('AUTH_TOKEN_ERROR').describe('Token error (No token on request headers, expired token, invalid token signature)'),
					403: SwaggerAPI.replySchema('FORBIDDEN_BANNED_USER').describe('User banned from the server'),
					404: SwaggerAPI.replySchema('USER_NOT_FOUND').describe('No registered user found with provided ID'),
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
			const user = req.userDocument

			const avatarPath = ServerFileSystem.publicDir().gotoFile(`users/${user._id.toHexString()}/avatar.webp`)

			if (avatarPath.exists) await avatarPath.delete()

			await fastify.db.users.updateOne({ _id: user._id }, { $set: { avatarVer: 0 } })

			return success(req, reply, { code: 'SUCCESS_USER_AVATAR_DELETED' })
		},
	)
	done()
})
