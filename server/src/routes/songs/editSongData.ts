import fp from 'fastify-plugin'

import { success } from '../../core/plugins/response'

export const editSongData = fp((fastify, _, done) => {
	fastify.patch('/api/v1/songs/edit', {}, async (req, reply) => {
		return success(req, reply, { code: '' })
	})
	done()
})
