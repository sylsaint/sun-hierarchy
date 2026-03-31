import { Vertex } from '@/interface/graph';
import { DUMMY } from '@/interface/constant';

// ─────────────────────────────────────────────────────────
// Visualization helpers
// ─────────────────────────────────────────────────────────

/** Truncate or pad a string to fit a given width, center-aligned */
function centerPad(s: string, w: number): string {
  if (s.length >= w) return s.slice(0, w);
  const left = Math.floor((w - s.length) / 2);
  const right = w - s.length - left;
  return ' '.repeat(left) + s + ' '.repeat(right);
}

/** Build a mapping from vertex id to its column index based on x coordinate */
function buildColumnMap(levels: Vertex[][]): {
  xToCol: { [key: number]: number };
  colToX: number[];
  numCols: number;
} {
  const uniqueXs: number[] = [];
  levels.forEach((row) =>
    row.forEach((v) => {
      const x = v.getOptions('x') ?? 0;
      if (uniqueXs.indexOf(x) === -1) uniqueXs.push(x);
    }),
  );
  const sorted = uniqueXs.sort((a, b) => a - b);
  const xToCol: { [key: number]: number } = {};
  sorted.forEach((x, i) => {
    xToCol[x] = i;
  });
  return { xToCol, colToX: sorted, numCols: sorted.length };
}

/**
 * Render a beautiful ASCII graph that shows nodes **and edges**.
 *
 * Example output:
 * ```
 *  ┌─────────── Diamond: A→B,C→D ───────────┐
 *  │                                         │
 *  │               [ 0 ]                     │
 *  │              ╱     ╲                     │
 *  │         [ 1 ]       [ 2 ]               │
 *  │              ╲     ╱                     │
 *  │               [ 3 ]                     │
 *  │                                         │
 *  │  4 nodes · 0 dummy · 4 edges · 3 levels │
 *  └─────────────────────────────────────────┘
 * ```
 */
export function printLayoutResult(levels: Vertex[][], title = 'Hierarchical Layout') {
  const all = levels.flatMap((v) => v);
  if (all.length === 0) {
    console.log('(empty layout)');
    return;
  }

  // For large graphs or long IDs, fall back to table-only mode
  let maxLabel = 0;
  all.forEach((v) => {
    const isDummy = v.getOptions('type') === DUMMY;
    const label = isDummy ? '·' : String(v.id);
    if (label.length > maxLabel) maxLabel = label.length;
  });

  const { xToCol, numCols } = buildColumnMap(levels);
  const cellW = Math.max(maxLabel + 6, 8);

  if (numCols * cellW > 120 || all.length > 30) {
    // Large graph: print title + stats + table
    const realNodes = all.filter((v) => v.getOptions('type') !== DUMMY).length;
    const dummyNodes = all.length - realNodes;
    const edgeKeys: string[] = [];
    all.forEach((v) =>
      v.edges.forEach((e) => {
        const key = `${e.up.id}->${e.down.id}`;
        if (edgeKeys.indexOf(key) === -1) edgeKeys.push(key);
      }),
    );
    console.log(
      `\n  📊 ${title}: ${realNodes} nodes, ${dummyNodes} dummy, ${edgeKeys.length} edges, ${levels.length} levels\n`,
    );
    printPositionTable(levels);
    return;
  }

  // ── render helpers ──
  const emptyRow = () => new Array(numCols).fill(' '.repeat(cellW));

  /** Place a node label into a cell array */
  const renderNodeRow = (row: Vertex[]): string => {
    const cells = emptyRow();
    row.forEach((v) => {
      const col = xToCol[v.getOptions('x') ?? 0];
      const isDummy = v.getOptions('type') === DUMMY;
      const label = isDummy ? ' · ' : `[ ${v.id} ]`;
      cells[col] = centerPad(label, cellW);
    });
    return cells.join('');
  };

  /**
   * Render the connector rows between two adjacent levels.
   * For every edge from a node in `upper` to a node in `lower`,
   * draw a path using ╱ ╲ │ characters.
   */
  const renderConnectors = (upper: Vertex[], lower: Vertex[]): string[] => {
    // Collect edges that go from upper → lower
    const edges: { fromCol: number; toCol: number }[] = [];
    upper.forEach((v) => {
      const fromCol = xToCol[v.getOptions('x') ?? 0];
      v.edges.forEach((e) => {
        if (e.up === v || e.up.id === v.id) {
          const target = e.down;
          // Check if target is in the lower level
          if (lower.some((lv) => lv === target || lv.id === target.id)) {
            const toCol = xToCol[target.getOptions('x') ?? 0];
            edges.push({ fromCol, toCol });
          }
        }
      });
    });

    if (edges.length === 0) {
      return [' '.repeat(numCols * cellW)];
    }

    // We draw 2 connector rows for visual clarity
    const mid = Math.floor(cellW / 2);
    const row1 = new Array(numCols * cellW).fill(' ');
    const row2 = new Array(numCols * cellW).fill(' ');

    edges.forEach(({ fromCol, toCol }) => {
      const fromPos = fromCol * cellW + mid;
      const toPos = toCol * cellW + mid;

      if (fromCol === toCol) {
        // Straight down: │
        row1[fromPos] = '│';
        row2[fromPos] = '│';
      } else if (fromCol < toCol) {
        // Going right: ╲
        const step = (toPos - fromPos) / 2;
        const midPos1 = Math.round(fromPos + step * 0.5);
        const midPos2 = Math.round(fromPos + step * 1.5);
        // Row 1: start going right
        row1[Math.min(midPos1, numCols * cellW - 1)] = '╲';
        // Row 2: continue going right
        row2[Math.min(midPos2, numCols * cellW - 1)] = '╲';
      } else {
        // Going left: ╱
        const step = (fromPos - toPos) / 2;
        const midPos1 = Math.round(fromPos - step * 0.5);
        const midPos2 = Math.round(fromPos - step * 1.5);
        // Row 1: start going left
        row1[Math.max(midPos1, 0)] = '╱';
        // Row 2: continue going left
        row2[Math.max(midPos2, 0)] = '╱';
      }
    });

    return [row1.join(''), row2.join('')];
  };

  // ── Build all content lines ──
  const contentLines: string[] = [];
  levels.forEach((row, lvlIdx) => {
    contentLines.push(renderNodeRow(row));
    if (lvlIdx < levels.length - 1) {
      const connLines = renderConnectors(row, levels[lvlIdx + 1]);
      contentLines.push(...connLines);
    }
  });

  // Compute box width
  const maxContentW = Math.max(...contentLines.map((l) => l.replace(/\s+$/, '').length), title.length + 4, 30);

  // Pre-compute stats to include in width calculation
  const realNodes = all.filter((v) => v.getOptions('type') !== DUMMY).length;
  const dummyNodes = all.length - realNodes;
  const edgeKeys: string[] = [];
  all.forEach((v) =>
    v.edges.forEach((e) => {
      const key = `${e.up.id}->${e.down.id}`;
      if (edgeKeys.indexOf(key) === -1) edgeKeys.push(key);
    }),
  );
  const stats = `${realNodes} nodes · ${dummyNodes} dummy · ${edgeKeys.length} edges · ${levels.length} levels`;

  const boxW = Math.max(maxContentW + 4, stats.length + 4, title.length + 6);

  // ── Assemble final output ──
  const lines: string[] = [];

  // Top border with title
  const titleDecoLen = boxW - title.length - 4; // space for ─ on each side
  const titleLeft = Math.max(Math.floor(titleDecoLen / 2), 1);
  const titleRight = Math.max(titleDecoLen - titleLeft, 1);
  lines.push(`┌${'─'.repeat(titleLeft)} ${title} ${'─'.repeat(titleRight)}┐`);

  // Empty line
  lines.push(`│${' '.repeat(boxW)}│`);

  // Content
  contentLines.forEach((cl) => {
    const trimmed = cl.replace(/\s+$/, '');
    const pad = boxW - trimmed.length - 2;
    lines.push(`│  ${trimmed}${' '.repeat(Math.max(pad, 0))}│`);
  });

  lines.push(`│${' '.repeat(boxW)}│`);
  const statsPad = boxW - stats.length;
  const statsLeft = Math.max(Math.floor(statsPad / 2), 1);
  const statsRight = Math.max(statsPad - statsLeft, 0);
  lines.push(`│${' '.repeat(statsLeft)}${stats}${' '.repeat(statsRight)}│`);

  // Bottom border
  lines.push(`└${'─'.repeat(boxW)}┘`);

  console.log('\n' + lines.join('\n') + '\n');
}

/**
 * Print a compact position table.
 *
 * ```
 * ┌──────┬───────┬────────┬────────┐
 * │  ID  │ Level │   X    │   Y    │
 * ├──────┼───────┼────────┼────────┤
 * │  0   │   0   │  120   │    0   │
 * │  1   │   1   │   60   │   60   │
 * └──────┴───────┴────────┴────────┘
 * ```
 */
export function printPositionTable(levels: Vertex[][]) {
  const all = levels.flatMap((v) => v);
  if (all.length === 0) {
    console.log('(empty layout)');
    return;
  }

  // Compute column widths dynamically
  const rows: string[][] = [];
  all.forEach((v) => {
    const isDummy = v.getOptions('type') === DUMMY;
    const id = isDummy ? `(d)${v.id}` : String(v.id);
    const level = String(v.getOptions('level') ?? '?');
    const x = String(Math.round(v.getOptions('x') ?? 0));
    const y = String(Math.round(v.getOptions('y') ?? 0));
    rows.push([id, level, x, y]);
  });

  const headers = ['ID', 'Level', 'X', 'Y'];
  const colWidths = headers.map((h, ci) => {
    const dataMax = Math.max(...rows.map((r) => r[ci].length));
    return Math.max(h.length, dataMax) + 2; // 1 padding each side
  });

  const hLine = (left: string, mid: string, right: string) =>
    left + colWidths.map((w) => '─'.repeat(w)).join(mid) + right;

  const dataLine = (cells: string[]) => '│' + cells.map((c, i) => centerPad(c, colWidths[i])).join('│') + '│';

  const lines: string[] = [];
  lines.push(hLine('┌', '┬', '┐'));
  lines.push(dataLine(headers));
  lines.push(hLine('├', '┼', '┤'));
  rows.forEach((r) => lines.push(dataLine(r)));
  lines.push(hLine('└', '┴', '┘'));

  console.log(lines.join('\n'));
}

/**
 * Legacy simple positional print (kept for backward compatibility).
 * Delegates to the new printLayoutResult renderer.
 */
export function printVertices(levels: Vertex[][]) {
  printLayoutResult(levels, 'Layout');
}
