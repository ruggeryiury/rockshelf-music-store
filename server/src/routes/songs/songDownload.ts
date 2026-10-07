import fp from 'fastify-plugin'

import type { SongIdParams } from '@schemas'

import { ServerFileSystem } from '../../core/api/ServerFileSystem'
import { SwaggerAPI } from '../../core/api/SwaggerAPI'
import { ServerError } from '../../core/plugins/errors'

export const songDownload = fp((fastify, _, done) => {
	fastify.get<{ Params: SongIdParams }>(
		'/api/v1/songs/:songId/download',
		{
			schema: {
				summary: 'Downloads a song RB3 file',
				tags: ['Song Entry'],
				response: {
					200: SwaggerAPI.replySchemaWithFile('application/octec-stream').describe('Song RB3 file retrieved successfully'),
					404: SwaggerAPI.replySchema('SONG_ID_NOT_FOUND').describe('No registered song found with provided ID'),
					423: SwaggerAPI.replySchema('UNAVAILABLE_SONG_FILE').describe("The requested song file is being processed or modified and it's unavailable at the moment"),
				},
			},
		},
		async (req, reply) => {
			const { songId } = req.params
			const song = await fastify.dbFuncs.songs.findById(songId)
			if (!song) throw new ServerError({ code: 'SONG_ID_NOT_FOUND' })

			if (song.status !== 'available') throw new ServerError({ code: 'BUSY_SONG_FILE' })

			await fastify.db.songs.updateOne({ _id: new fastify.mongo.ObjectId(songId) }, { $inc: { downloads: 1 } })

			const songFilePath = ServerFileSystem.publicDir().gotoFile(`users/${song.userId.toHexString()}/songs/${songId}.rb3`)
			if (!songFilePath.exists) throw new ServerError({ code: 'UNAVAILABLE_SONG_FILE' })

			reply.type('application/octec-stream').header('content-disposition', `attachment; filename=${songId}.rb3`)
			return reply.sendFile(songFilePath.fullname, songFilePath.root)
		},
	)
	done()
})
