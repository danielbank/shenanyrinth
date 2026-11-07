# React + TypeScript client instead of push-poker's build-free JavaScript

Shenanyrinth started from `push-poker`'s stack: plain JavaScript with no build step, and an Express + Socket.IO server that owns the state. We moved to **TypeScript everywhere** and a **React 19 + Vite** client so that React Doctor at 100/100 can be a quality gate, because clean, composable React components keep the UI easy to build. The server still owns all game state and runs its `.ts` files on Node's built-in type stripping. TypeScript is restricted to erasable syntax (`erasableSyntaxOnly`, so no enums or namespaces), which keeps the server build-free; only the client is built.

## Considered Options

- **Stay build-free (push-poker as is):** simplest, but React Doctor can't score it, and there's no UI quality bar.
- **A framework (Next.js etc.):** routing and server rendering buy nothing for a one-screen game behind a socket.
- **react-motion for animation:** unmaintained since 2017 and supports React only up to 16. We use Motion (`motion/react`) instead.

## Consequences

- The server stays authoritative. Each Player gets their own view of the state, including their legal options, plus an ordered list of what just happened. The client plays those events as Motion animations and never re-runs rules.
- A Response window fast-forwards every client's animation queue, so all Players get the full 8 seconds.
- `npm start` builds the client and runs one Express server on one port, so a single ngrok tunnel still works.
