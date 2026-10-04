import type { FastifyAuthFunction } from '@fastify/auth'

import { ServerError } from './errors'

/**
 * A Fastify authorization function that verifies and decodes the user bearer authorization on a route.
 */
export const userBearerAuth: FastifyAuthFunction = async (req) => {
	await req.jwtVerify()
	if (!req.user) throw new ServerError({ code: 'AUTH_TOKEN_ERROR' })
	const user = await req.server.db.users.findOne({ _id: new req.server.mongo.ObjectId(req.user.sub) })
	if (!user) throw new ServerError({ code: 'AUTH_TOKEN_ERROR' })
	if (!user.active) throw new ServerError({ code: 'FORBIDDEN_BANNED_USER' })
	req.setDecorator('userDocument', user)
	return
}

/**
 * A Fastify authorization function that verifies and decodes the user bearer authorization on a route. It also checks for the user rank for admin privileges.
 */
export const adminBearerAuth: FastifyAuthFunction = async (req) => {
	await req.jwtVerify()
	if (!req.user) throw new ServerError({ code: 'AUTH_TOKEN_ERROR' })
	const user = await req.server.db.users.findOne({ _id: new req.server.mongo.ObjectId(req.user.sub) })
	if (!user) throw new ServerError({ code: 'AUTH_TOKEN_ERROR' })
	if (!user.active) throw new ServerError({ code: 'FORBIDDEN_BANNED_USER' })
	if (user.rank < 3) throw new ServerError({ code: 'FORBIDDEN_NO_PRIVILEGES' })
	req.setDecorator('userDocument', user)
	return
}
