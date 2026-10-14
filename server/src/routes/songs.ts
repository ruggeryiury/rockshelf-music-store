import fp from 'fastify-plugin'

import { getSongData } from './songs/getSongData'
import { getSongDetails } from './songs/getSongDetails'
import { getSongFile } from './songs/getSongFile'
import { getSongThumbnail } from './songs/getSongThumbnail'
import { songDownload } from './songs/songDownload'
import { songRegister } from './songs/songRegister'

export const SongRoute = fp((fastify, _, done) => {
	fastify.register(songRegister)
	fastify.register(getSongDetails)
	fastify.register(getSongData)
	fastify.register(getSongThumbnail)
	fastify.register(songDownload)
	fastify.register(getSongFile)
	done()
})
