/** Where a square sits on a board, in pixels. */
export function place(square: number, size: number, tile: number) {
  return {
    left: (square % size) * tile,
    top: Math.floor(square / size) * tile,
    width: tile,
    height: tile,
  };
}
