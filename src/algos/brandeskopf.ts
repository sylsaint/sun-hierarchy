import { Vertex } from '@/interface/graph';
import { LayoutOptions } from '@/interface/definition';
import { defaultOptions, DUMMY } from '@/interface/constant';

export type VertexIdMap = { [key: string | number]: string | number };
export type VertexIdNumberMap = { [key: string | number]: number };
export type IdVertexMap = { [key: string | number]: Vertex };

function getPos(vertex: Vertex, vertices: Vertex[], reversed = false): number {
  if (reversed) return vertices.length - vertex.getOptions('pos') - 1;
  return vertex.getOptions('pos');
}

function getPrev(vertex: Vertex, reversed = false): number {
  if (reversed) return vertex.getOptions('next');
  return vertex.getOptions('prev');
}

function getNext(vertex: Vertex, reversed = false): number {
  if (reversed) return vertex.getOptions('prev');
  return vertex.getOptions('next');
}

function getDownMedianNeighborPos(vertex: Vertex, min: number): number {
  const neighbors = vertex.edges
    .filter((edge) => edge.up.id === vertex.id)
    .map((edge) => edge.down)
    .sort((a, b) => a.getOptions('pos') - b.getOptions('pos'));
  const highs = neighbors.filter((v) => v.getOptions('pos') >= min);
  if (highs.length) return highs[0].getOptions('pos');
  if (neighbors.length) return neighbors[0].getOptions('pos');
  return -1;
}

function getConfictKey(from: Vertex, to: Vertex, reversed = false) {
  if (reversed) return `${to.id}_|_${from.id}`;
  return `${from.id}_|_${to.id}`;
}

function markVertexCoflict(
  left: Vertex,
  right: Vertex,
  k0: number,
  k1: number,
  conflictResult: ConflictResult,
): ConflictResult {
  const downVertices = left.edges.filter((edge) => edge.up.id === left.id).map((edge) => edge.down);
  const crossed = downVertices.filter((vertex) => {
    const pos = vertex.getOptions('pos');
    return pos < k0 || pos > k1;
  });
  crossed.map((v) => {
    conflictResult[getConfictKey(left, v)] = true;
  });
  return conflictResult;
}

function preprocess(levels: Vertex[][]): IdVertexMap {
  const vertexMap: IdVertexMap = {};
  levels.map((vertices, lvl) =>
    vertices.map((v, i) => {
      // add level to every vertex
      v.setOptions('level', lvl);
      // add pos to every vertex
      v.setOptions('pos', i);
      // add prev and next to every vertex
      v.setOptions('prev', vertices[i - 1]?.id);
      v.setOptions('next', vertices[i + 1]?.id);
      // add to map
      vertexMap[v.id] = v;
    }),
  );
  return vertexMap;
}

export type ConflictResult = {
  [key: string]: boolean;
};

export function markConflicts(levels: Vertex[][]): ConflictResult {
  const conflictResult: ConflictResult = {};
  // mark type 0, 1, 2 conflicts in linear time
  const verticalDepth = levels.length;
  for (let i = 0; i < verticalDepth - 1; i++) {
    const horizonWidth = levels[i].length;
    const vertices = levels[i];
    let k0 = 0,
      k1 = levels[i + 1].length - 1,
      l0 = 0;
    for (let l1 = 1; l1 < horizonWidth; l1++) {
      k1 = getDownMedianNeighborPos(vertices[l1], k0);
      if (k1 === -1) continue;
      if (k1 < k0) k1 = k0;
      for (; l0 <= l1; l0++) {
        markVertexCoflict(vertices[l0], vertices[l1], k0, k1, conflictResult);
      }
      k0 = k1;
    }
  }
  return conflictResult;
}

function getUpperMedianNeighbors(vertex: Vertex, verticalOrder = true, horizonOrder = true): Vertex[] {
  let upperNeighbours = vertex.edges.filter((edge) => edge.down.id === vertex.id).map((edge) => edge.up);
  if (!verticalOrder)
    upperNeighbours = vertex.edges.filter((edge) => edge.up.id === vertex.id).map((edge) => edge.down);
  // Sort neighbors by their position - critical for correct median computation
  upperNeighbours.sort((a, b) => a.getOptions('pos') - b.getOptions('pos'));
  const upperLength = upperNeighbours.length;
  if (upperLength === 0) return [];
  if (upperLength % 2 === 1) return [upperNeighbours[(upperLength - 1) / 2]];
  if (horizonOrder) {
    return [upperNeighbours[upperLength / 2 - 1], upperNeighbours[upperLength / 2]];
  } else {
    return [upperNeighbours[upperLength / 2], upperNeighbours[upperLength / 2 - 1]];
  }
}

export type AlignOptions = {
  conflicts: ConflictResult;
  root?: Map<string | number, string | number>;
  align?: Map<string | number, string | number>;
  horizonOrder?: boolean;
  verticalOrder?: boolean;
};

export type AlignResult = {
  root: Map<string | number, string | number>;
  align: Map<string | number, string | number>;
};

export function alignVertices(
  levels: Vertex[][],
  { root = new Map(), align = new Map(), horizonOrder = true, verticalOrder = true, conflicts }: AlignOptions,
): AlignResult {
  const reorderedLevels = [...levels];
  if (root.size === 0 && align.size === 0) {
    levels
      .flatMap((vertices) => vertices)
      .map((v) => {
        root.set(v.id, v.id);
        align.set(v.id, v.id);
      });
  }
  if (!verticalOrder) {
    reorderedLevels.reverse();
  }
  if (!horizonOrder) {
    for (let i = 0; i < reorderedLevels.length; i++) {
      reorderedLevels[i] = [...reorderedLevels[i]];
      reorderedLevels[i].reverse();
    }
  }
  for (let vi = 1; vi < reorderedLevels.length; vi++) {
    let r = -1;
    for (let hi = 0; hi < reorderedLevels[vi].length; hi++) {
      const vertex = reorderedLevels[vi][hi];
      const upperNeighbours = getUpperMedianNeighbors(vertex, verticalOrder, horizonOrder);
      upperNeighbours.map((um) => {
        const posUm = getPos(um, reorderedLevels[vi - 1], !horizonOrder);
        if (align.get(vertex.id) === vertex.id) {
          if (!conflicts[getConfictKey(um, vertex)] && r < posUm) {
            align.set(um.id, vertex.id);
            root.set(vertex.id, root.get(um.id) as string | number);
            align.set(vertex.id, root.get(vertex.id) as string | number);
            r = posUm;
          }
        }
      });
    }
  }
  return { root, align };
}

export type CompactionOptions = {
  levels: Vertex[][];
  root: Map<string | number, string | number>;
  align: Map<string | number, string | number>;
  horizonOrder: boolean;
  verticalOrder: boolean;
  vertexMap?: IdVertexMap;
};

export type CompactionResult = {
  sink: VertexIdMap;
  shift: VertexIdNumberMap;
  xcoords: VertexIdNumberMap;
};

export function compact({
  root,
  align,
  horizonOrder = true,
  verticalOrder = true,
  vertexMap = {},
  levels,
}: CompactionOptions) {
  const sink: VertexIdMap = {};
  const shift: VertexIdNumberMap = {};
  let xcoords: VertexIdNumberMap = {};
  let selfRoot: (string | number)[] = [];
  const vertices: (string | number)[] = [];
  root.forEach((_value, key) => {
    vertices.push(key);
  });
  vertices.map((vid) => {
    sink[vid] = vid;
    shift[vid] = Number.POSITIVE_INFINITY;
    if (vid === root.get(vid)) selfRoot.push(vid);
  });

  // sort root
  const ordered: (string | number)[] = [];
  const sortMap: { [key: string | number]: (string | number)[] } = {};
  selfRoot.map((vid) => {
    const prevVid = getPrev(vertexMap[vid], !horizonOrder);
    if (prevVid !== undefined) {
      const prevRootId = root.get(prevVid) as string | number;
      if (!sortMap[prevRootId]) {
        sortMap[prevRootId] = [vid];
      } else {
        sortMap[prevRootId].push(vid);
      }
    }
    const nextVid = getNext(vertexMap[vid], !horizonOrder);
    if (nextVid !== undefined) {
      const nextRootId = root.get(nextVid) as string | number;
      if (!sortMap[vid]) {
        sortMap[vid] = [nextRootId];
      } else {
        sortMap[vid].push(nextRootId);
      }
    }
  });

  while (selfRoot.length) {
    const tails: { [key: string | number]: boolean } = {};
    selfRoot.map((vid) => {
      sortMap[vid]?.map((tid) => {
        tails[tid] = true;
      });
    });
    const heads = selfRoot.filter((vid) => !tails[vid]);
    heads.map((vid) => {
      ordered.push(vid);
      delete sortMap[vid];
    });
    selfRoot = selfRoot.filter((vid) => !heads.includes(vid));
  }

  // root coordinates relative to sink
  ordered.map(
    (vid) =>
      (xcoords = placeBlock(vid, {
        root,
        align,
        sink,
        shift,
        xcoords,
        verticalOrder,
        horizonOrder,
        vertexMap,
        levels,
      })),
  );

  // absolute coordinates
  vertices.map((vid) => {
    const rootVid = root.get(vid) as string | number;
    xcoords[vid] = xcoords[rootVid];
    if (shift[sink[rootVid]] < Number.POSITIVE_INFINITY) {
      xcoords[vid] += shift[sink[rootVid]];
    }
  });
  return { sink, shift, xcoords };
}

export type BlockOptions = CompactionOptions & CompactionResult;

/**
 * @description mutant of original without recursion
 * @param v
 * @param options
 */
function placeBlock(vid: string | number, options: BlockOptions): VertexIdNumberMap {
  const { sink, shift, root, align, xcoords, vertexMap = {}, levels, horizonOrder } = options;
  const delta = 1;
  // vertex has been handled
  if (xcoords[vid] !== undefined) {
    return xcoords;
  }
  xcoords[vid] = 0;
  let w = vid;
  do {
    const vertex = vertexMap[w];
    if (getPos(vertex, levels[vertex.getOptions('level')], !horizonOrder) === 0) {
      w = align.get(w) as string | number;
      continue;
    }
    const u = root.get(getPrev(vertex, !horizonOrder)) as string | number;
    if (sink[vid] === vid) sink[vid] = sink[u];
    if (sink[vid] !== sink[u]) {
      shift[sink[u]] = Math.min(shift[sink[u]], xcoords[vid] - xcoords[u] - delta);
    } else {
      xcoords[vid] = Math.max(xcoords[vid], xcoords[u] + delta);
    }
    w = align.get(w) as string | number;
  } while (w !== vid);
  return xcoords;
}

function balance(levels: Vertex[][], xss: VertexIdNumberMap[], options: LayoutOptions): Vertex[][] {
  const { width, height, gutter = 0, margin = { left: 0, top: 0 } } = options;
  const { left = 0, top = 0 } = margin;
  const spacing = width + gutter;

  // Step 1: Compute median xs for each vertex from the 4 BK alignments
  const allVertices = levels.flatMap((v) => v);
  allVertices.forEach((v) => {
    const posList: number[] = xss.map((map) => map[v.id]).sort((a, b) => a - b);
    const len = posList.length;
    let xs: number;
    if (len % 2 === 0) {
      xs = (posList[len / 2 - 1] + posList[len / 2]) / 2;
    } else {
      xs = posList[(len - 1) / 2];
    }
    v.setOptions('x', left + xs * spacing);
    v.setOptions('y', top + v.getOptions('level') * (height + gutter));
  });

  // Step 2: Improve layout with centering and compaction passes
  improveLayout(levels, spacing);

  return levels;
}

// ─── Minimum separation between two adjacent nodes on the same level ───
// Real nodes need full spacing; dummy nodes only need a small gap.
function minSep(a: Vertex, b: Vertex, spacing: number): number {
  const aIsDummy = a.getOptions('type') === DUMMY;
  const bIsDummy = b.getOptions('type') === DUMMY;
  if (aIsDummy && bIsDummy) return spacing * 0.15;
  if (aIsDummy || bIsDummy) return spacing * 0.5;
  return spacing;
}

/**
 * Get the children (downstream neighbors) of a vertex.
 */
function getChildren(v: Vertex): Vertex[] {
  return v.edges.filter((e) => e.up === v || e.up.id === v.id).map((e) => e.down);
}

/**
 * Get the parents (upstream neighbors) of a vertex.
 */
function getParents(v: Vertex): Vertex[] {
  return v.edges.filter((e) => e.down === v || e.down.id === v.id).map((e) => e.up);
}

/**
 * Improve the BK layout with multiple passes:
 *  1. Center parents over their children (bottom-up) — primary
 *  2. Center leaf nodes under their parents (top-down) — secondary
 *  3. Compact: close unnecessary gaps
 *  4. Reposition dummy nodes via linear interpolation
 *  5. Normalize: shift so min x = 0
 *
 * Each pass respects the ordering constraint: nodes on the same level
 * must maintain their relative order and minimum separation.
 */
function improveLayout(levels: Vertex[][], spacing: number): void {
  const MAX_ITER = 8;

  for (let iter = 0; iter < MAX_ITER; iter++) {
    // Bottom-up: center each node over its children.
    // This is the primary centering pass — a parent should be centered
    // above its children for visual clarity.
    for (let li = levels.length - 2; li >= 0; li--) {
      centerOverChildren(levels[li], spacing);
    }

    // Top-down: center nodes that have NO children under their parents.
    // Nodes with children are already positioned by the bottom-up pass;
    // moving them again would break that centering.
    for (let li = 1; li < levels.length; li++) {
      centerLeavesUnderParents(levels[li], spacing);
    }
  }

  // Compact: try to close unnecessary gaps
  compactLayout(levels, spacing);

  // Final centering passes after compaction
  for (let iter = 0; iter < MAX_ITER; iter++) {
    for (let li = levels.length - 2; li >= 0; li--) {
      centerOverChildren(levels[li], spacing);
    }
    for (let li = 1; li < levels.length; li++) {
      centerLeavesUnderParents(levels[li], spacing);
    }
  }

  // Reposition dummy nodes: linear interpolation between real endpoints
  repositionDummyNodes(levels, spacing);

  // Final normalization: shift everything so min x = 0
  const allVerts = levels.flatMap((v) => v);
  const globalMinX = Math.min(...allVerts.map((v) => v.getOptions('x') as number));
  if (globalMinX !== 0) {
    const delta = -globalMinX;
    allVerts.forEach((v) => v.setOptions('x', (v.getOptions('x') as number) + delta));
  }
}

/**
 * Center each node on a level over its children (downstream neighbors).
 */
function centerOverChildren(level: Vertex[], spacing: number): void {
  for (const v of level) {
    const children = getChildren(v);
    if (children.length === 0) continue;
    const xs = children.map((c) => c.getOptions('x') as number);
    const desiredX = (Math.min(...xs) + Math.max(...xs)) / 2;
    tryMove(v, desiredX, level, spacing);
  }
}

/**
 * Center leaf nodes (nodes with no children) under their parents.
 * Nodes that have children are NOT moved — their position is determined
 * by the bottom-up centering pass.
 */
function centerLeavesUnderParents(level: Vertex[], spacing: number): void {
  for (const v of level) {
    // Skip nodes that have children — they're positioned by bottom-up pass
    const children = getChildren(v);
    if (children.length > 0) continue;

    const parents = getParents(v);
    if (parents.length === 0) continue;
    const xs = parents.map((p) => p.getOptions('x') as number);
    const desiredX = (Math.min(...xs) + Math.max(...xs)) / 2;
    tryMove(v, desiredX, level, spacing);
  }
}

/**
 * Compact the layout by closing unnecessary gaps. For each level, we try
 * to shift each node (and all nodes to its right) leftward to close the
 * gap with its left neighbor, but only if the shift doesn't break the
 * centering of any connected node.
 *
 * This is much gentler than "push everything to x=0" — it preserves the
 * relative structure established by centering passes.
 */
function compactLayout(levels: Vertex[][], spacing: number): void {
  // Find the widest level — this determines the minimum total width
  // We compact by trying to reduce gaps on each level independently.
  for (const level of levels) {
    for (let i = 1; i < level.length; i++) {
      const prev = level[i - 1];
      const cur = level[i];
      const prevX = prev.getOptions('x') as number;
      const curX = cur.getOptions('x') as number;
      const sep = minSep(prev, cur, spacing);
      const gap = curX - prevX - sep;

      if (gap <= 0) continue; // already at minimum separation

      // Try to shift cur (and everything to its right) left by `gap`.
      // But limit the shift so we don't break centering with connected nodes.
      let maxShift = gap;

      // Check: shifting cur left would move it away from its parents/children center.
      // We allow the shift only if it moves cur closer to (or doesn't move it
      // further from) the center of its connected nodes.
      const neighbors = [...getChildren(cur), ...getParents(cur)];
      if (neighbors.length > 0) {
        const xs = neighbors.map((n) => n.getOptions('x') as number);
        const center = (Math.min(...xs) + Math.max(...xs)) / 2;
        const curDist = Math.abs(curX - center);
        const newDist = Math.abs(curX - maxShift - center);
        // Only shift if it brings us closer to center or keeps same distance
        if (newDist > curDist + 1) {
          // Shifting would move us further from center; limit shift
          maxShift = Math.max(0, curX - center - (center - (prevX + sep)));
          if (maxShift < 0) maxShift = 0;
        }
      }

      if (maxShift <= 0) continue;

      // Shift cur and all nodes to its right on this level
      for (let j = i; j < level.length; j++) {
        const v = level[j];
        v.setOptions('x', (v.getOptions('x') as number) - maxShift);
      }
    }
  }
}

/**
 * Try to move vertex `v` to `desiredX` on its level, respecting ordering
 * constraints and minimum separations with neighbors.
 */
function tryMove(v: Vertex, desiredX: number, level: Vertex[], spacing: number): void {
  const idx = level.indexOf(v);
  if (idx < 0) return;

  const curX = v.getOptions('x') as number;
  if (Math.abs(desiredX - curX) < 0.5) return; // negligible move

  // Compute the allowed range [lo, hi] for v's x-coordinate
  let lo = -Infinity;
  let hi = Infinity;

  if (idx > 0) {
    const prev = level[idx - 1];
    lo = (prev.getOptions('x') as number) + minSep(prev, v, spacing);
  }
  if (idx < level.length - 1) {
    const next = level[idx + 1];
    hi = (next.getOptions('x') as number) - minSep(v, next, spacing);
  }

  const newX = Math.max(lo, Math.min(hi, desiredX));
  v.setOptions('x', newX);
}

/**
 * Reposition dummy nodes via linear interpolation between their real
 * source and target endpoints. This makes long-span edges as straight
 * as possible and prevents dummy nodes from wasting horizontal space.
 */
function repositionDummyNodes(levels: Vertex[][], spacing: number): void {
  const allVertices = levels.flatMap((v) => v);

  allVertices.forEach((v) => {
    if (v.getOptions('type') !== DUMMY) return;

    // Walk up to find the real source node
    let source: Vertex | null = null;
    let cur: Vertex = v;
    while (true) {
      const upEdges = cur.edges.filter((e) => e.down === cur || e.down.id === cur.id);
      if (upEdges.length === 0) break;
      const parent = upEdges[0].up;
      if (parent.getOptions('type') !== DUMMY) {
        source = parent;
        break;
      }
      cur = parent;
    }

    // Walk down to find the real target node
    let target: Vertex | null = null;
    cur = v;
    while (true) {
      const downEdges = cur.edges.filter((e) => e.up === cur || e.up.id === cur.id);
      if (downEdges.length === 0) break;
      const child = downEdges[0].down;
      if (child.getOptions('type') !== DUMMY) {
        target = child;
        break;
      }
      cur = child;
    }

    if (!source || !target) return;

    const srcLevel = source.getOptions('level') as number;
    const tgtLevel = target.getOptions('level') as number;
    const curLevel = v.getOptions('level') as number;
    const srcX = source.getOptions('x') as number;
    const tgtX = target.getOptions('x') as number;

    if (tgtLevel === srcLevel) return;

    // Linear interpolation
    const t = (curLevel - srcLevel) / (tgtLevel - srcLevel);
    const desiredX = srcX + t * (tgtX - srcX);

    // Move dummy to interpolated position, respecting neighbor constraints
    const level = levels[curLevel];
    tryMove(v, desiredX, level, spacing);
  });
}

function normalize(xcoords: VertexIdNumberMap, reversed = false): { xcoords: VertexIdNumberMap; width: number } {
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  Object.keys(xcoords).map((key) => {
    if (xcoords[key] < min) min = xcoords[key];
    if (xcoords[key] > max) max = xcoords[key];
  });
  const width = max - min;
  Object.keys(xcoords).map((key) => {
    if (min < 0) {
      xcoords[key] = xcoords[key] + Math.abs(min);
    }
    if (reversed) {
      xcoords[key] = width - xcoords[key];
    }
  });
  return { xcoords, width };
}

export function brandeskopf(levels: Vertex[][], layoutOptions: LayoutOptions = defaultOptions) {
  const vertexMap = preprocess(levels);
  const conflicts = markConflicts(levels);
  const xss: { xcoords: VertexIdNumberMap; width: number }[] = [];
  [true, false].map((verticalOrder) => {
    [true, false].map((horizonOrder) => {
      const { root, align } = alignVertices(levels, {
        conflicts,
        verticalOrder,
        horizonOrder,
      });
      const { xcoords } = compact({ root, align, horizonOrder, verticalOrder, vertexMap, levels });
      xss.push(normalize(xcoords, !horizonOrder));
    });
  });
  const minWidthXss = xss.map((xs) => xs.xcoords);
  return balance(levels, minWidthXss, layoutOptions);
}
