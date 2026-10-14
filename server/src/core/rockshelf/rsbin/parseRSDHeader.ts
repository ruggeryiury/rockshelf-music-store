import { BinaryReader, type FilePath, type FilePathLikeTypes, pathLikeToFilePath } from 'node-lib'

export const RSD_HEADER_SIZE = 0x30
export interface RSDFileHeaderObject {
	fileVersion: number
	charterId: string
	songId: string
	songVersion: number
	moggSize: number
	midiSize: number
	miloSize: number
}

/**
 * Parses a Rockshelf Song Data file contents.
 * - - - -
 * @param {FilePathLikeTypes} rsdFilePath The path to the Rockshelf Song Data file to be parsed.
 * @returns {Promise<RSDFileHeaderObject>}
 */
export const parseRSDFileHeader = async (rsdFilePath: FilePathLikeTypes | Buffer): Promise<RSDFileHeaderObject> => {
	let rsdFile: FilePath | undefined
	if (!Buffer.isBuffer(rsdFilePath)) rsdFile = pathLikeToFilePath(rsdFilePath)

	const reader = rsdFile && !Buffer.isBuffer(rsdFilePath) ? await BinaryReader.fromFile(rsdFile) : BinaryReader.fromBuffer(rsdFilePath as Buffer)

	if (reader.length < RSD_HEADER_SIZE) throw new Error('RSD Song Package file is too small to process, is the file corrupted?')

	reader.seek(0)

	const magic = await reader.readASCII(3)
	if (magic !== 'RSD') throw new Error(`Invalid file signature of RSD file.`)

	const fileVersion = await reader.readUInt8()
	const charterId = await reader.readHex(0x0c, false)
	const songId = await reader.readHex(0x0c, false)
	const songVersion = await reader.readUInt16LE()
	reader.padding(0x02)

	const moggSize = await reader.readUInt32LE()
	const midiSize = await reader.readUInt32LE()
	const miloSize = await reader.readUInt32LE()

	await reader.close()

	return {
		fileVersion,
		charterId,
		songId,
		songVersion,
		moggSize,
		midiSize,
		miloSize,
	}
}
