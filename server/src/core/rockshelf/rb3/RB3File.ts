import { BinaryReader, FilePath, type FilePathJSONRepresentation, type FilePathLikeTypes, pathLikeToFilePath } from 'node-lib'

import { DTAParser } from '../dta/DTAParser'
import type { RB3CompatibleDTAFile } from '../dta/dtaStruct'
import { type RB3FileHeaderObject, RB3_HEADER_SIZE, RB3_SONG_ENTRY_SIZE, parseRB3FileHeader } from './parseRB3File'

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
		const magic = (await this.path.readOffset(0, 3)).toString()

		if (magic === 'RB3') return magic
		throw new Error(`Provided RB3 Song Package file "${this.path.path}" is not a valid RB3 Song Package file.`)
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

		await reader.close()

		const isSongPackage = dta.songs.length > 1

		return { header, packageName, fileSize, defaultFolderName, packageCreatorName, description, thumbnail, packageCreatorThumbnail, dta, isSongPackage }
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
}
