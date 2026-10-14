import { type FilePathLikeTypes, pathLikeToFilePath } from 'node-lib'

/**
 * Creates an asynchronous generator that reads a file as a stream and swaps
 * the byte order of each 16-bit value across consecutive chunks.
 *
 * Preserves trailing bytes between chunks to ensure that 16-bit values remain
 * correctly aligned, even when chunk boundaries split a value. Any unmatched
 * byte at the end of the file is yielded without modification.
 * - - - -
 * @param {FilePathLikeTypes} path The path to the file to read.
 * @param {number} [offsetStart] `OPTIONAL` Default is `0`.
 * @yields {Buffer} A buffer containing bytes with their 16-bit byte order swapped.
 * @throws {Error} If an error occurs while reading the file.
 */
export async function* swap16Stream(path: FilePathLikeTypes, offsetStart: number = 0): AsyncGenerator<Buffer> {
	const filePath = pathLikeToFilePath(path)
	let pending: Buffer | undefined

	for await (const chunk of filePath.createReadStream({ start: offsetStart })) {
		let buffer = chunk as Buffer

		if (pending) {
			buffer = Buffer.concat([pending, buffer])
			pending = undefined
		}

		if (buffer.length % 2 !== 0) {
			pending = buffer.subarray(buffer.length - 1)
			buffer = buffer.subarray(0, buffer.length - 1)
		}

		if (buffer.length > 0) {
			buffer.swap16()
			yield buffer
		}
	}

	// A final unmatched byte cannot be swapped.
	if (pending) {
		yield pending
	}
}
