import type { WithId } from 'mongodb'
import { BinaryReader, BinaryWriter, FilePath, type FilePathLikeTypes, createHashFromBuffer, pathLikeToFilePath } from 'node-lib'
import sharp from 'sharp'

import type { SongDocument } from '../../schemas/db'
import { ServerFileSystem } from '../api/ServerFileSystem'
import { RB3_HEADER_SIZE, RB3_SONG_ENTRY_SIZE } from '../rockshelf/rb3/RB3File'
import { dateISOFormatToObject } from '../rockshelf/utils'

/**
 * Streams a Rock Band 3 Song Package file buffer from the database collection returning an `AsyncGenerator` object.
 * - - - -
 * @param {FilePathLikeTypes} songFilePath
 * @param {WithId<SongDocument>} song
 * @param {Buffer} dtaContents
 * @param {FilePath | undefined} [thumbnailPath] `OPTIONAL`
 * @yields {Buffer}
 */
export async function* rb3FileStream(songFilePath: FilePathLikeTypes, song: WithId<SongDocument>, dtaContents: Buffer, thumbnailPath?: FilePath): AsyncGenerator<Buffer> {
	const writer = new BinaryWriter()
	let thumbnail: Buffer | undefined

	writer.writeHex('524233010100')
	yield writer.toBuffer()

	writer.clearContents()
	writer.writeUInt24LE(dtaContents.length)
	yield writer.toBuffer()

	writer.clearContents()
	writer.writeUInt24LE(0)
	if (thumbnailPath) {
		thumbnail = await sharp(thumbnailPath.path).jpeg({ quality: 100 }).toBuffer()
		writer.writeUInt24LE(thumbnail.length)
	} else writer.writeUInt24LE(0)

	writer.writeHex('010000')
	const name = Buffer.from(song.songData.name)
	const songname = Buffer.from(song.songData.songname)
	writer.writeUInt8(name.length)
	writer.writeUInt8(songname.length)
	writer.writeHex('0000020204')
	yield writer.toBuffer()

	writer.clearContents()
	const now = new Date()
	const date = dateISOFormatToObject(now.toISOString())

	writer.writeUInt8(date.hour)
	writer.writeUInt8(date.min)
	writer.writeUInt8(date.sec)
	writer.writeUInt16LE(date.year)
	writer.writeUInt8(date.month)
	writer.writeUInt8(date.day)
	yield writer.toBuffer()

	writer.clearContents()
	writer.writeUInt32LE(RB3_HEADER_SIZE + RB3_SONG_ENTRY_SIZE + name.length + songname.length + dtaContents.length + (thumbnail?.length ?? 0))

	const reader = await BinaryReader.fromFile(songFilePath)
	reader.seek(0x20)
	const moggSize = await reader.readUInt32LE()
	const midiSize = await reader.readUInt32LE()

	let artworkSize = 0
	if (song.albumId && song.songData.album_art) {
		const songTexturePath = ServerFileSystem.artworksDir().gotoFile(`${song.albumId.toHexString()}_keep.png_ps3`)
		const { size } = await songTexturePath.stat()
		artworkSize = size
	}

	const miloSize = await reader.readUInt32LE()
	writer.writeUInt48LE(moggSize + midiSize + artworkSize + miloSize)

	reader.seek(0x04)
	writer.write(await reader.read(0x0c * 2 + 0x02))
	await reader.close()

	yield writer.toBuffer()

	writer.clearContents()
	yield Buffer.alloc(0x19c)

	let manifest = ''

	if (artworkSize) manifest += `| file=${song.songData.songname}/gen/${song.songData.songname}_keep.png_ps3 | size=${artworkSize}\n`
	if (miloSize) manifest += `| file=${song.songData.songname}/gen/${song.songData.songname}.milo_ps3 | size=${miloSize}\n`
	if (moggSize) manifest += `| file=${song.songData.songname}/${song.songData.songname}.mogg | size=${moggSize}\n`
	if (midiSize) manifest += `| file=${song.songData.songname}/${song.songData.songname}.mid.edat | size=${midiSize}\n`

	const packageHash = createHashFromBuffer(Buffer.from(manifest))

	writer.writeHex(packageHash)
	yield writer.toBuffer()

	writer.clearContents()
	writer.writeASCII(song.songData.songname, 0x2a)
	writer.writeUInt64LE(0)
	writer.writeUInt32LE(moggSize)
	writer.writeUInt32LE(midiSize)
	writer.writeUInt32LE(artworkSize)
	writer.writeUInt32LE(miloSize)
	writer.writeHex('000000000000000000000000000000000000')
	writer.writePadding(0x0c)

	yield writer.toBuffer()

	writer.clearContents()
	yield name
	yield songname
	yield dtaContents
	if (thumbnail) yield thumbnail

	const songFile = pathLikeToFilePath(songFilePath)

	for await (const chunk of songFile.createReadStream({ start: 0x30, end: 0x30 + moggSize + midiSize - 1 })) {
		yield chunk as Buffer
	}

	if (song.albumId && song.songData.album_art && artworkSize > 0) {
		const songTexturePath = ServerFileSystem.artworksDir().gotoFile(`${song.albumId.toHexString()}_keep.png_ps3`)
		for await (const chunk of songTexturePath.createReadStream()) {
			yield chunk as Buffer
		}
	}

	for await (const chunk of songFile.createReadStream({ start: 0x30 + moggSize + midiSize })) {
		yield chunk as Buffer
	}
}
