import fp from 'fastify-plugin'

import { deleteMyAvatar } from './users/deleteMyAvatar'
import { getMyAvatar } from './users/getMyAvatar'
import { getMyStatus } from './users/getMyStatus'
import { getMyUserDetails } from './users/getMyUserDetails'
import { getUserAvatar } from './users/getUserAvatar'
import { getUserDetails } from './users/getUserDetails'
import { putMyAvatar } from './users/putMyAvatar'
import { userResendResetPasswordEmail } from './users/resendResetPasswordEmail'
import { userResendVerificationEmail } from './users/resendVerificationEmail'
import { userResetPassword } from './users/resetPassword'
import { updateMyUser } from './users/updateMyUser'
import { userLogin } from './users/userLogin'
import { userRegister } from './users/userRegister'
import { userVerifyAcc } from './users/verifyAcc'
import { userVerifyToken } from './users/verifyToken'

export const UserRoute = fp((fastify, _, done) => {
	fastify.register(userLogin)
	fastify.register(userRegister)

	fastify.register(getUserDetails)
	fastify.register(getUserAvatar)

	fastify.register(getMyStatus)
	fastify.register(userVerifyToken)
	fastify.register(getMyUserDetails)
	fastify.register(updateMyUser)
	fastify.register(getMyAvatar)
	fastify.register(putMyAvatar)
	fastify.register(deleteMyAvatar)

	fastify.register(userResendVerificationEmail)
	fastify.register(userVerifyAcc)
	fastify.register(userResendResetPasswordEmail)
	fastify.register(userResetPassword)
	done()
})
