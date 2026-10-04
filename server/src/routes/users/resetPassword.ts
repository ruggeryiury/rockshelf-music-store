import fp from 'fastify-plugin'

import { type UserResetPasswordBody, userResetPasswordBodySchema } from '@schemas'

import { SwaggerAPI } from '../../core/api/SwaggerAPI'
import { ServerError } from '../../core/plugins/errors'
import { success } from '../../core/plugins/response'

export const userResetPassword = fp((fastify, _, done) => {
	fastify.post<{ Body: UserResetPasswordBody }>(
		'/api/v1/users/reset-password',
		{
			schema: {
				summary: 'Resets an user password using provided e-mail password reset token',
				tags: ['User Verification/Reset Password'],
				body: userResetPasswordBodySchema,
				response: {
					200: SwaggerAPI.replySchema('PASSWORD_UPDATED_SUCCESS').describe('User account has been verified successfully'),
					400: SwaggerAPI.replySchema('BAD_REQUEST').describe('Wrong request body format, invalid or expired verification token'),
					401: SwaggerAPI.replySchema('USER_PASSWORD_TOO_SMALL').describe('Weak password provided'),
				},
			},
		},
		async (req, reply) => {
			const { token, newPassword } = req.body
			const tokenHash = fastify.dbFuncs.verifications.hashToken(token)

			const verification = await fastify.db.passResetVerifications.findOne({
				tokenHash,
				expiresAt: {
					$gt: new Date(),
				},
			})

			if (!verification) throw new ServerError({ code: 'ACC_VERIFICATION_INVALID_OR_EXPIRED' })

			// DEV: Disable the next line if you want to bypass password validation
			if (!fastify.env.DISABLE_PASSWORD_VALIDATOR) fastify.dbFuncs.users.validateUserPassword(newPassword)

			const passwordHash = await fastify.dbFuncs.users.hashPassword(newPassword)

			await fastify.db.users.updateOne({ _id: verification.userId }, { $set: { passwordHash }, $currentDate: { modifiedAt: true } })
			await fastify.db.passResetVerifications.deleteMany({ userId: verification.userId })

			return success(req, reply, { code: 'PASSWORD_UPDATED_SUCCESS' })
		},
	)
	done()
})
