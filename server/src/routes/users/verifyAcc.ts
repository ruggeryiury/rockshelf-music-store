import fp from 'fastify-plugin'

import { type UserVerifyAccBody, userVerifyAccBodySchema } from '@schemas'

import { SwaggerAPI } from '../../core/api/SwaggerAPI'
import { ServerError } from '../../core/plugins/errors'
import { success } from '../../core/plugins/response'

export const userVerifyAcc = fp((fastify, _, done) => {
	fastify.post<{ Body: UserVerifyAccBody }>(
		'/api/v1/users/verify-acc',
		{
			schema: {
				summary: 'Verifies a registered user account using provided verification token',
				tags: ['User Verification/Reset Password'],
				body: userVerifyAccBodySchema,
				response: {
					200: SwaggerAPI.replySchema('SUCCESS_USER_ACC_VERIFICATION').describe('User account has been verified successfully'),
					400: SwaggerAPI.replySchema('BAD_REQUEST').describe('Wrong request body format, invalid or expired verification token'),
				},
			},
		},
		async (req, reply) => {
			const { token } = req.body
			const now = new Date()
			const tokenHash = fastify.dbFuncs.verifications.hashToken(token)

			const verification = await fastify.db.accVerifications.findOne({
				tokenHash,
				expiresAt: {
					$gt: now,
				},
			})

			if (!verification) throw new ServerError({ code: 'ACC_VERIFICATION_INVALID_OR_EXPIRED' })

			await fastify.db.users.updateOne({ _id: verification.userId }, { $set: { verified: true }, $currentDate: { verifiedAt: true, modifiedAt: true } })
			await fastify.db.accVerifications.deleteMany({ userId: verification.userId })

			return success(req, reply, { code: 'SUCCESS_USER_ACC_VERIFICATION' })
		},
	)
	done()
})
