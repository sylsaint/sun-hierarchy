import { Vertex } from '@/interface/graph';
import { edgeMatrix } from '@/utils/edge';

/*
 * heuristic method for the reordering of the row order \sigma_1 = v_1 v_2 \cdots v_{|V_1|} to
 * reduce the number of crossings under the fixed column order \sigma_2 in M(\sigma_1, \sigma_2)
 */

export interface OrderWrapper {
  value: number;
  idx: number;
}

export interface RowCol {
  rows: number[];
  cols: number[];
}

type TwoLevelbaryCentricResult = {
  row: Vertex[];
  col: Vertex[];
  crossCount: number;
};

type TwoLevelbaryCentricOptions = {
  // current iteration round
  currentRound?: number;
  // total iteration round
  totalRound?: number;
  // if row is fixed, only col will be permutated
  rowFixed?: boolean;
  // if col is fixed, only row will be permutated
  colFixed?: boolean;
  // you should not set this, for inner use
  exchanged?: { [key: string]: boolean };
  // you should not set this, for inner use
  minCross?: number;
  // you should not set this, for inner use
  crossCount?: number;
};

type MulLevelbaryCentricOptions = {
  currentRound?: number;
  totalRound?: number;
  totalCross?: number;
};

type MulLevelbaryCentricResult = {
  levels: Vertex[][];
  totalCross: number;
};

export type baryCentricResult = {
  levels: Vertex[][];
  crossCount: number;
};

export type BaryCentricOptions = {
  // total iteration round
  totalRound?: number;
  // if row is fixed, only col will be permutated
  rowFixed?: boolean;
  // if col is fixed, only row will be permutated
  colFixed?: boolean;
};

const DEFAULT_TOTAL_ROUND = 12;
const DEFAULT_TOTAL_BI_ROUND = 6;

function crossCount(rows: Vertex[], cols: Vertex[]): number {
  const matrix: number[][] = [];
  rows.map((vr, row) => {
    matrix[row] = [];
    cols.map((vc, col) => {
      const hasEdge = vr.edges.findIndex((edge) => edge.down.id === vc.id) !== -1;
      if (hasEdge) {
        matrix[row][col] = 1;
      } else {
        matrix[row][col] = 0;
      }
    });
  });
  let totalCross = 0;
  for (let r = 0; r < matrix.length; r++) {
    const row = matrix[r];
    let cross = 0;
    for (let c = 0; c < row.length; c++) {
      if (row[c] !== 1) continue;
      const r1 = r + 1;
      const c1 = c;
      for (let rr = r1; rr < matrix.length; rr++) {
        const rrow = matrix[rr];
        for (let cc = 0; cc < c1; cc++) {
          if (rrow[cc] === 1) cross += 1;
        }
      }
    }
    totalCross += cross;
  }
  return totalCross;
}

function getKey(key1: string | number, key2: string | number, reversed: boolean = false) {
  if (reversed) return `${key2}_|_${key1}`;
  return `${key1}_|_${key2}`;
}

/**
 *
 * @param prevLevel vertices at some level
 * @param nextLevel vertices at next level
 * @returns baryCentric coefficient of everty vertex in prevLeven and nextLevel
 */
function calcbaryCentricCoefficient(prevLevel: Array<Vertex>, nextLevel: Array<Vertex>) {
  const matrix: Array<Array<number>> = edgeMatrix(prevLevel, nextLevel);
  let rows: Array<number> = [];
  let cols: Array<number> = [];
  prevLevel.map((_v, idx) => {
    rows[idx] =
      matrix[idx].map((v, i) => v * (i + 1)).reduce((prev, cur) => prev + cur, 0) /
      (matrix[idx].reduce((prev, cur) => prev + cur, 0) || 1);
  });
  nextLevel.map((_c, idx) => {
    let weights: number = 0;
    let sum: number = 0;
    prevLevel.map((_v, i) => {
      weights += matrix[i][idx] * (i + 1);
      sum += matrix[i][idx];
    });
    cols[idx] = weights / (sum || 1);
  });
  return { rows, cols };
}

/**
 *
 * @description this is a heuristic method which tries to reduce crossings. with calculating baryCentric coefficient of every vertex
 * and reordering vertext position, this method can reduce crossings effectively.
 * @param row vertices at some level, treated as row
 * @param col vertices at next level, treated as col
 * @param options - configuration object to function
 * @returns
 */
export function calcTwoLevelbaryCentric(
  row: Vertex[],
  col: Vertex[],
  {
    currentRound = 1,
    totalRound = DEFAULT_TOTAL_BI_ROUND,
    minCross = Number.POSITIVE_INFINITY,
    exchanged = {},
    rowFixed,
    colFixed,
  }: TwoLevelbaryCentricOptions,
): TwoLevelbaryCentricResult {
  const { rows } = calcbaryCentricCoefficient(row, col);
  let KS: number = crossCount(row, col);
  let KSS = KS;
  let rowOrdered = false;
  let colOrdered = false;

  let newRow = [...row];
  if (!rowFixed) {
    newRow = rows
      .map((r, i) => {
        return { value: r, idx: i };
      })
      .sort((a, b) => {
        if (a.value === b.value) return 0;
        return a.value < b.value ? -1 : 1;
      })
      .map((order) => {
        return row[order.idx];
      });
    KSS = crossCount(newRow, col);
    if (KSS < KS) {
      rowOrdered = true;
      KS = KSS;
    }
  }

  let newCol = [...col];
  if (!colFixed) {
    const { cols } = calcbaryCentricCoefficient(newRow, col);
    newCol = cols
      .map((r, i) => {
        return { value: r, idx: i };
      })
      .sort((a, b) => {
        if (a.value === b.value) return 0;
        return a.value < b.value ? -1 : 1;
      })
      .map((order) => {
        return col[order.idx];
      });
    KSS = crossCount(newRow, newCol);
    if (KSS < KS) {
      colOrdered = true;
      KS = KSS;
    }
  }
  return finetuneTwoLevelbaryCentric(rowOrdered ? newRow : [...row], colOrdered ? newCol : [...col], {
    currentRound,
    totalRound,
    exchanged,
    crossCount: KS,
    rowFixed,
    colFixed,
  });
}

/**
 *
 * @description if there are vertices in row/col which have the same baryCentric coefficient, this function would try to exchange
 * their positions in order to reduce crossings.
 * @param prevLevel vertices at some level
 * @param nextLevel vertices at next level
 * @returns baryCentric coefficient of everty vertex in prevLeven and nextLevel
 */
function finetuneTwoLevelbaryCentric(
  row: Vertex[],
  col: Vertex[],
  {
    currentRound = 1,
    totalRound = DEFAULT_TOTAL_BI_ROUND,
    exchanged = {},
    crossCount = Number.POSITIVE_INFINITY,
    rowFixed,
    colFixed,
  }: TwoLevelbaryCentricOptions,
): TwoLevelbaryCentricResult {
  // reach iteration max limit or eliminate all crosses
  if (currentRound >= totalRound || crossCount === 0) return { row, col, crossCount };
  const { rows, cols } = calcbaryCentricCoefficient(row, col);
  const isRowMonotonicallyIncreasing =
    rows.filter((v, i) => {
      if (i === rows.length - 1) return false;
      return v === rows[i + 1];
    }).length === 0;
  const isColMonotonicallyIncreasing =
    cols.filter((v, i) => {
      if (i === cols.length - 1) return false;
      return v === cols[i + 1];
    }).length === 0;
  // if both row and col order is strictly ascending
  if (isRowMonotonicallyIncreasing && isColMonotonicallyIncreasing) {
    return { row, col, crossCount };
    // if col is strictly ascending
  } else if (isColMonotonicallyIncreasing) {
    if (rowFixed) return { row, col, crossCount };
    let allChanged = true;
    const reOrderedRow: Vertex[] = rows
      .map((r, i) => {
        return { value: r, idx: i };
      })
      .sort((a, b) => {
        if (a.value === b.value) {
          const hasExchanged = exchanged[getKey(row[a.idx].id, row[b.idx].id)];
          if (hasExchanged) return 0;
          exchanged[getKey(row[a.idx].id, row[b.idx].id)] = true;
          exchanged[getKey(row[a.idx].id, row[b.idx].id, true)] = true;
          allChanged = false;
          return 1;
        }
        return a.value < b.value ? -1 : 1;
      })
      .map((order) => row[order.idx]);
    if (allChanged) return { row, col, crossCount };
    return calcTwoLevelbaryCentric(reOrderedRow, col, {
      currentRound: currentRound + 1,
      totalRound,
      exchanged,
      minCross: crossCount,
      rowFixed,
      colFixed,
    });
    // if col is not strictly ascending
  } else {
    if (colFixed) return { row, col, crossCount };
    let allChanged = true;
    const reOrderedCols: Vertex[] = cols
      .map((r, i) => {
        return { value: r, idx: i };
      })
      .sort((a, b) => {
        if (a.value === b.value) {
          const hasExchanged = exchanged[getKey(col[a.idx].id, col[b.idx].id)];
          if (hasExchanged) return 0;
          exchanged[getKey(col[a.idx].id, col[b.idx].id)] = true;
          exchanged[getKey(col[a.idx].id, col[b.idx].id, true)] = true;
          allChanged = false;
          return 1;
        }
        return a.value <= b.value ? -1 : 1;
      })
      .map((order) => {
        return col[order.idx];
      });
    if (allChanged) return { row, col, crossCount };
    return calcTwoLevelbaryCentric(row, reOrderedCols, {
      currentRound: currentRound + 1,
      totalRound,
      minCross: crossCount,
      exchanged,
      rowFixed,
      colFixed,
    });
  }
}

function downUpPhase(levels: Vertex[][]): MulLevelbaryCentricResult {
  let totalCross = 0;
  levels.map((vertices, idx) => {
    if (idx === levels.length - 1) return;
    const { col, crossCount } = calcTwoLevelbaryCentric(vertices, levels[idx + 1], { rowFixed: true });
    totalCross += crossCount;
    levels[idx + 1] = col;
  });
  return { levels, totalCross };
}

function upDownPhase(levels: Vertex[][]): MulLevelbaryCentricResult {
  let totalCross = 0;
  for (let i = levels.length - 1; i > 0; i--) {
    if (i === 0) continue;
    const { row, crossCount } = calcTwoLevelbaryCentric(levels[i - 1], levels[i], { colFixed: true });
    totalCross += crossCount;
    levels[i - 1] = row;
  }
  return { levels, totalCross };
}

export function calcMulLevelbaryCentric(
  levels: Vertex[][],
  { totalRound = DEFAULT_TOTAL_ROUND, totalCross = Number.POSITIVE_INFINITY }: MulLevelbaryCentricOptions,
): MulLevelbaryCentricResult {
  let currentRound = 0;
  let orderedLevels = [...levels];
  if (currentRound >= totalRound || totalCross === 0) {
    return {
      levels: orderedLevels,
      totalCross,
    };
  }
  // from low levels to high
  const { levels: downUpLevels, totalCross: downUpCross } = downUpPhase(orderedLevels);
  let roundLevels = [...orderedLevels];
  if (downUpCross < totalCross) {
    totalCross = downUpCross;
    roundLevels = downUpLevels;
  }
  while (currentRound < totalRound) {
    const { levels: upDownLevels } = upDownPhase(roundLevels);
    const result = downUpPhase(upDownLevels);
    currentRound += 2;
    roundLevels = result.levels;
    const roundCross = result.totalCross;
    if (roundCross < totalCross) {
      orderedLevels = roundLevels;
      totalCross = roundCross;
    }
    if (totalCross === 0) break;
  }
  return { levels: orderedLevels, totalCross };
}

/**
 *
 * @param levels arrays of vertices which have been layered
 * @param options configuration to adjust total round, etc
 * @returns reordered vertices of each level and minimum crossings reached
 */
export function baryCentric(levels: Vertex[][], options: BaryCentricOptions = {}) {
  if (levels.length <= 1) return { levels, crossCount: 0 };
  if (levels.length === 2) {
    const { row, col, crossCount } = calcTwoLevelbaryCentric(levels[0], levels[1], options);
    return { levels: [row, col], crossCount };
  }
  const { levels: orderedLevels, totalCross } = calcMulLevelbaryCentric(levels, options);
  return { levels: orderedLevels, crossCount: totalCross };
}
