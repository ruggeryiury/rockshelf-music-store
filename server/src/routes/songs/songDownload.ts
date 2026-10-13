import fp from 'fastify-plugin'
import type { FilePath } from 'node-lib'
import { Readable } from 'node:stream'

import type { SongIdParams } from '@schemas'

import { ServerFileSystem } from '../../core/api/ServerFileSystem'
import { SwaggerAPI } from '../../core/api/SwaggerAPI'
import { ServerError } from '../../core/plugins/errors'
import type { RB3CompatibleDTAFile } from '../../core/rockshelf/dta/dtaStruct'
import { stringifyDTA } from '../../core/rockshelf/dta/stringifyDTA'
import { genRB3BufferFromEntry } from '../../core/rockshelf/rb3/genRB3BufferFromEntry'

export const songDownload = fp((fastify, _, done) => {
	fastify.get<{ Params: SongIdParams }>(
		'/api/v1/songs/:songId/download',
		{
			schema: {
				summary: 'Downloads a song RB3 file',
				tags: ['Song (Data)'],
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

			if (song.status !== 'available') throw new ServerError({ code: 'UNAVAILABLE_SONG_FILE' })

			await fastify.db.songs.updateOne({ _id: new fastify.mongo.ObjectId(songId) }, { $inc: { downloads: 1 } })

			const songFilePath = ServerFileSystem.publicDir().gotoFile(`users/${song.charterId.toHexString()}/songs/${songId}.bin`)
			if (!songFilePath.exists) throw new ServerError({ code: 'UNAVAILABLE_SONG_FILE' })

			const dtaContents = Buffer.from(stringifyDTA({ songs: [song.songData as RB3CompatibleDTAFile], updates: [] }))

			let thumbnailPath: FilePath | undefined
			if (song.albumId) {
				thumbnailPath = ServerFileSystem.publicDir().gotoFile(`artworks/${song.albumId.toHexString()}.webp`)
			}

			return reply
				.type('application/octec-stream')
				.header('content-disposition', `attachment; filename=${song.songData.id}.rb3`)
				.send(Readable.from(genRB3BufferFromEntry(songFilePath, song, dtaContents, thumbnailPath)))
		},
	)
	done()
})
