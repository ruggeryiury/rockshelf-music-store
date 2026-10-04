import fp from 'fastify-plugin'

import { userBan } from './admin/userBan'

export const AdminRoute = fp((fastify, _, done) => {
	fastify.register(userBan)
	done()
})
