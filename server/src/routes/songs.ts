import fp from 'fastify-plugin'

import { getSongData } from './songs/getSongData'
import { getSongDetails } from './songs/getSongDetails'
import { getSongFileHeader } from './songs/getSongFileHeader'
import { getSongThumbnail } from './songs/getSongThumbnail'
import { songDownload } from './songs/songDownload'
import { songRegister } from './songs/songRegister'

export const SongRoute = fp((fastify, _, done) => {
	fastify.register(songRegister)
	fastify.register(getSongDetails)
	fastify.register(getSongData)
	fastify.register(getSongThumbnail)
	fastify.register(getSongFileHeader)
	fastify.register(songDownload)
	done()
})
