import fp from 'fastify-plugin'
import { MongoServerError, type ObjectId } from 'mongodb'
import { createHashFromBuffer, parseReadableBytesSize } from 'node-lib'
import { pipeline } from 'node:stream/promises'
import sharp from 'sharp'

import { ServerFileSystem } from '../../core/api/ServerFileSystem'
import { SwaggerAPI } from '../../core/api/SwaggerAPI'
import { userBearerAuth } from '../../core/plugins/auth'
import { ServerError } from '../../core/plugins/errors'
import { success } from '../../core/plugins/response'
import { RB3File } from '../../core/rockshelf/rb3/RB3File'
import { songRegisterBodySchema } from '../../schemas/routes/songs'

export const songRegister = fp((fastify, _, done) => {
	fastify.post(
		'/api/v1/songs/register',
		{
			schema: {
				summary: 'Register a song to the database by uploading its RB3 file',
				tags: ['Song (Methods)'],
				consumes: ['multipart/form-data'],
				body: songRegisterBodySchema.nullable(),
				response: {
					201: SwaggerAPI.replySchema('SUCCESS_SONG_REGISTER').describe('Song has been registered successfully'),
					400: SwaggerAPI.replySchema('INVALID_RB3_FILE').describe('Invalid RB3 file, RB3 file with multiple songs, song files are encrypted'),
					401: SwaggerAPI.replySchema('AUTH_TOKEN_ERROR').describe('Token error (No token on request headers, expired token, invalid token signature)'),
					403: SwaggerAPI.replySchema('FORBIDDEN_BANNED_USER').describe('User banned from the server'),
					409: SwaggerAPI.replySchema('DUPLICATED_SONG_ID').describe('Duplicated song ID from the provided song'),
					413: SwaggerAPI.replySchema('SONG_FILE_TOO_LARGE').describe('Song file is too large'),
				},
				security: [
					{
						bearerAuth: [],
					},
				],
			},
			preHandler: fastify.auth([userBearerAuth]),
		},
		async (req, reply) => {
			const user = req.userDocument
			const songId = new fastify.mongo.ObjectId()

			const parts = req.parts({ limits: { fileSize: parseReadableBytesSize('96MB'), files: 1, fields: 0 } })

			const userPublicRoot = ServerFileSystem.publicDir().gotoDir(`users/${user._id.toHexString()}`)
			if (!userPublicRoot.exists) await userPublicRoot.mkDir()

			const userSongsRoot = userPublicRoot.gotoDir('songs')
			if (!userSongsRoot.exists) await userSongsRoot.mkDir()

			const songFilePath = userSongsRoot.gotoFile(`${songId.toHexString()}.rb3`)

			for await (const part of parts) {
				if (part.type === 'file') {
					await pipeline(part.file, await songFilePath.createWriteStream())

					if (part.file.truncated) {
						if (songFilePath.exists) await songFilePath.delete()
						throw new ServerError('SONG_FILE_TOO_LARGE')
					}
				}
			}

			const rb3 = new RB3File(songFilePath)

			try {
				await rb3.checkFileIntegrity()
			} catch {
				if (rb3.path.exists) await rb3.path.delete()
				throw new ServerError({ code: 'INVALID_RB3_FILE' })
			}

			const stat = await rb3.stat()
			if (stat.dta.songs.length === 0) {
				if (rb3.path.exists) await rb3.path.delete()
				throw new ServerError({ code: 'INVALID_RB3_FILE' })
			}

			if (stat.isSongPackage) {
				if (rb3.path.exists) await rb3.path.delete()
				throw new ServerError({ code: 'RB3_PACK_NOT_SUPPORTED' })
			}

			if (stat.header.encryptionStatus !== 'decrypted') {
				if (rb3.path.exists) await rb3.path.delete()
				throw new ServerError('RB3_SONG_FILES_ENCRYPTED')
			}

			const now = new Date()

			stat.dta.patchFeaturingTexts()
			stat.dta.patchSongsEncodings()
			stat.dta.patchInvalidValues()
			stat.dta.patchCores()

			const songData = stat.dta.songs[0]

			if (songData.format !== 10 && songData.version !== 30) throw new ServerError({ code: 'INVALID_SONG_FORMAT_VERSION' })
			const artistHash = createHashFromBuffer(Buffer.from(songData.artist.toLowerCase()), 'sha256', 'base64url')

			let artistId: ObjectId
			const artistDocument = await fastify.dbFuncs.artists.findByHash(artistHash)

			if (!artistDocument) {
				artistId = new fastify.mongo.ObjectId()

				await fastify.db.artists.insertOne({
					_id: artistId,
					name: songData.artist,
					hash: artistHash,
				})
			} else artistId = artistDocument._id

			let albumId: ObjectId | undefined
			let albumHash: string | undefined

			if (songData.album_name) {
				albumHash = createHashFromBuffer(Buffer.from(`${songData.artist.toLowerCase()} - ${songData.album_name.toLowerCase()}`), 'sha256', 'base64url')
				const albumDocument = await fastify.dbFuncs.albums.findByHash(albumHash)

				if (!albumDocument) {
					albumId = new fastify.mongo.ObjectId()

					await fastify.db.albums.insertOne({
						_id: albumId,
						artistId,
						name: songData.album_name,
						hash: albumHash,
					})
				} else albumId = albumDocument._id

				const albumArtworkPath = ServerFileSystem.publicDir().gotoFile(`artworks/${albumId.toHexString()}.webp`)
				if (!albumArtworkPath.exists) await sharp(stat.thumbnail).webp({ quality: 100 }).toFile(albumArtworkPath.path)
			}

			try {
				await fastify.db.songs.insertOne({
					_id: songId,
					userId: user._id,
					artistId,
					albumId,
					fileSize: stat.header.packageSize,
					fileHash: Buffer.from(stat.header.packageHash, 'hex').toBase64(),
					uploadedAt: now,
					updatedAt: now,
					status: 'available',
					views: 0,
					downloads: 0,
					description: '',
					songData,
				})
				return success(req, reply, { code: 'SUCCESS_SONG_REGISTER' })
			} catch (err) {
				if (rb3.path.exists) await rb3.path.delete()
				if (err instanceof MongoServerError && err.code === 11000) {
					if (typeof err.keyValue['songData.song_id'] === 'number') throw new ServerError({ code: 'DUPLICATED_SONG_ID', messageValues: { email: err.keyValue.email as string } })
				}

				throw new ServerError({ code: 'SERVER_ERROR_UNKNOWN' })
			}
		},
	)
	done()
})
