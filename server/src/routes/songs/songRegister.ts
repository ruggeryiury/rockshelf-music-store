import fp from 'fastify-plugin'
import { MongoServerError, type ObjectId } from 'mongodb'
import { createHashFromBuffer, parseReadableBytesSize } from 'node-lib'
import { pipeline } from 'node:stream/promises'

import { songRegisterBodySchema } from '@schemas'
import { generateInternalSongname } from '@utils/string'

import { ServerFileSystem } from '../../core/api/ServerFileSystem'
import { SwaggerAPI } from '../../core/api/SwaggerAPI'
import { userBearerAuth } from '../../core/plugins/auth'
import { ServerError } from '../../core/plugins/errors'
import { success } from '../../core/plugins/response'
import type { RB3CompatibleDTAFile } from '../../core/rockshelf/dta/dtaStruct'
import { genNumericSongID } from '../../core/rockshelf/dta/genNumericSongID'
import { normalizeString } from '../../core/rockshelf/dta/textMethods'
import { RB3File } from '../../core/rockshelf/rb3/RB3File'
import type { RB3FileHeaderSongEntriesObject } from '../../core/rockshelf/rb3/parseRB3File'
import { texPS3ToImage } from '../../core/rockshelf/rspackimg/texToDDS'

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

			const userPublicRoot = ServerFileSystem.publicDir().gotoDir(`users/${user._id.toHexString()}`)
			if (!userPublicRoot.exists) await userPublicRoot.mkDir()

			const userSongsRoot = userPublicRoot.gotoDir('songs')
			if (!userSongsRoot.exists) await userSongsRoot.mkDir()

			const tempPath = ServerFileSystem.tempFile({ extension: 'rb3' })
			const songFilePath = userSongsRoot.gotoFile(`${songId.toHexString()}.bin`)

			// Stream RB3 file to temp
			const parts = req.parts({ limits: { fileSize: parseReadableBytesSize('96MB'), files: 1, fields: 0 } })
			for await (const part of parts) {
				if (part.type === 'file') {
					await pipeline(part.file, await tempPath.createWriteStream())

					if (part.file.truncated) {
						if (tempPath.exists) await tempPath.delete()
						throw new ServerError('SONG_FILE_TOO_LARGE')
					}
				}
			}

			const rb3 = new RB3File(tempPath)

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

			const songData = stat.dta.songs[0] as RB3CompatibleDTAFile | undefined
			const songEntry = stat.header.songEntries[0] as RB3FileHeaderSongEntriesObject | undefined

			if (!songData || !songEntry) {
				if (rb3.path.exists) await rb3.path.delete()
				throw new ServerError({ code: 'INVALID_RB3_FILE' })
			}

			if (songData.format !== 10 && songData.version !== 30) throw new ServerError({ code: 'INVALID_SONG_FORMAT_VERSION' })
			const artistHash = createHashFromBuffer(Buffer.from(songData.artist.toLowerCase()), 'sha256', 'base64url')

			let artistId: ObjectId
			const artistDocument = await fastify.dbFuncs.artists.findByHash(artistHash)

			if (!artistDocument) {
				artistId = new fastify.mongo.ObjectId()

				await fastify.db.artists.insertOne({
					_id: artistId,
					name: songData.artist,
					nameSearch: normalizeString(songData.artist),
					hash: artistHash,
				})
			} else artistId = artistDocument._id

			let albumId: ObjectId | undefined
			let albumHash: string | undefined

			if (songData.album_name) {
				albumHash = createHashFromBuffer(Buffer.from(`${songData.artist.toLowerCase()} - ${songData.album_name.toLowerCase()}`), 'sha256', 'base64url')
				const albumDocument = await fastify.dbFuncs.albums.findByHash(albumHash)

				if (!albumDocument && songData.album_art) {
					albumId = new fastify.mongo.ObjectId()

					try {
						const albumArtworkPath = ServerFileSystem.publicDir().gotoFile(`artworks/${albumId.toHexString()}.webp`)
						if (!albumArtworkPath.exists) {
							const tempPng = await rb3.extractFile(`${songData.songname}_keep.png_ps3`, ServerFileSystem.tempFile({ extension: 'png_ps3' }))
							if (!tempPng) throw new Error()

							await texPS3ToImage(tempPng, albumArtworkPath, 'webp')
							if (tempPng.exists) await tempPng.delete()
						}

						await fastify.db.albums.insertOne({
							_id: albumId,
							artistId,
							name: songData.album_name,
							nameSearch: normalizeString(songData.album_name),
							hash: albumHash,
						})
					} catch {
						// Do nothing
					}
				} else if (albumDocument) {
					albumId = albumDocument._id
				}
			}
			try {
				const now = new Date()
				const writer = await songFilePath.openStreamWriter()

				writer.writeHex('0x52534401')
				writer.writeHex(user._id.toHexString())
				writer.writeHex(songId.toHexString())
				writer.writeHex('01000000')

				writer.writeUInt32LE(songEntry.moggSize)
				writer.writeUInt32LE(songEntry.midiSize)
				writer.writeUInt32LE(songEntry.artworkSize)
				writer.writeUInt32LE(songEntry.miloSize)

				await new Promise<void>((resolve, reject) => {
					const readStream = tempPath.createReadStream({ start: stat.header.songDataOffset })

					readStream.on('data', (chunk: Buffer) => writer.write(chunk))
					readStream.on('end', () => {
						readStream.close()
						resolve()
					})
					readStream.on('error', reject)
				})
				await writer.close()
				await tempPath.delete()

				const newSongname = `ms_${generateInternalSongname(songData.name)}`
				const newSongID = genNumericSongID(newSongname)

				songData.id = newSongname
				songData.songname = newSongname
				songData.song_id = newSongID

				await fastify.db.songs.insertOne({
					_id: songId,
					charterId: user._id,
					artistId,
					albumId,
					fileSize: stat.header.packageSize,
					fileHash: Buffer.from(stat.header.packageHash, 'hex').toBase64(),
					uploadedAt: now,
					updatedAt: now,
					releaseDate: now,
					status: 'available',
					views: 0,
					downloads: 0,
					description: '',
					version: 1,
					songData,
					roles: [],
				})

				if (tempPath.exists) await tempPath.delete()

				return success(req, reply, { code: 'SUCCESS_SONG_REGISTER' })
			} catch (err) {
				if (rb3.path.exists) await rb3.path.delete()
				if (songFilePath.exists) await songFilePath.delete()

				if (err instanceof MongoServerError && err.code === 11000) {
					if (typeof err.keyValue['songData.song_id'] === 'number') throw new ServerError({ code: 'DUPLICATED_SONG_ID' })
					else if (typeof err.keyValue['songData.songname'] === 'string') throw new ServerError({ code: 'DUPLICATED_INTERNAL_SONGNAME' })
					else if (typeof err.keyValue['songData.id'] === 'string') throw new ServerError({ code: 'DUPLICATED_ID' })
				}

				throw new ServerError({ code: 'SERVER_ERROR_UNKNOWN' })
			}
		},
	)
	done()
})
