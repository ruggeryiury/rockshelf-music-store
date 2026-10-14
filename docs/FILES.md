# Custom File Formats

## Rockshelf Music Store Song Data

The _Rockshelf Music Store Song Data_ is a file container used specifically on Rockshelf Music Store server. The package contains raw binary data of the song. The file header has a fixed `0x30` (48) bytes.

### Header

| NAME                                                                                       | OFFSET | LENGTH | TYPE       | DESCRIPTION                                                                                                                                                                     |
| ------------------------------------------------------------------------------------------ | ------ | ------ | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Magic                                                                                      | `0x00` | `0x03` | `ASCII`    | The file signature. Always `0x52 0x53 0x44` ("RSD").                                                                                                                            |
| File Version                                                                               | `0x03` | `0x01` | `UInt8`    | The version of the binary file. Used to switch between different parsing process.                                                                                               |
| [Rockshelf Music Store](https://github.com/ruggeryiury/rockshelf-music-store) Charter ID   | `0x04` | `0x0c` | `byte[]`   | The charter ID on the Rockshelf Music Store servers. NULL bytes means the song was created directly by Rockshelf and wasn't processed through the Rockshelf Music Store server. |
| [Rockshelf Music Store](https://github.com/ruggeryiury/rockshelf-music-store) Song ID      | `0x10` | `0x0c` | `byte[]`   | The song ID on the Rockshelf Music Store servers. NULL bytes means the song was created directly by Rockshelf and wasn't processed through the Rockshelf Music Store server.    |
| [Rockshelf Music Store](https://github.com/ruggeryiury/rockshelf-music-store) Song Version | `0x1c` | `0x02` | `UInt16LE` | The song version on the Rockshelf Music Store servers.                                                                                                                          |
| _Reserved (padding)_                                                                       | `0x1e` | `0x02` | `byte[]`   |                                                                                                                                                                                 |
| MOGG File Length                                                                           | `0x20` | `0x04` | `UInt32LE` | The length of the song's MOGG file.                                                                                                                                             |
| MIDI File Length                                                                           | `0x24` | `0x04` | `UInt32LE` | The length of the song's MIDI file.                                                                                                                                             |
| MILO File Length                                                                           | `0x28` | `0x04` | `UInt32LE` | The length of the song's MILO file.                                                                                                                                             |
| _Reserved (padding)_                                                                       | `0x2c` | `0x04` | `byte[]`   |                                                                                                                                                                                 |

### Raw Data

After the header, the raw data is placed with the actual binary data of the song, that follows the following order:

- MOGG File
- MIDI File
- MILO File
