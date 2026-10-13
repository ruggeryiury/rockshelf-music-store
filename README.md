# Rockshelf Music Store

_Rockshelf Music Store_ joins a server and a website application to upload and download custom contents built exclusively for Rock Band 3 customs. It was created thinking to avoid emerging problems with a standardized custom distribution service.

## Features

- Fixed duplicated internal songnames and song IDs problems:
  - One of the main problems on the Rock Band 3 custom distribution is faulty unique values (like the internal name of the song files and song ID in-game) management. _Rockshelf Music Store_ is able to bypass these problems, implementing an automatic system to avoid song ID duplicates, using the Rock Band 3 Enhanced Song ID generator.
- Fixed album artwork discrepancies:
  - Syncing the album artworks of the song, _Rockshelf Music Store_ is able to mitigate the discrepancy problem, distributing the same artwork file for songs that shares the same album.
- Custom versioning to track updates:
  - Along with [Rockshelf](https://github.com/ruggeryiury/rockshelf), players can track outdated customs and automatically update them.
- Custom creation role system:
  - As a charter, you can tag other charters that did a collaboration with you on your custom song project with a proper role assignment system.

## Codebase

- Client: Developed with [Vite framework](https://vite.dev/) (using [TypeScript](https://www.typescriptlang.org/) + [React](https://react.dev/) + [React Compiler](https://react.dev/learn/react-compiler) template).
- Server: Developed using [NodeJS](https://nodejs.org) with [Fastify framework](https://fastify.dev/).
- RB3 and DTA file parsing methods taken from the [core package of Rockshelf](https://github.com/ruggeryiury/rockshelf).
