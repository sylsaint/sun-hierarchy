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
 *  1. Aggressive compaction to remove unnecessary gaps
 *  2. Center parents over their children (bottom-up) with push support
 *  3. Center children under their parents (top-down) with push support
 *  4. Reposition dummy nodes via linear interpolation
 *  5. Normalize: shift so min x = 0
 *
 * Each pass respects the ordering constraint: nodes on the same level
 * must maintain their relative order and minimum separation.
 */
function improveLayout(levels: Vertex[][], spacing: number): void {
  // Phase 1: Gravity-aware packing.
  // Place each node as close to its connected-node center as possible
  // while respecting minimum separation and ordering constraints.
  // This is better than tightPack because it considers connectivity.
  gravityPack(levels, spacing);

  // Phase 2: Iterative centering — move nodes toward their connected-node
  // centers without pushing neighbors.
  const MAX_CENTER = 10;
  for (let iter = 0; iter < MAX_CENTER; iter++) {
    // Bottom-up: center parents over children
    for (let li = levels.length - 2; li >= 0; li--) {
      centerOverChildren(levels[li], levels, spacing);
    }
    // Top-down: center nodes under parents
    for (let li = 1; li < levels.length; li++) {
      centerUnderParents(levels[li], levels, spacing);
    }
  }

  // Phase 3: Tight-pack to close all gaps, then re-center.
  // This ensures maximum compactness.
  tightPack(levels, spacing);

  // Phase 4: Re-center after tight packing
  for (let iter = 0; iter < MAX_CENTER; iter++) {
    for (let li = levels.length - 2; li >= 0; li--) {
      centerOverChildren(levels[li], levels, spacing);
    }
    for (let li = 1; li < levels.length; li++) {
      centerUnderParents(levels[li], levels, spacing);
    }
  }

  // Phase 5: Final gravity compaction to close remaining gaps
  packWithGravity(levels, spacing);

  // Phase 6: Global compaction — close gaps that span multiple levels
  globalCompact(levels, spacing);

  // Phase 7: Final centering after compaction
  for (let iter = 0; iter < MAX_CENTER; iter++) {
    for (let li = levels.length - 2; li >= 0; li--) {
      centerOverChildren(levels[li], levels, spacing);
    }
    for (let li = 1; li < levels.length; li++) {
      centerUnderParents(levels[li], levels, spacing);
    }
  }

  // Phase 8: Push isolated nodes out of the way of connected nodes
  centerWithPush(levels, spacing);

  // Phase 9: Reposition dummy nodes via linear interpolation
  repositionDummyNodes(levels, spacing);

  // Phase 10: Final normalization — shift everything so min x = 0
  normalizePositions(levels);
}

/**
 * Gravity-aware packing: place each node as close to its connected-node
 * center as possible while respecting minimum separation constraints.
 *
 * For each level, we do two passes:
 *  1. Left-to-right: place each node at max(prev + minSep, connectedCenter)
 *  2. Right-to-left: adjust positions to also respect right-side constraints
 *
 * This produces a compact layout where nodes with connections are pulled
 * toward their connected nodes, and isolated nodes are packed tightly.
 */
function gravityPack(levels: Vertex[][], spacing: number): void {
  // Multiple iterations to propagate positions across levels
  for (let iter = 0; iter < 4; iter++) {
    for (const level of levels) {
      if (level.length === 0) continue;

      // Pass 1: Left-to-right placement
      const positions: number[] = new Array(level.length);

      // First node: place at its connected center, or 0
      const firstCenter = connectedCenter(level[0]);
      positions[0] = firstCenter !== null ? firstCenter : 0;

      // Subsequent nodes: max(prev + minSep, connectedCenter)
      for (let i = 1; i < level.length; i++) {
        const sep = minSep(level[i - 1], level[i], spacing);
        const minPos = positions[i - 1] + sep;
        const center = connectedCenter(level[i]);
        if (center !== null && center > minPos) {
          positions[i] = center;
        } else {
          positions[i] = minPos;
        }
      }

      // Pass 2: Right-to-left adjustment
      // If a node is far to the right of its connected center,
      // try to pull it (and everything to its left) leftward.
      for (let i = level.length - 2; i >= 0; i--) {
        const sep = minSep(level[i], level[i + 1], spacing);
        const maxPos = positions[i + 1] - sep;
        const center = connectedCenter(level[i]);

        if (center !== null) {
          // Try to move toward center, but don't exceed maxPos
          const desired = Math.min(center, maxPos);
          if (desired < positions[i]) {
            positions[i] = desired;
          }
        } else {
          // No connections: pack tightly against right neighbor
          if (maxPos < positions[i]) {
            positions[i] = maxPos;
          }
        }
      }

      // Apply positions
      for (let i = 0; i < level.length; i++) {
        level[i].setOptions('x', positions[i]);
      }
    }
  }
}

/**
 * Compute the center of a node's connected nodes (parents + children).
 * Returns null if the node has no connections.
 */
function connectedCenter(v: Vertex): number | null {
  const neighbors = [...getChildren(v), ...getParents(v)];
  if (neighbors.length === 0) return null;
  const xs = neighbors.map((n) => n.getOptions('x') as number);
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

/**
 * Shift all nodes so that the minimum x coordinate is 0.
 */
function normalizePositions(levels: Vertex[][]): void {
  const allVerts = levels.flatMap((v) => v);
  const globalMinX = Math.min(...allVerts.map((v) => v.getOptions('x') as number));
  if (globalMinX !== 0) {
    const delta = -globalMinX;
    allVerts.forEach((v) => v.setOptions('x', (v.getOptions('x') as number) + delta));
  }
}

/**
 * Pack all levels tightly with minimum separation.
 * This is a pure left-packing that removes all unnecessary gaps.
 * Each node is placed at exactly the minimum separation from its
 * left neighbor, starting from position 0.
 */
function tightPack(levels: Vertex[][], spacing: number): void {
  for (const level of levels) {
    if (level.length === 0) continue;
    // Place the first node at 0
    level[0].setOptions('x', 0);
    // Place each subsequent node at minimum separation from predecessor
    for (let i = 1; i < level.length; i++) {
      const prev = level[i - 1];
      const cur = level[i];
      const prevX = prev.getOptions('x') as number;
      const sep = minSep(prev, cur, spacing);
      cur.setOptions('x', prevX + sep);
    }
  }
}

/**
 * Pack levels using gravity toward connected nodes.
 * For each level, scan left-to-right and close gaps between adjacent
 * nodes, but only shift a node left if it moves it closer to (or
 * doesn't move it further from) the center of its connected nodes.
 * Then scan right-to-left for the same purpose.
 */
function packWithGravity(levels: Vertex[][], spacing: number): void {
  for (const level of levels) {
    if (level.length <= 1) continue;

    // Left-to-right: try to close gaps by shifting nodes left
    for (let i = 1; i < level.length; i++) {
      const prev = level[i - 1];
      const cur = level[i];
      const prevX = prev.getOptions('x') as number;
      const curX = cur.getOptions('x') as number;
      const sep = minSep(prev, cur, spacing);
      const gap = curX - prevX - sep;
      if (gap <= 0) continue;

      // Compute how much we can shift left
      const neighbors = [...getChildren(cur), ...getParents(cur)];
      let maxShift = gap;
      if (neighbors.length > 0) {
        const xs = neighbors.map((n) => n.getOptions('x') as number);
        const center = xs.reduce((a, b) => a + b, 0) / xs.length;
        // If node is already to the left of its center, don't shift further left
        if (curX <= center) {
          maxShift = 0;
        } else {
          // Shift at most to the center
          maxShift = Math.min(gap, curX - center);
        }
      }
      if (maxShift <= 0) continue;

      // Shift cur and all nodes to its right
      for (let j = i; j < level.length; j++) {
        level[j].setOptions('x', (level[j].getOptions('x') as number) - maxShift);
      }
    }

    // Right-to-left: try to close gaps by shifting nodes right
    for (let i = level.length - 2; i >= 0; i--) {
      const cur = level[i];
      const next = level[i + 1];
      const curX = cur.getOptions('x') as number;
      const nextX = next.getOptions('x') as number;
      const sep = minSep(cur, next, spacing);
      const gap = nextX - curX - sep;
      if (gap <= 0) continue;

      const neighbors = [...getChildren(cur), ...getParents(cur)];
      let maxShift = gap;
      if (neighbors.length > 0) {
        const xs = neighbors.map((n) => n.getOptions('x') as number);
        const center = xs.reduce((a, b) => a + b, 0) / xs.length;
        // If node is already to the right of its center, don't shift further right
        if (curX >= center) {
          maxShift = 0;
        } else {
          maxShift = Math.min(gap, center - curX);
        }
      }
      if (maxShift <= 0) continue;

      // Shift cur and all nodes to its left
      for (let j = i; j >= 0; j--) {
        level[j].setOptions('x', (level[j].getOptions('x') as number) + maxShift);
      }
    }
  }
}

/**
 * Center each node on a level over its children (downstream neighbors).
 * Uses soft movement: moves within available gap, no pushing.
 */
function centerOverChildren(level: Vertex[], _levels: Vertex[][], spacing: number): void {
  for (const v of level) {
    const children = getChildren(v);
    if (children.length === 0) continue;
    const xs = children.map((c) => c.getOptions('x') as number);
    const desiredX = (Math.min(...xs) + Math.max(...xs)) / 2;
    tryMove(v, desiredX, level, spacing);
  }
}

/**
 * Center nodes on a level toward their parents (upstream neighbors).
 * Only processes leaf nodes (no children) — non-leaf nodes are positioned
 * by the bottom-up centerOverChildren pass.
 *
 * Key insight: for leaf nodes at the bottom of a "single-child chain"
 * (e.g., A,B,C → D → E where each node has only one child), we trace
 * UP through the chain to find the effective ancestor that has multiple
 * parents or siblings. This allows the entire chain to be pulled toward
 * the correct center through iterative centering, without any special
 * case logic.
 */
function centerUnderParents(level: Vertex[], _levels: Vertex[][], spacing: number): void {
  for (const v of level) {
    const children = getChildren(v);
    if (children.length > 0) continue;
    const parents = getParents(v);
    if (parents.length === 0) continue;

    // Trace up through single-child ancestors to find the effective
    // parent center. If our parent has only us as a child, and our
    // parent has parents, use the grandparent center instead.
    // This breaks the "mutual lock" in hanging chains like D→E.
    let targetNode: Vertex = v;
    let targetParents = parents;
    while (targetParents.length === 1) {
      const singleParent = targetParents[0];
      const siblings = getChildren(singleParent);
      if (siblings.length !== 1) break; // parent has other children too
      const grandParents = getParents(singleParent);
      if (grandParents.length === 0) break; // reached root
      targetNode = singleParent;
      targetParents = grandParents;
    }

    const xs = targetParents.map((p) => p.getOptions('x') as number);
    const desiredX = (Math.min(...xs) + Math.max(...xs)) / 2;
    tryMove(v, desiredX, level, spacing);
  }
}

// packLevels has been replaced by tightPack and packWithGravity above.

/**
 * Global compaction: close large gaps that span multiple levels.
 *
 * Strategy: Find "vertical cut lines" where every level has a gap.
 * For each such cut, compute the minimum gap across all levels and
 * shift all nodes to the right of the cut leftward by that amount.
 *
 * A "cut" at position X means: for every level, there exists a pair
 * of adjacent nodes (a, b) where a.x < X < b.x.
 */
function globalCompact(levels: Vertex[][], spacing: number): void {
  const MAX_ROUNDS = 30;

  for (let round = 0; round < MAX_ROUNDS; round++) {
    // Collect all "gap intervals" from all levels.
    // A gap interval is [leftX + minSep, rightX] for each pair of adjacent nodes.
    type GapInfo = { level: number; idx: number; leftEdge: number; rightEdge: number; excess: number };
    const allGaps: GapInfo[] = [];

    for (let li = 0; li < levels.length; li++) {
      const level = levels[li];
      for (let i = 1; i < level.length; i++) {
        const prev = level[i - 1];
        const cur = level[i];
        const prevX = prev.getOptions('x') as number;
        const curX = cur.getOptions('x') as number;
        const sep = minSep(prev, cur, spacing);
        const excess = curX - prevX - sep;
        if (excess > 0.5) {
          allGaps.push({
            level: li,
            idx: i,
            leftEdge: prevX,
            rightEdge: curX,
            excess,
          });
        }
      }
    }

    if (allGaps.length === 0) break;

    // For each gap, try to find a "vertical cut" that passes through
    // gaps on ALL levels. The cut position is defined by the gap's interval.
    // We try each gap as a candidate cut and check all other levels.
    let bestShift = 0;
    let bestCutX = 0;

    for (const gap of allGaps) {
      // The cut interval is [gap.leftEdge, gap.rightEdge]
      const cutLeft = gap.leftEdge;
      const cutRight = gap.rightEdge;

      // For each level, find the minimum excess gap that overlaps with this cut interval
      let minExcess = gap.excess;
      let validCut = true;

      for (let li = 0; li < levels.length; li++) {
        const level = levels[li];
        // Find the gap on this level that contains the cut interval
        let foundGap = false;
        for (let i = 1; i < level.length; i++) {
          const prevX = level[i - 1].getOptions('x') as number;
          const curX = level[i].getOptions('x') as number;
          // Check if this gap overlaps with the cut interval
          if (prevX <= cutRight && curX >= cutLeft) {
            const sep = minSep(level[i - 1], level[i], spacing);
            const excess = curX - prevX - sep;
            minExcess = Math.min(minExcess, excess);
            foundGap = true;
            break;
          }
        }
        if (!foundGap) {
          // This level has no gap at this position — check if all nodes
          // are to the left or right of the cut
          const levelXs = level.map((v) => v.getOptions('x') as number);
          const maxX = Math.max(...levelXs);
          const minX = Math.min(...levelXs);
          if (maxX <= cutLeft || minX >= cutRight) {
            // All nodes on this level are on one side — cut is valid
            continue;
          }
          // There's a node at the cut position — cut is invalid
          validCut = false;
          break;
        }
      }

      if (!validCut || minExcess <= 0.5) continue;

      if (minExcess > bestShift) {
        bestShift = minExcess;
        bestCutX = (cutLeft + cutRight) / 2;
      }
    }

    if (bestShift <= 0.5) break;

    // Apply the shift: move all nodes to the right of bestCutX leftward
    for (const level of levels) {
      for (const v of level) {
        const vx = v.getOptions('x') as number;
        if (vx > bestCutX) {
          v.setOptions('x', vx - bestShift);
        }
      }
    }
  }
}

/**
 * Try to move vertex `v` to `desiredX` on its level, respecting ordering
 * constraints and minimum separations with neighbors.
 * Non-pushing: the node can only move within the gap between its neighbors.
 */
function tryMove(v: Vertex, desiredX: number, level: Vertex[], spacing: number): void {
  const idx = level.indexOf(v);
  if (idx < 0) return;

  const curX = v.getOptions('x') as number;
  if (Math.abs(desiredX - curX) < 0.5) return;

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
 * Try to move vertex `v` to `desiredX`, pushing isolated neighbors
 * (nodes with no connections to adjacent levels) out of the way.
 * Connected neighbors are never pushed.
 */
function tryMoveWithPush(v: Vertex, desiredX: number, level: Vertex[], spacing: number): void {
  const idx = level.indexOf(v);
  if (idx < 0) return;

  const curX = v.getOptions('x') as number;
  if (Math.abs(desiredX - curX) < 0.5) return;

  // Determine movement direction
  const movingRight = desiredX > curX;

  if (movingRight) {
    // Push isolated nodes to the right
    // First, find the chain of isolated nodes blocking us
    let targetX = desiredX;
    for (let i = idx + 1; i < level.length; i++) {
      const neighbor = level[i];
      const neighborX = neighbor.getOptions('x') as number;
      const sep = minSep(level[i - 1], neighbor, spacing);
      const requiredX = (i === idx + 1 ? targetX : (level[i - 1].getOptions('x') as number)) + sep;
      if (neighborX >= requiredX) break; // no conflict
      // Only push if neighbor is isolated (no connections)
      const neighborConnected = [...getChildren(neighbor), ...getParents(neighbor)];
      if (neighborConnected.length > 0) {
        // Can't push connected node; clamp our target
        targetX = neighborX - minSep(v, neighbor, spacing);
        // Also clamp for intermediate nodes
        for (let j = i - 1; j > idx; j--) {
          const sepJ = minSep(level[j], level[j + 1], spacing);
          const maxJ = (level[j + 1].getOptions('x') as number) - sepJ;
          if ((level[j].getOptions('x') as number) > maxJ) {
            level[j].setOptions('x', maxJ);
          }
        }
        break;
      }
      neighbor.setOptions('x', requiredX);
    }
    // Recompute our actual target after pushing
    let hi = Infinity;
    if (idx < level.length - 1) {
      hi = (level[idx + 1].getOptions('x') as number) - minSep(v, level[idx + 1], spacing);
    }
    let lo = -Infinity;
    if (idx > 0) {
      lo = (level[idx - 1].getOptions('x') as number) + minSep(level[idx - 1], v, spacing);
    }
    v.setOptions('x', Math.max(lo, Math.min(hi, targetX)));
  } else {
    // Push isolated nodes to the left
    let targetX = desiredX;
    for (let i = idx - 1; i >= 0; i--) {
      const neighbor = level[i];
      const neighborX = neighbor.getOptions('x') as number;
      const sep = minSep(neighbor, level[i + 1], spacing);
      const requiredX = (i === idx - 1 ? targetX : (level[i + 1].getOptions('x') as number)) - sep;
      if (neighborX <= requiredX) break; // no conflict
      const neighborConnected = [...getChildren(neighbor), ...getParents(neighbor)];
      if (neighborConnected.length > 0) {
        targetX = neighborX + minSep(neighbor, v, spacing);
        for (let j = i + 1; j < idx; j++) {
          const sepJ = minSep(level[j - 1], level[j], spacing);
          const minJ = (level[j - 1].getOptions('x') as number) + sepJ;
          if ((level[j].getOptions('x') as number) < minJ) {
            level[j].setOptions('x', minJ);
          }
        }
        break;
      }
      neighbor.setOptions('x', requiredX);
    }
    let lo = -Infinity;
    if (idx > 0) {
      lo = (level[idx - 1].getOptions('x') as number) + minSep(level[idx - 1], v, spacing);
    }
    let hi = Infinity;
    if (idx < level.length - 1) {
      hi = (level[idx + 1].getOptions('x') as number) - minSep(v, level[idx + 1], spacing);
    }
    v.setOptions('x', Math.max(lo, Math.min(hi, targetX)));
  }
}

/**
 * Center connected nodes over their children/parents, pushing isolated
 * neighbors out of the way. This ensures that nodes with no connections
 * don't block connected nodes from reaching their ideal positions.
 *
 * IMPORTANT: Only pushes when the blocking neighbor is truly isolated
 * (no connections to any adjacent level). This avoids breaking symmetry
 * in layouts where all nodes are connected.
 */
function centerWithPush(levels: Vertex[][], spacing: number): void {
  // Build a set of nodes that are isolated (no connections to adjacent levels)
  const isolatedSet = new Set<Vertex>();
  for (let li = 0; li < levels.length; li++) {
    for (const v of levels[li]) {
      const children = getChildren(v);
      const parents = getParents(v);
      if (children.length === 0 && parents.length === 0) {
        isolatedSet.add(v);
      }
    }
  }

  // If there are no isolated nodes at all, skip entirely to preserve symmetry
  if (isolatedSet.size === 0) return;

  // Only process levels that actually contain isolated nodes
  const levelsWithIsolated = new Set<number>();
  for (let li = 0; li < levels.length; li++) {
    for (const v of levels[li]) {
      if (isolatedSet.has(v)) {
        levelsWithIsolated.add(li);
        break;
      }
    }
  }

  // Bottom-up: center parents over children, pushing isolated neighbors
  for (let li = levels.length - 2; li >= 0; li--) {
    if (!levelsWithIsolated.has(li)) continue; // skip levels without isolated nodes
    const level = levels[li];
    for (const v of level) {
      if (isolatedSet.has(v)) continue; // don't move isolated nodes proactively
      const children = getChildren(v);
      if (children.length === 0) continue;
      const xs = children.map((c) => c.getOptions('x') as number);
      const desiredX = (Math.min(...xs) + Math.max(...xs)) / 2;
      tryMoveWithPush(v, desiredX, level, spacing);
    }
  }
  // Top-down: center nodes under parents, pushing isolated neighbors
  for (let li = 1; li < levels.length; li++) {
    if (!levelsWithIsolated.has(li)) continue; // skip levels without isolated nodes
    const level = levels[li];
    for (const v of level) {
      if (isolatedSet.has(v)) continue;
      const parents = getParents(v);
      if (parents.length === 0) continue;
      const xs = parents.map((p) => p.getOptions('x') as number);
      const desiredX = (Math.min(...xs) + Math.max(...xs)) / 2;
      tryMoveWithPush(v, desiredX, level, spacing);
    }
  }
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

    let source: Vertex | null = null;
    let cur: Vertex = v;
    let safety = 100;
    while (safety-- > 0) {
      const upEdges = cur.edges.filter((e) => e.down === cur || e.down.id === cur.id);
      if (upEdges.length === 0) break;
      const parent = upEdges[0].up;
      if (parent.getOptions('type') !== DUMMY) {
        source = parent;
        break;
      }
      cur = parent;
    }

    let target: Vertex | null = null;
    cur = v;
    safety = 100;
    while (safety-- > 0) {
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

    // Move dummy to interpolated position, non-pushing
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
