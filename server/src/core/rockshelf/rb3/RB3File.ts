import { BinaryReader, type FilePath, type FilePathJSONRepresentation, type FilePathLikeTypes, pathLikeToFilePath } from 'node-lib'
import { pipeline } from 'node:stream/promises'

import { DTAParser } from '../dta/DTAParser'
import type { RB3CompatibleDTAFile } from '../dta/dtaStruct'
import { type RB3FileHeaderObject, parseRB3FileHeader } from './parseRB3File'

export const RB3_HEADER_SIZE = 0x200
export const RB3_HEADER_PADDING = 0x19c
export const RB3_SONG_ENTRY_SIZE = 0x60
export const RB3_SONG_ENTRY_PADDING = 0x0c
export const RB3_SONGNAME_MAX_LENGTH = 0x2a

export interface RB3FileStatObject {
	/**
	 * An object with values stored in the file header.
	 */
	header: RB3FileHeaderObject
	/**
	 * The song package name.
	 */
	packageName: string
	/**
	 * The file size.
	 */
	fileSize: number
	/**
	 * The original name of the folder storing the song package file.
	 */
	defaultFolderName: string
	/**
	 * The creator of the song package. If `undefined`, it will be an anonymous creator.
	 */
	packageCreatorName?: string
	/**
	 * A `Buffer` object of the contents of the song package's `package.md` file. Use to store description, rendered by a Markdown parser.
	 */
	description?: Buffer
	/**
	 * A `Buffer` object containing the package thumbnail in a JPEG file format. The _Rockshelf Pack Image_ footer is ignored on the buffer, containing only raw JPEG data.
	 */
	thumbnail: Buffer
	/**
	 * A `Buffer` object containing the package author thumbnail in a JPEG file format.
	 */
	packageCreatorThumbnail?: Buffer
	/**
	 * A [DTAParser](../rbtools/core/DTAParser.ts) object to access and manipulate the package metadata file.
	 */
	dta: DTAParser
	/**
	 * Tells if the song package contains more than one song.
	 */
	isSongPackage: boolean
	/**
	 * An array of strings with relative paths for the extractable files of the song package.
	 */
	files: string[]
}

export interface RB3FileJSONRepresentation extends Omit<RB3FileStatObject, 'dta' | 'description' | 'thumbnail' | 'packageCreatorThumbnail'> {
	/**
	 * A JSON representation with stats of the file path.
	 */
	path: FilePathJSONRepresentation
	/**
	 * The bytes of the song package's `package.md` file encoded as base-64 string.
	 */
	description?: string
	/**
	 * The bytes of the package thumbnail JPEG file encoded as DataURL string.
	 */
	thumbnail: string
	/**
	 * The bytes of the package creator thumbnail JPEG file encoded as DataURL string.
	 */
	packageCreatorThumbnail?: string
	/**
	 * The contents of the package's DTA file.
	 */
	dta: RB3CompatibleDTAFile[]
}

export type RB3FileGetterTypes = 'songs.dta' | 'folder.jpg' | 'creator.jpg' | 'package.md' | `${string}.mogg` | `${string}.mid` | `${string}_keep.png_ps3` | `${string}.milo_ps3`

/**
 * A class that represents a Rock Band 3 Song Package file (`.rb3`).
 *
 * The Rock Band 3 Song Package file is a file container used specifically on Rockshelf. The package contains raw data and all information needed to recreate the package when sharing through other users. The file creation and contents depacking is way faster than both STFS/CON and PKG files. The file header has a fixed 0x60 bytes, with each song entry having fixed 0x50 bytes.
 *
 * @see [RB3 File Documentation](https://github.com/ruggeryiury/rockshelf#rock-band-3-song-package-file).
 */
export class RB3File {
	// #region Constructor

	/** The path to the RB3 Song Package file. */
	path: FilePath

	/**
	 * `RB3File` is a class that represents a RB3 Song Package file.
	 * - - - -
	 * @param {FilePathLikeTypes} rb3FilePath The path to the RB3 Song Package file.
	 */
	constructor(rb3FilePath: FilePathLikeTypes) {
		this.path = pathLikeToFilePath(rb3FilePath)
	}

	// #region Methods

	/**
	 * Checks the integrity of the RB3 Song Package file by reading the file signature (magic).
	 * - - - -
	 * @returns {Promise<string>}
	 * @throws {Error} When it identifies file signature of any unknown file format.
	 */
	async checkFileIntegrity(): Promise<string> {
		if (!this.path.exists) throw new Error(`Provided RB3 Song Package file "${this.path.path}" does not exists.`)
		const reader = await BinaryReader.fromFile(this.path)
		const magic = await reader.readASCII(0x03)
		reader.seek(0x05)
		const songsCount = await reader.readUInt8()

		if (magic !== 'RB3' || reader.length < RB3_HEADER_SIZE + 0x60 * songsCount) throw new Error(`Provided RB3 Song Package file "${this.path.path}" is not a valid RB3 Song Package file.`)

		await reader.close()

		return magic
	}

	/**
	 * Returns an object with stats of the RB3 Song Package file.
	 * - - - -
	 * @returns {Promise<RB3FileStatObject>}
	 */
	async stat(): Promise<RB3FileStatObject> {
		await this.checkFileIntegrity()

		const header = await parseRB3FileHeader(this.path)
		const reader = await BinaryReader.fromFile(this.path)

		reader.seek(RB3_HEADER_SIZE + header.songsCount * RB3_SONG_ENTRY_SIZE)
		const packageName = await reader.readUTF8(header.packageNameLength)
		const defaultFolderName = await reader.readUTF8(header.packageFolderNameLength)

		let packageCreatorName: string | undefined
		if (header.packageCreatorNameLength > 0) packageCreatorName = await reader.readUTF8(header.packageCreatorNameLength)

		const dta = DTAParser.fromBuffer(await reader.read(header.dtaFileLength))

		dta.sort('Song Title, Artist')

		let description: Buffer | undefined
		if (header.descriptionLength > 0) description = await reader.read(header.descriptionLength)

		const thumbnail = await reader.read(header.thumbnailLength)

		let packageCreatorThumbnail: Buffer | undefined
		if (header.packageCreatorThumbnailLength > 0) packageCreatorThumbnail = await reader.read(header.packageCreatorThumbnailLength)

		const fileSize = reader.length

		const files: string[] = []

		if (header.dtaFileLength) files.push('songs.dta')
		if (header.thumbnailLength) files.push('folder.jpg')
		if (header.packageCreatorThumbnailLength) files.push('creator.jpg')

		for (const song of header.songEntries) {
			const { artworkSize, midiSize, miloSize, moggSize, songname } = song
			if (moggSize) files.push(`${songname}/${songname}.mogg`)
			if (midiSize) files.push(`${songname}/${songname}.mid`)
			if (artworkSize) files.push(`${songname}/gen/${songname}_keep.png_ps3`)
			if (miloSize) files.push(`${songname}/gen/${songname}.milo_ps3`)
		}

		await reader.close()

		const isSongPackage = dta.songs.length > 1

		return { header, packageName, fileSize, defaultFolderName, packageCreatorName, description, thumbnail, packageCreatorThumbnail, dta, isSongPackage, files }
	}

	/**
	 * Returns a JSON representation of this `RB3File` class.
	 *
	 * This method is very similar to `.stat()`, but converts `Buffer` values into JSON-friendly string representations.
	 * - - - -
	 * @returns {Promise<RB3FileJSONRepresentation>}
	 */
	async toJSON(): Promise<RB3FileJSONRepresentation> {
		const stat = await this.stat()
		return {
			path: this.path.toJSON(),
			...stat,
			description: stat.header.descriptionLength > 0 && stat.description ? stat.description.toString('base64') : undefined,
			thumbnail: `data:image/jpeg;base64,${stat.thumbnail.toString('base64')}`,
			packageCreatorThumbnail: stat.header.packageCreatorThumbnailLength > 0 && stat.packageCreatorThumbnail ? `data:image/jpeg;base64,${stat.packageCreatorThumbnail.toString('base64')}` : undefined,
			dta: stat.dta.songs,
		}
	}

	/**
	 * Searches for a file in the song package file and returns a `Buffer` with the file contents. Returns `undefined` if the file doesn't exists on the song package file system.
	 * - - - -
	 * @param {T} fileName The name of the file.
	 * @returns {Promise<Buffer | undefined>}
	 */
	async readFileBuffer<T extends RB3FileGetterTypes>(fileName: T): Promise<Buffer | undefined> {
		let value: Buffer | undefined
		const stat = await this.stat()
		const reader = await this.path.openReader()

		const { songDataOffset, songEntries, dtaFileLength, thumbnailLength, packageCreatorThumbnailLength, packageNameLength, packageFolderNameLength, packageCreatorNameLength, descriptionLength } = stat.header
		const entriesCount = songEntries.length
		if (fileName === 'songs.dta' && dtaFileLength) {
			reader.seek(0x200 + entriesCount * 0x60 + packageNameLength + packageFolderNameLength + packageCreatorNameLength, 'start')
			value = await reader.read(dtaFileLength)
		} else if (fileName === 'folder.jpg' && thumbnailLength) {
			reader.seek(0x200 + entriesCount * 0x60 + packageNameLength + packageFolderNameLength + packageCreatorNameLength + dtaFileLength + descriptionLength, 'start')
			value = await reader.read(thumbnailLength)
		} else if (fileName === 'creator.jpg' && packageCreatorThumbnailLength) {
			reader.seek(0x200 + entriesCount * 0x60 + packageNameLength + packageFolderNameLength + packageCreatorNameLength + dtaFileLength + descriptionLength + thumbnailLength, 'start')
			value = await reader.read(packageCreatorThumbnailLength)
		} else if (fileName === 'package.md' && descriptionLength) {
			reader.seek(0x200 + entriesCount * 0x60 + packageNameLength + packageFolderNameLength + packageCreatorNameLength + dtaFileLength)
			value = await reader.read(descriptionLength)
		} else {
			if (fileName.endsWith('.mogg')) {
				const songname = fileName.replace(/\.mogg$/, '').split('/')[0]
				let songOffsetStart = songDataOffset

				for (const song of songEntries) {
					songOffsetStart += song.offset

					if (song.songname === songname) {
						reader.seek(songOffsetStart)
						value = await reader.read(song.moggSize)
						break
					}

					reader.seek(songOffsetStart)
					continue
				}
			} else if (fileName.endsWith('.mid')) {
				const songname = fileName.replace(/\.mid$/, '').split('/')[0]
				let songOffsetStart = songDataOffset

				for (const song of songEntries) {
					songOffsetStart += song.offset + song.moggSize

					if (song.songname === songname) {
						reader.seek(songOffsetStart)
						value = await reader.read(song.midiSize)
						break
					}

					reader.seek(songOffsetStart)
					continue
				}
			} else if (fileName.endsWith('_keep.png_ps3')) {
				const songname = fileName
					.replace(/_keep\.png_ps3$/, '')
					.replace(/\/gen/, '')
					.split('/')[0]
				let songOffsetStart = songDataOffset

				for (const song of songEntries) {
					songOffsetStart += song.offset + song.moggSize + song.midiSize

					if (song.songname === songname) {
						reader.seek(songOffsetStart)
						value = await reader.read(song.artworkSize)
						break
					}

					reader.seek(songOffsetStart)
					continue
				}
			} else if (fileName.endsWith('.milo_ps3')) {
				const songname = fileName
					.replace(/\.milo_ps3$/, '')
					.replace(/\/gen/, '')
					.split('/')[0]
				let songOffsetStart = songDataOffset

				for (const song of songEntries) {
					songOffsetStart += song.offset + song.moggSize + song.midiSize + song.artworkSize

					if (song.songname === songname) {
						reader.seek(songOffsetStart)
						value = await reader.read(song.miloSize)
						break
					}

					reader.seek(songOffsetStart)
					continue
				}
			}
		}

		await reader.close()
		return value
	}

	/**
	 * Searches for a file in the song package file and extracts its file contents. Returns `undefined` if the file doesn't exists on the song package file system.
	 * - - - -
	 * @param {T} fileName The name of the file.
	 * @param {FilePathLikeTypes} destPath The destination path of the extracted file.
	 * @returns {Promise<FilePath | undefined>}
	 */
	async extractFile<T extends RB3FileGetterTypes>(fileName: T, destPath: FilePathLikeTypes): Promise<FilePath | undefined> {
		const stat = await this.stat()

		const { songDataOffset, songEntries, dtaFileLength, thumbnailLength, packageCreatorThumbnailLength, packageNameLength, packageFolderNameLength, packageCreatorNameLength, descriptionLength } = stat.header

		const entriesCount = songEntries.length
		const src = this.path
		const dest = pathLikeToFilePath(destPath)

		if (fileName === 'songs.dta' && dtaFileLength) {
			const start = 0x200 + entriesCount * 0x60 + packageNameLength + packageFolderNameLength + packageCreatorNameLength
			const end = start + dtaFileLength
			const read = src.createReadStream({ start, end })
			const write = await dest.createWriteStream()
			await pipeline(read, write)
			return dest
		} else if (fileName === 'folder.jpg' && thumbnailLength) {
			const start = 0x200 + entriesCount * 0x60 + packageNameLength + packageFolderNameLength + packageCreatorNameLength + dtaFileLength + descriptionLength
			const end = start + thumbnailLength
			const read = src.createReadStream({ start, end })
			const write = await dest.createWriteStream()
			await pipeline(read, write)
			return dest
		} else if (fileName === 'creator.jpg' && packageCreatorThumbnailLength) {
			const start = 0x200 + entriesCount * 0x60 + packageNameLength + packageFolderNameLength + packageCreatorNameLength + dtaFileLength + descriptionLength + thumbnailLength
			const end = start + packageCreatorThumbnailLength
			const read = src.createReadStream({ start, end })
			const write = await dest.createWriteStream()
			await pipeline(read, write)
			return dest
		} else if (fileName === 'package.md' && descriptionLength) {
			const start = 0x200 + entriesCount * 0x60 + packageNameLength + packageFolderNameLength + packageCreatorNameLength + dtaFileLength
			const end = start + descriptionLength
			const read = src.createReadStream({ start, end })
			const write = await dest.createWriteStream()
			await pipeline(read, write)
			return dest
		} else {
			if (fileName.endsWith('.mogg')) {
				const songname = fileName.replace(/\.mogg$/, '').split('/')[0]
				let songOffsetStart = songDataOffset

				for (const song of songEntries) {
					songOffsetStart += song.offset

					if (song.songname === songname) {
						const start = songOffsetStart
						const end = songOffsetStart + song.moggSize
						const read = src.createReadStream({ start, end })
						const write = await dest.createWriteStream()
						await pipeline(read, write)
						return dest
					}

					continue
				}
			} else if (fileName.endsWith('.mid')) {
				const songname = fileName.replace(/\.mid$/, '').split('/')[0]
				let songOffsetStart = songDataOffset

				for (const song of songEntries) {
					songOffsetStart += song.offset + song.moggSize

					if (song.songname === songname) {
						const start = songOffsetStart
						const end = songOffsetStart + song.midiSize
						const read = src.createReadStream({ start, end })
						const write = await dest.createWriteStream()
						await pipeline(read, write)
						return dest
					}

					continue
				}
			} else if (fileName.endsWith('_keep.png_ps3')) {
				const songname = fileName
					.replace(/_keep\.png_ps3$/, '')
					.replace(/\/gen/, '')
					.split('/')[0]
				let songOffsetStart = songDataOffset

				for (const song of songEntries) {
					songOffsetStart += song.offset + song.moggSize + song.midiSize

					if (song.songname === songname) {
						const start = songOffsetStart
						const end = songOffsetStart + song.artworkSize
						const read = src.createReadStream({ start, end })
						const write = await dest.createWriteStream()
						await pipeline(read, write)
						return dest
					}

					continue
				}
			} else if (fileName.endsWith('.milo_ps3')) {
				const songname = fileName
					.replace(/\.milo_ps3$/, '')
					.replace(/\/gen/, '')
					.split('/')[0]
				let songOffsetStart = songDataOffset

				for (const song of songEntries) {
					songOffsetStart += song.offset + song.moggSize + song.midiSize + song.artworkSize

					if (song.songname === songname) {
						const start = songOffsetStart
						const end = songOffsetStart + song.miloSize
						const read = src.createReadStream({ start, end })
						const write = await dest.createWriteStream()
						await pipeline(read, write)
						return dest
					}

					continue
				}
			}
		}
	}
}
