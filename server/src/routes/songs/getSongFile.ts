import fp from 'fastify-plugin'
import { encode as iconvEncode } from 'iconv-lite'
import { Readable } from 'node:stream'
import sharp from 'sharp'

import { type GetSongFileQuerystring, type SongIdParams, getSongFileQuerystringSchema, songIdParams } from '@schemas'

import { ServerFileSystem } from '../../core/api/ServerFileSystem'
import { SwaggerAPI } from '../../core/api/SwaggerAPI'
import { ServerError } from '../../core/plugins/errors'
import { DTAIO } from '../../core/rockshelf/dta/DTAIO'
import type { RB3CompatibleDTAFile } from '../../core/rockshelf/dta/dtaStruct'
import { stringifyDTA } from '../../core/rockshelf/dta/stringifyDTA'
import { RSD_HEADER_SIZE, parseRSDFileHeader } from '../../core/rockshelf/rsbin/parseRSDHeader'
import { pngXboxStream } from '../../core/rockshelf/rspackimg/pngXboxStream'

export const getSongFile = fp((fastify, _, done) => {
	fastify.get<{ Params: SongIdParams; Querystring: GetSongFileQuerystring }>(
		'/api/v1/songs/:songId/file',
		{
			schema: {
				summary: 'Downloads specific files from a song',
				description: 'Accepted values for "format":\n\n- For DTA:\n\n\t- `0` RB3 format\n\n\t- `1` MAGMA format',
				tags: ['Song (Data)'],
				response: {
					200: SwaggerAPI.replySchemaWithFile('application/octet-stream').describe('Song file retrieved successfully'),
					404: SwaggerAPI.replySchema('SONG_ID_NOT_FOUND').describe('No registered song found with provided ID, no artwork for the provided song'),
				},
				params: songIdParams,
				querystring: getSongFileQuerystringSchema,
			},
		},
		async (req, reply) => {
			const { songId } = req.params
			const { type } = req.query
			let { format } = req.query
			console.log(req.params, req.query)

			const songObjectId = new fastify.mongo.ObjectId(songId)

			const songEntry = await fastify.db.songs.findOne({ _id: songObjectId })
			if (!songEntry) throw new ServerError({ code: 'SONG_ID_NOT_FOUND' })

			switch (type) {
				case 'dta': {
					if (format > 1) format = 0
					const dtaContents = iconvEncode(stringifyDTA({ songs: [songEntry.songData as RB3CompatibleDTAFile], updates: [] }, { formatOptions: format === 0 ? DTAIO.formatOptions.defaultRB3 : DTAIO.formatOptions.defaultMAGMA }), 'win1252')
					return reply.type('application/octet-stream').header('content-disposition', `attachment; filename="${songEntry.songData.id}.dta"`).send(dtaContents)
				}
				case 'mogg': {
					const songRSD = ServerFileSystem.publicDir().gotoFile(`users/${songEntry.charterId.toHexString()}/songs/${songEntry._id.toHexString()}.bin`)
					const header = await parseRSDFileHeader(songRSD)
					return reply
						.type('application/octet-stream')
						.header('content-disposition', `attachment; filename="${songEntry.songData.id}.mogg"`)
						.send(songRSD.createReadStream({ start: RSD_HEADER_SIZE, end: RSD_HEADER_SIZE + header.moggSize - 1 }))
				}
				case 'midi': {
					const songRSD = ServerFileSystem.publicDir().gotoFile(`users/${songEntry.charterId.toHexString()}/songs/${songEntry._id.toHexString()}.bin`)
					const header = await parseRSDFileHeader(songRSD)
					return reply
						.type('application/octet-stream')
						.header('content-disposition', `attachment; filename="${songEntry.songData.id}.mid"`)
						.send(songRSD.createReadStream({ start: RSD_HEADER_SIZE + header.moggSize, end: RSD_HEADER_SIZE + header.moggSize + header.midiSize - 1 }))
				}
				case 'webp':
				case 'png': {
					if (!songEntry.songData.album_art || !songEntry.albumId) throw new ServerError({ code: 'SONG_ID_NO_ARTWORK' })
					const songArtwork = ServerFileSystem.artworksDir().gotoFile(`${songEntry.albumId}.webp`)
					if (!songArtwork.exists) throw new ServerError({ code: 'SONG_ID_NO_ARTWORK' })
					if (type === 'webp') return reply.type('image/webp').header('content-disposition', `attachment; filename="${songEntry.songData.id}.webp"`).send(songArtwork.createReadStream())
					else
						return reply
							.type('image/png')
							.header('content-disposition', `attachment; filename="${songEntry.songData.id}.png"`)
							.send(await sharp(songArtwork.path).png().toBuffer())
				}
				case 'png-ps3':
				case 'png-xbox': {
					if (!songEntry.songData.album_art || !songEntry.albumId) throw new ServerError({ code: 'SONG_ID_NO_ARTWORK' })
					const songTexture = ServerFileSystem.artworksDir().gotoFile(`${songEntry.albumId}_keep.png_ps3`)
					if (!songTexture.exists) throw new ServerError({ code: 'SONG_ID_NO_ARTWORK' })

					if (type === 'png-ps3') return reply.type('application/octet-stream').header('content-disposition', `attachment; filename="${songEntry.songData.id}_keep.png_ps3"`).send(songTexture.createReadStream())
					else
						return reply
							.type('application/octet-stream')
							.header('content-disposition', `attachment; filename="${songEntry.songData.id}_keep.png_xbox"`)
							.send(Readable.from(pngXboxStream(songTexture)))
				}
				case 'milo': {
					const songRSD = ServerFileSystem.publicDir().gotoFile(`users/${songEntry.charterId.toHexString()}/songs/${songEntry._id.toHexString()}.bin`)
					const header = await parseRSDFileHeader(songRSD)
					return reply
						.type('application/octet-stream')
						.header('content-disposition', `attachment; filename="${songEntry.songData.id}.milo_ps3"`)
						.send(songRSD.createReadStream({ start: RSD_HEADER_SIZE + header.moggSize + header.midiSize }))
				}
			}
		},
	)
	done()
})
