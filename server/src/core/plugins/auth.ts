import { useDefaultOptions } from 'use-default-options'

import type { FastifyAuthFunction } from '@fastify/auth'

import { ServerError } from './errors'

export interface UserBearerAuthFunctionOptions {
	/**
	 * A rank level rule to access the route. Default is `0` (any registered user).
	 */
	requiredRank?: number
	/**
	 * Let only active (non-banned) users to access the route. Default is `true`.
	 */
	active?: boolean
	/**
	 * Let only verified users to access the route. Default is `false`.
	 */
	verified?: boolean
}

export const userBearerAuth = (options?: UserBearerAuthFunctionOptions): FastifyAuthFunction => {
	const { active, requiredRank, verified } = useDefaultOptions<UserBearerAuthFunctionOptions>({ requiredRank: 0, active: true, verified: false }, options)
	return async (req) => {
		await req.jwtVerify()

		if (!req.user) throw new ServerError({ code: 'AUTH_TOKEN_ERROR' })

		const user = await req.server.db.users.findOne({
			_id: new req.server.mongo.ObjectId(req.user.sub),
		})

		if (!user) throw new ServerError({ code: 'AUTH_TOKEN_ERROR' })
		if (active && !user.active) throw new ServerError({ code: 'FORBIDDEN_BANNED_USER' })
		if (verified && !user.verified) throw new ServerError({ code: 'FORBIDDEN_UNVERIFIED_USER' })

		if (user.rank < requiredRank) {
			throw new ServerError({ code: 'FORBIDDEN_NO_PRIVILEGES' })
		}

		req.setDecorator('userDocument', user)
	}
}
