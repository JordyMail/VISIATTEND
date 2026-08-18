// Word Search Puzzle Generator

export interface WordSearchResult {
  grid: string[][];
  size: number;
  word: string;
}

// Supported placement directions: [rowDelta, colDelta]
const DIRS: [number, number][] = [
  [0,  1],  // right
  [1,  0],  // down
  [1,  1],  // diagonal down-right
  [0, -1],  // left
  [-1, 0],  // up
  [-1,-1],  // diagonal up-left
  [1, -1],  // diagonal down-left
  [-1, 1],  // diagonal up-right
];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function generateWordSearch(answer: string): WordSearchResult {
  const word = answer.toUpperCase().replace(/[^A-Z]/g, '');
  if (!word) return { grid: [['?']], size: 1, word: '' };

  const size = Math.max(word.length + 3, 9);
  const grid: string[][] = Array.from({ length: size }, () => Array(size).fill(''));

  const dirs = shuffle(DIRS);
  let placed = false;

  for (const [dr, dc] of dirs) {
    // Compute valid start range so the word fits within the grid
    const r0 = dr >= 0 ? 0 : word.length - 1;
    const r1 = dr <= 0 ? size - 1 : size - word.length;
    const c0 = dc >= 0 ? 0 : word.length - 1;
    const c1 = dc <= 0 ? size - 1 : size - word.length;
    if (r1 < r0 || c1 < c0) continue;

    const r = r0 + Math.floor(Math.random() * (r1 - r0 + 1));
    const c = c0 + Math.floor(Math.random() * (c1 - c0 + 1));

    for (let k = 0; k < word.length; k++) {
      grid[r + dr * k][c + dc * k] = word[k];
    }
    placed = true;
    break;
  }

  if (!placed) {
    // Fallback: place horizontally on middle row, wrap if needed
    const r = Math.floor(size / 2);
    for (let i = 0; i < Math.min(word.length, size); i++) grid[r][i] = word[i];
  }

  // Fill empty cells with random uppercase letters
  const alpha = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (!grid[r][c]) grid[r][c] = alpha[Math.floor(Math.random() * alpha.length)];
    }
  }

  return { grid, size, word };
}

/** Serialize grid to JSON string for DB storage */
export function serializeGrid(result: WordSearchResult): string {
  return JSON.stringify({ grid: result.grid, size: result.size, word: result.word });
}

/** Deserialize grid from DB */
export function deserializeGrid(raw: string): WordSearchResult | null {
  try {
    return JSON.parse(raw) as WordSearchResult;
  } catch {
    return null;
  }
}

/**
 * Given start cell and end cell, return the cells between them in a straight
 * line (horizontal, vertical, or diagonal). Returns null if not a valid line.
 */
export function getCellsInLine(
  startR: number, startC: number,
  endR: number, endC: number
): { r: number; c: number }[] | null {
  const dr = Math.sign(endR - startR);
  const dc = Math.sign(endC - startC);
  const lenR = Math.abs(endR - startR);
  const lenC = Math.abs(endC - startC);

  // Must be horizontal, vertical, or 45° diagonal
  if (dr !== 0 && dc !== 0 && lenR !== lenC) return null;

  const len = Math.max(lenR, lenC) + 1;
  const cells: { r: number; c: number }[] = [];
  for (let i = 0; i < len; i++) {
    cells.push({ r: startR + dr * i, c: startC + dc * i });
  }
  return cells;
}
