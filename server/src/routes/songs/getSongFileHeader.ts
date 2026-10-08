import fp from 'fastify-plugin'

import { type SongIdParams, rb3FileHeaderSchema, songIdParams } from '@schemas'

import { ServerFileSystem } from '../../core/api/ServerFileSystem'
import { SwaggerAPI } from '../../core/api/SwaggerAPI'
import { ServerError } from '../../core/plugins/errors'
import { success } from '../../core/plugins/response'
import { RB3File } from '../../core/rockshelf/rb3/RB3File'

export const getSongFileHeader = fp((fastify, _, done) => {
	fastify.get<{ Params: SongIdParams }>(
		'/api/v1/:songId/header',
		{
			schema: {
				summary: 'Retrieves an object with the parsed header data of the Rock Band 3 Song Package file',
				tags: ['Song (Data)'],
				response: {
					200: SwaggerAPI.replySchema('OK', rb3FileHeaderSchema.nonoptional()).describe('Song file header data received'),
					404: SwaggerAPI.replySchema('SONG_ID_NOT_FOUND').describe('No registered song found with provided ID'),
				},
				params: songIdParams,
			},
		},
		async (req, reply) => {
			const { songId } = req.params
			const songObjectId = new fastify.mongo.ObjectId(songId)

			const songEntry = await fastify.db.songs.findOne({ _id: songObjectId })

			if (!songEntry) throw new ServerError({ code: 'SONG_ID_NOT_FOUND' })

			const userId = songEntry.userId.toHexString()

			const rb3 = new RB3File(ServerFileSystem.publicDir().gotoFile(`users/${userId}/songs/${songId}.rb3`))
			const data = { ...(await rb3.toJSON()) } as Record<string, unknown>
			delete data.path

			return success(req, reply, { code: 'OK', data })
		},
	)
	done()
})
