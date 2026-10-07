import fp from 'fastify-plugin'

import { type SongIdParams, songIdParams } from '@schemas'

import { SwaggerAPI } from '../../core/api/SwaggerAPI'
import { ServerError } from '../../core/plugins/errors'
import { success } from '../../core/plugins/response'
import { type GetSongDataQuerystring, getSongDataQuerystringSchema, getSongDataSuccessSchema } from '../../schemas/routes/songs'

export const getSongData = fp((fastify, _, done) => {
	fastify.get<{ Params: SongIdParams; Querystring: GetSongDataQuerystring }>(
		'/api/v1/songs/:songId/data',
		{
			schema: {
				summary: 'Retrieves a parsed DTA file as JSON from a song',
				tags: ['Song Entry'],
				response: {
					200: SwaggerAPI.replySchema('OK', getSongDataSuccessSchema.shape.data.nonoptional()).describe('Song data received'),
					404: SwaggerAPI.replySchema('SONG_ID_NOT_FOUND').describe('No registered song found with provided ID'),
				},
				params: songIdParams,
				querystring: getSongDataQuerystringSchema,
			},
		},
		async (req, reply) => {
			const { songId } = req.params
			const { incrementCount } = req.query

			const songObjectId = new fastify.mongo.ObjectId(songId)

			if (incrementCount) {
				const update = await fastify.db.songs.updateOne({ _id: songObjectId }, { $inc: { views: 1 } })
				if (update.matchedCount === 0) throw new ServerError({ code: 'SONG_ID_NOT_FOUND' })
			}

			const songEntry = await fastify.db.songs.findOne({ _id: songObjectId })

			if (!songEntry) throw new ServerError({ code: 'SONG_ID_NOT_FOUND' })

			console.log(req.params, req.query)

			return success(req, reply, { code: 'OK', data: songEntry.songData })
		},
	)
	done()
})
