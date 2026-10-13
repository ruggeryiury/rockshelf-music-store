/* eslint-disable @typescript-eslint/no-unused-vars */
import { BinaryWriter, FilePath, type FilePathLikeTypes, pathLikeToFilePath } from 'node-lib'
import sharp from 'sharp'

import type { ArtworkSizeTypes, DDSFormatTypes, SharpExportFormatTypes } from '@schemas'

import { decodeDDSrgbaData, parseDDSFileHeader } from './ddsParser'

export interface DDSHeaderParserObject {
	/**
	 * The encoding type of the DDS file.
	 */
	type: DDSFormatTypes
	/**
	 * The width of the DDS file.
	 */
	width: ArtworkSizeTypes
	/**
	 * The height of the DDS file.
	 */
	height: ArtworkSizeTypes
	/**
	 * The header data as buffer.
	 */
	data: Buffer
}

export const buildDDSHeader = (format: DDSFormatTypes, width: number, height: number): Buffer => {
	const dds = [0x44, 0x44, 0x53, 0x20, 0x7c, 0x00, 0x00, 0x00, 0x07, 0x10, 0x0a, 0x00, 0x00, 0x02, 0x00, 0x00, 0x00, 0x02, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x0a, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x4e, 0x45, 0x4d, 0x4f, 0x00, 0x00, 0x00, 0x00, 0x20, 0x00, 0x00, 0x00, 0x04, 0x00, 0x00, 0x00, 0x44, 0x58, 0x54, 0x35, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x10, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]

	switch (format.toLowerCase()) {
		case 'dxt1':
			dds[87] = 0x31
			break
		case 'dxt3':
			dds[87] = 0x33
			break
		case 'normal':
			dds[84] = 0x41
			dds[85] = 0x54
			dds[86] = 0x49
			dds[87] = 0x32
			break
	}

	switch (height) {
		case 8:
			dds[12] = 0x08
			dds[13] = 0x00
			break
		case 16:
			dds[12] = 0x10
			dds[13] = 0x00
			break
		case 32:
			dds[12] = 0x20
			dds[13] = 0x00
			break
		case 64:
			dds[12] = 0x40
			dds[13] = 0x00
			break
		case 128:
			dds[12] = 0x80
			dds[13] = 0x00
			break
		case 256:
			dds[13] = 0x01
			break
		case 1024:
			dds[13] = 0x04
			break
		case 2048:
			dds[13] = 0x08
			break
	}

	switch (width) {
		case 8:
			dds[16] = 0x08
			dds[17] = 0x00
			break
		case 16:
			dds[16] = 0x10
			dds[17] = 0x00
			break
		case 32:
			dds[16] = 0x20
			dds[17] = 0x00
			break
		case 64:
			dds[16] = 0x40
			dds[17] = 0x00
			break
		case 128:
			dds[16] = 0x80
			dds[17] = 0x00
			break
		case 256:
			dds[17] = 0x01
			break
		case 1024:
			dds[17] = 0x04
			break
		case 2048:
			dds[17] = 0x08
			break
	}

	if (width === height) {
		switch (width) {
			case 8:
				// No mipmaps at this size
				dds[0x1c] = 0x00
				break
			case 16:
				dds[0x1c] = 0x05
				break
			case 32:
				dds[0x1c] = 0x06
				break
			case 64:
				dds[0x1c] = 0x07
				break
			case 128:
				dds[0x1c] = 0x08
				break
			case 256:
				dds[0x1c] = 0x09
				break
			case 1024:
				dds[0x1c] = 0x0b
				break
			case 2048:
				dds[0x1c] = 0x0c
				break
		}
	}
	return Buffer.from(dds)
}

export const getDDSHeader = (fullDDSHeader: Buffer, shortDDSHeader: Buffer): DDSHeaderParserObject => {
	let header = buildDDSHeader('DXT5', 256, 256)
	let format: DDSFormatTypes = 'DXT5'
	let size: ArtworkSizeTypes = 512

	const headers: [string, DDSFormatTypes, ArtworkSizeTypes][] = [
		['AQQIAAAAA4AAgABAAAAAAA==', 'DXT1', 128],
		['AQgYAAAAA4AAgACAAAAAAA==', 'DXT5', 128],
		['AQggAAAAA4AAgACAAAAAAA==', 'NORMAL', 128],
		['AQQIAAAABAABAAGAAAAAAA==', 'DXT1', 256],
		// ['AQgYAAAAAAABAAEAAQAAAA==', 'DXT5', 256], // No MIP
		['AQgYAAAABAABAAEAAQAAAA==', 'DXT5', 256],
		['AQQIAAAABQACAAIAAQAAAA==', 'DXT1', 512],
		['AQgYAAAABQACAAIAAgAAAA==', 'DXT5', 512],
		['AQQIAAAABQAEAAQABAAAAA==', 'DXT1', 1024],
		['AQgYAAAABQAEAAQABAAAAA==', 'DXT5', 1024],
		['AQQIAAAABgAIAAgACAAAAA==', 'DXT1', 2048],
		['AQgYAAAABgAIAAgACAAAAA==', 'DXT5', 2048],
	]

	for (const buf of headers) {
		if (buf[0] === fullDDSHeader.toString('base64')) {
			const [_, fmt, sz] = buf
			format = fmt
			size = sz
			header = buildDDSHeader(format, size, size)
			break
		}
	}

	return {
		type: format,
		width: size,
		height: size,
		data: header,
	}
}

/**
 * Converts a PNG_PS3 texture file to WEBP and returns an instantiated `FilePath` class pointing to the new converted file.
 * - - - -
 * @param {FilePathLikeTypes} srcFile The path of the texture file to be converted.
 * @param {FilePathLikeTypes} destPath The destination path of the new WEBP file.
 * @param {SharpExportFormatTypes} toFormat The format to want to convert the texture file.
 * @param {number | undefined} [quality] `OPTIONAL` Default is `100`.
 * @param {true | 'near' | false} [lossless] `OPTIONAL` Default is `true`.
 * @returns {Promise<FilePath}
 */
export const texPS3ToImage = async (srcFile: FilePathLikeTypes, destPath: FilePathLikeTypes, toFormat: SharpExportFormatTypes, quality: number = 100, lossless: true | 'near' | false = true): Promise<FilePath> => {
	const src = pathLikeToFilePath(srcFile)
	const dest = pathLikeToFilePath(destPath).changeFileExt(toFormat)

	await dest.delete()

	const srcBuffer = await src.read()
	// 32 is the size of the texture file header we need to skip
	const srcContents = src.ext === '.png_ps3' ? srcBuffer.subarray(32) : srcBuffer.subarray(32).swap16()

	const fullHeader = srcBuffer.subarray(0, 16)
	const shortHeader = srcBuffer.subarray(5, 11)

	const srcHeader = getDDSHeader(fullHeader, shortHeader)
	const ddsBytes = new BinaryWriter()
	ddsBytes.write(srcHeader.data)
	ddsBytes.write(srcContents)

	const ddsBuffer = ddsBytes.toBuffer()

	const header = parseDDSFileHeader(ddsBuffer)

	const image = header.images[0]
	const rgba = decodeDDSrgbaData(ddsBuffer.subarray(image.offset, image.offset + image.length), header.format, image.shape.width, image.shape.height)

	const img = sharp(rgba, { raw: { width: header.shape.width, height: header.shape.height, channels: 4 } })
	const imgMetadata = await img.metadata()

	if (imgMetadata.width !== 256) img.resize(256)

	const options: { lossless?: boolean; nearLossless?: boolean; quality: number } = { quality }

	if (lossless === 'near') options.nearLossless = true
	else if (lossless) options.lossless = true

	switch (toFormat) {
		case 'webp':
			img.webp(options)
			break
		case 'avif':
			img.avif(options)
			break
		case 'gif':
			img.gif()
			break
		case 'jpeg':
		case 'jpg':
			img.jpeg(options)
			break
		case 'png':
			img.png(options)
			break
		case 'tiff':
			img.tiff(options)
	}

	await img.toFile(dest.path)
	return dest
}
