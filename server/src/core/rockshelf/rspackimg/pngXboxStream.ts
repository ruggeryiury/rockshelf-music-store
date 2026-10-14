import { type FilePathLikeTypes, pathLikeToFilePath } from 'node-lib'

import { swap16Stream } from '@utils/swap16Stream'

/**
 * Converts a PNG_PS3 texture file into a PNG_XBOX and returns a async generator to stream the converted file.
 * - - - -
 * @param {FilePathLikeTypes} pngPs3Path The path to the PNG_PS3 texture file to be streamed.
 * @yields {Buffer}
 */
export async function* pngXboxStream(pngPs3Path: FilePathLikeTypes): AsyncGenerator<Buffer> {
	const filePath = pathLikeToFilePath(pngPs3Path)
	yield await filePath.readOffset(0, 0x20)
	yield* swap16Stream(filePath, 0x20)
}
