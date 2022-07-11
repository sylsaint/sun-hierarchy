import { Vertex } from '../misc/graph';
import { LayoutOptions } from '../misc/interface';

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
  const neighbors = vertex.edges.filter((edge) => edge.up.id === vertex.id).map((edge) => edge.down);
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
    for(let i = 0; i < reorderedLevels.length; i++) {
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
  const { width, height, gutter, padding } = options;
  const { left, top } = padding;
  levels
    .flatMap((vertices) => vertices)
    .map((v) => {
      const posList: number[] = xss.map((map) => map[v.id]);
      const xs: number = posList.reduce((prev, cur) => prev + cur, 0) / posList.length;
      v.setOptions('x', left + xs * (width + gutter));
      v.setOptions('y', top + v.getOptions('level') * (height + gutter));
    });
  return levels;
}

function normalize(xcoords: VertexIdNumberMap, reversed = false): { xcoords: VertexIdNumberMap, width: number } {
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

export function brandeskopf(
  levels: Vertex[][],
  layoutOptions: LayoutOptions = {
    width: 100,
    height: 20,
    gutter: 5,
    padding: { top: 0, left: 0, right: 0, bottom: 0 },
  },
) {
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
  const minWidthXss = xss.map(xs => xs.xcoords);
  return balance(levels, minWidthXss, layoutOptions);
}
