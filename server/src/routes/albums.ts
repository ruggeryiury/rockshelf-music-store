import fp from 'fastify-plugin'

import { getAlbumThumbnail } from './albums/getAlbumThumbnail'

export const AlbumRoute = fp((fastify, _, done) => {
	fastify.register(getAlbumThumbnail)
	done()
})
