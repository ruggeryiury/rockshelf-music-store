import fp from 'fastify-plugin'
import { MongoServerError, type ObjectId } from 'mongodb'
import { createHashFromBuffer, parseReadableBytesSize } from 'node-lib'
import { pipeline } from 'node:stream/promises'

import { songRegisterBodySchema } from '@schemas'
import { countDigits, generateInternalSongname } from '@utils/strNum'

import { BinaryAPI } from '../../core/api/BinaryAPI'
import { ServerFileSystem } from '../../core/api/ServerFileSystem'
import { SwaggerAPI } from '../../core/api/SwaggerAPI'
import { userBearerAuth } from '../../core/plugins/auth'
import { ServerError } from '../../core/plugins/errors'
import { success } from '../../core/plugins/response'
import type { RB3CompatibleDTAFile } from '../../core/rockshelf/dta/dtaStruct'
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
					409: SwaggerAPI.replySchema('RB3_FILE_ALREADY_UPLOADED').describe('RB3 file contents hash matches an already uploaded song'),
					413: SwaggerAPI.replySchema('SONG_FILE_TOO_LARGE').describe('Song file is too large'),
				},
				security: [
					{
						bearerAuth: [],
					},
				],
			},
			preHandler: fastify.auth([userBearerAuth({ verified: true })]),
		},
		async (req, reply) => {
			const user = req.userDocument
			const songId = new fastify.mongo.ObjectId()
			const now = new Date()

			// Create user song folder, if it doesn't exists already
			const userPublicRoot = ServerFileSystem.publicDir().gotoDir(`users/${user._id.toHexString()}`)
			if (!userPublicRoot.exists) await userPublicRoot.mkDir()

			const userSongsRoot = userPublicRoot.gotoDir('songs')
			if (!userSongsRoot.exists) await userSongsRoot.mkDir()

			const tempRB3Path = ServerFileSystem.tempFile({ extension: 'rb3' })

			// This path will concat the bytes of the MOGG, MIDI, and MILO files
			const songFilePath = userSongsRoot.gotoFile(`${songId.toHexString()}.bin`)

			// Stream RB3 file to temp, necessary to consume the request
			const parts = req.parts({ limits: { fileSize: parseReadableBytesSize('96MB'), files: 1, fields: 0 } })
			for await (const part of parts) {
				if (part.type === 'file') {
					await pipeline(part.file, await tempRB3Path.createWriteStream())

					if (part.file.truncated) {
						if (tempRB3Path.exists) await tempRB3Path.delete()
						throw new ServerError('SONG_FILE_TOO_LARGE')
					}
				}
			}

			// Chacking uploaded RB3 file
			const rb3 = new RB3File(tempRB3Path)

			try {
				await rb3.checkFileIntegrity()
			} catch {
				if (rb3.path.exists) await rb3.path.delete()
				throw new ServerError({ code: 'INVALID_RB3_FILE' })
			}

			const stat = await rb3.stat()

			// The RB3 file must have a song
			if (stat.dta.songs.length === 0) {
				if (rb3.path.exists) await rb3.path.delete()
				throw new ServerError({ code: 'INVALID_RB3_FILE' })
			}

			// The RB3 file can't have more than one song, although song package implementation might be on the plans for the future
			if (stat.isSongPackage) {
				if (rb3.path.exists) await rb3.path.delete()
				throw new ServerError({ code: 'RB3_PACK_NOT_SUPPORTED' })
			}

			// The RB3 files must be decrypted
			if (stat.header.encryptionStatus !== 'decrypted') {
				if (rb3.path.exists) await rb3.path.delete()
				throw new ServerError('RB3_SONG_FILES_ENCRYPTED')
			}

			// Checks if the same file with the same contents were already uploaded
			const fileHash = Buffer.from(stat.header.packageHash, 'hex').toBase64()

			if (await fastify.db.songs.findOne({ fileHash }, { projection: { _id: 1 } })) {
				if (rb3.path.exists) await rb3.path.delete()
				throw new ServerError('RB3_FILE_ALREADY_UPLOADED')
			}

			const songData = stat.dta.songs[0] as RB3CompatibleDTAFile | undefined
			const songEntry = stat.header.songEntries[0] as RB3FileHeaderSongEntriesObject | undefined

			if (!songData || !songEntry) {
				if (rb3.path.exists) await rb3.path.delete()
				throw new ServerError({ code: 'INVALID_RB3_FILE' })
			}

			// This will enforce songs created from MAGMA
			if (songData.format !== 10 && songData.version !== 30) throw new ServerError({ code: 'INVALID_SONG_FORMAT_VERSION' })
			const artistHash = createHashFromBuffer(Buffer.from(songData.artist.toLowerCase()), 'sha256', 'base64url')

			// Register a new artist
			let artistId: ObjectId
			const artistDocument = await fastify.dbFuncs.artists.findByHash(artistHash)

			if (!artistDocument) {
				// Register a new artist
				artistId = new fastify.mongo.ObjectId()

				await fastify.db.artists.insertOne({
					_id: artistId,
					name: songData.artist,
					nameSearch: normalizeString(songData.artist),
					hash: artistHash,
				})

				// Artist found on database, copy artist ID
			} else artistId = artistDocument._id

			let albumId: ObjectId | undefined
			let albumHash: string | undefined

			if (!songData.album_name && songData.album_art) {
				const defaultAlbumName = `${songData.artist.toLowerCase()} - ${songData.name.toLowerCase()} (Single)`
				albumId = new fastify.mongo.ObjectId()
				albumHash = createHashFromBuffer(Buffer.from(defaultAlbumName), 'sha256', 'base64url')

				const albumArtworkPath = ServerFileSystem.publicDir().gotoFile(`artworks/${albumId.toHexString()}.webp`)
				const tempPngPath = ServerFileSystem.publicDir().gotoFile(`artworks/${albumId.toHexString()}.png`)
				const tempDdsPath = ServerFileSystem.publicDir().gotoFile(`artworks/${albumId.toHexString()}.dds`)
				const albumTexturePath = albumArtworkPath.changeFileName(`${albumId.toHexString()}_keep`, 'png_ps3')
				if (!albumArtworkPath.exists) {
					const tempTex = await rb3.extractFile(`${songData.songname}_keep.png_ps3`, ServerFileSystem.tempFile({ extension: 'png_ps3' }))
					if (!tempTex) throw new Error()

					await texPS3ToImage(tempTex, albumArtworkPath, 'webp')
					await texPS3ToImage(tempTex, tempPngPath, 'png')
					await BinaryAPI.nvCompress(tempPngPath, tempDdsPath)

					const texWriter = await albumTexturePath.openStreamWriter()
					texWriter.write(Buffer.from('AQgYAAAABAABAAEAAQAAAAAAAAAAAAAAAAAAAAAAAAA=', 'base64'))

					await new Promise<void>((resolve, reject) => {
						const start = 0x80
						const readStream = tempDdsPath.createReadStream({ start })

						readStream.on('data', (chunk: Buffer) => texWriter.write(chunk))
						readStream.on('end', () => {
							readStream.close()
							resolve()
						})
						readStream.on('error', reject)
					})

					await texWriter.close()
					if (tempTex.exists) await tempTex.delete()
					if (tempPngPath.exists) await tempPngPath.delete()
					if (tempDdsPath.exists) await tempDdsPath.delete()
				}

				await fastify.db.albums.insertOne({
					_id: albumId,
					artistId,
					name: defaultAlbumName,
					nameSearch: normalizeString(defaultAlbumName),
					hash: albumHash,
				})
			} else if (songData.album_name && songData.album_art) {
				albumHash = createHashFromBuffer(Buffer.from(`${songData.artist.toLowerCase()} - ${songData.album_name.toLowerCase()}`), 'sha256', 'base64url')
				const albumDocument = await fastify.dbFuncs.albums.findByHash(albumHash)

				if (!albumDocument) {
					albumId = new fastify.mongo.ObjectId()

					const albumArtworkPath = ServerFileSystem.publicDir().gotoFile(`artworks/${albumId.toHexString()}.webp`)
					const tempPngPath = ServerFileSystem.publicDir().gotoFile(`artworks/${albumId.toHexString()}.png`)
					const tempDdsPath = ServerFileSystem.publicDir().gotoFile(`artworks/${albumId.toHexString()}.dds`)
					const albumTexturePath = albumArtworkPath.changeFileName(`${albumId.toHexString()}_keep`, 'png_ps3')
					if (!albumArtworkPath.exists) {
						const tempTex = await rb3.extractFile(`${songData.songname}_keep.png_ps3`, ServerFileSystem.tempFile({ extension: 'png_ps3' }))
						if (!tempTex) throw new Error()

						await texPS3ToImage(tempTex, albumArtworkPath, 'webp')
						await texPS3ToImage(tempTex, tempPngPath, 'png')
						await BinaryAPI.nvCompress(tempPngPath, tempDdsPath)

						const texWriter = await albumTexturePath.openStreamWriter()
						texWriter.write(Buffer.from('AQgYAAAABAABAAEAAQAAAAAAAAAAAAAAAAAAAAAAAAA=', 'base64'))

						await new Promise<void>((resolve, reject) => {
							const start = 0x80
							const readStream = tempDdsPath.createReadStream({ start })

							readStream.on('data', (chunk: Buffer) => texWriter.write(chunk))
							readStream.on('end', () => {
								readStream.close()
								resolve()
							})
							readStream.on('error', reject)
						})

						await texWriter.close()
						if (tempTex.exists) await tempTex.delete()
						if (tempPngPath.exists) await tempPngPath.delete()
						if (tempDdsPath.exists) await tempDdsPath.delete()
					}

					await fastify.db.albums.insertOne({
						_id: albumId,
						artistId,
						name: songData.album_name,
						nameSearch: normalizeString(songData.album_name),
						hash: albumHash,
					})

					// Album from artist found on database, copying album ID
				} else if (albumDocument) albumId = albumDocument._id
			}
			try {
				// Writing the song data binary file header and streaming contents into the new file
				const writer = await songFilePath.openStreamWriter()

				writer.writeHex('0x52534401')
				writer.writeHex(user._id.toHexString())
				writer.writeHex(songId.toHexString())
				writer.writeHex('01000000')

				writer.writeUInt32LE(songEntry.moggSize)
				writer.writeUInt32LE(songEntry.midiSize)
				writer.writeUInt32LE(songEntry.miloSize)
				writer.writePadding(4)

				// Save MOGG and MIDI file
				await new Promise<void>((resolve, reject) => {
					const start = stat.header.songDataOffset
					const end = start + songEntry.moggSize + songEntry.midiSize - 1
					const readStream = tempRB3Path.createReadStream({ start, end })

					readStream.on('data', (chunk: Buffer) => writer.write(chunk))
					readStream.on('end', () => {
						readStream.close()
						resolve()
					})
					readStream.on('error', reject)
				})

				// Jump the artwork file and save MILO file, as it was already processed
				await new Promise<void>((resolve, reject) => {
					const start = stat.header.songDataOffset + songEntry.moggSize + songEntry.midiSize + songEntry.artworkSize
					const readStream = tempRB3Path.createReadStream({ start })

					readStream.on('data', (chunk: Buffer) => writer.write(chunk))
					readStream.on('end', () => {
						readStream.close()
						resolve()
					})
					readStream.on('error', reject)
				})
				await writer.close()
				await tempRB3Path.delete()

				// This is the method that generates new IDs and internal songnames for customs.
				const baseSongname = generateInternalSongname(songData.name, 40)
				let newSongname = baseSongname
				const newSongID = await fastify.dbFuncs.counters.newSongID()

				let suffix = 2

				while (await fastify.db.songs.findOne({ 'songData.id': newSongname }, { projection: { _id: 1 } })) {
					const suffixDigitsCount = countDigits(suffix)
					newSongname = `${baseSongname.slice(0, suffixDigitsCount > 2 ? 42 - suffixDigitsCount : 42)}${suffix++}`
					console.log(newSongname)
				}

				songData.id = newSongname
				songData.songname = newSongname
				songData.song_id = newSongID

				await fastify.db.songs.insertOne({
					_id: songId,
					charterId: user._id,
					artistId,
					albumId,
					fileSize: stat.header.packageSize,
					fileHash,
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

				if (tempRB3Path.exists) await tempRB3Path.delete()

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
