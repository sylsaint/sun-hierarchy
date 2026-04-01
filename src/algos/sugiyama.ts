/*
 * @author: sylsaint
 * @Description: sugiyama hierarchy algorightm
 * @params: {Graph} graph, {integer} width, {integer} height, {String} align
 * @return: {Graph} graph
 */

/*
 * Given a directed graph (digraph) G.V; E/ with a set of vertices Vand a set of edges E,the Sugiyama algorithm solves the problem of ﬁnding a 2D
 * hierarchical drawing of G subject to thefollowing readability requirements:
 * (a) Vertices are drawn on horizontal lines without overlapping; each line represents a level in thehierarchy; all edges point downwards.
 * (b) Short-span edges (i.e., edges between adjacent levels) are drawn with straight lines.
 * (c) Long-span edges (i.e., edges between nonadjacent levels) are drawn as close to straight linesas possible.
 * (d) The number of edge crossings is the minimum.(e) Vertices connected to each other are placed as close to each other as possible.
 * (f) The layout of edges coming into (or going out of) a vertex is balanced, i.e., edges are evenlyspaced around a common target (or source) vertex.
 */

import Graph, { Vertex, Edge } from '@/interface/graph';
import { divide } from '@/algos/weakconnect';
import { makeHierarchy } from '@/algos/hierarchy';
import { LayoutOptions } from '@/interface/definition';
import { defaultOptions } from '@/interface/constant';
import { baryCentric } from '@/algos/barycentric';
import { brandeskopf } from '@/algos/brandeskopf';

export function layout(g: Graph, options = defaultOptions): Graph[] {
  const finalGraphs: Graph[] = [];
  const graphs: Graph[] = divide(g);
  const { width, gutter = 0 } = options;
  const componentGap = gutter || 20;

  // Layout each connected component independently
  graphs.map((subGraph) => {
    const levels: Vertex[][] = makeHierarchy(subGraph);
    const { levels: orderedLevels } = baryCentric(levels, {});
    brandeskopf(orderedLevels, options);
    finalGraphs.push(subGraph);
  });

  // When merging, shift each component so they sit side by side or compact
  const merge = options.mergeComponents !== false;
  if (merge && finalGraphs.length > 1) {
    if (options.compactComponents === true) {
      compactPlace(finalGraphs, options);
    } else {
      sideBySidePlace(finalGraphs, options);
    }
    return [mergeGraphs(finalGraphs, g)];
  }

  return finalGraphs;
}

/** Place components side by side — each occupies its own horizontal column. */
function sideBySidePlace(graphs: Graph[], options: LayoutOptions): void {
  const { width, gutter = 0 } = options;
  const componentGap = gutter || 20;
  let currentOffset = 0;

  graphs.forEach((sg) => {
    const allVerts = sg.vertices;
    const xs = allVerts.map((v) => (v.getOptions('x') ?? 0) as number);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);

    const shift = currentOffset - minX;
    if (shift !== 0) {
      allVerts.forEach((v) => {
        v.setOptions('x', ((v.getOptions('x') ?? 0) as number) + shift);
      });
    }

    currentOffset = currentOffset + (maxX - minX) + width + componentGap;
  });
}

/**
 * Compact placement using the Skyline Algorithm (similar to Tetris / CSS float).
 *
 * Core idea: maintain a per-layer "skyline" that records the rightmost occupied x.
 * When placing a component, only query the layers it actually occupies — so small
 * components can nestle into gaps where the skyline is shorter.
 *
 * Steps:
 *  1. Sort components by area descending (largest first to set the terrain).
 *  2. For each component, find max skyline among its occupied layers.
 *  3. Shift the component to x = maxSkyline + gap.
 *  4. Update the skyline with the newly placed nodes.
 *
 * Example — after placing Comp A, the skyline is:
 *
 *   Layer 0: ████████░░░░░░░░░░░░  skyline[0] = 400
 *   Layer 1: ████████████████████  skyline[1] = 800
 *   Layer 2: ████████████████████  skyline[2] = 800
 *   Layer 3: ████████░░░░░░░░░░░░  skyline[3] = 400
 *
 * Placing Comp B (isolated node, only on layer 0):
 *   - maxSkyline among { layer 0 } = 400
 *   - Place at x = 400 + gap → nestles into the gap:
 *
 *   Layer 0: ████████░░[B]░░░░░░░  skyline[0] = 420 + width
 *   Layer 1: ████████████████████  (unchanged)
 *   Layer 2: ████████████████████  (unchanged)
 *   Layer 3: ████████░░░░░░░░░░░░  (unchanged)
 */
function compactPlace(graphs: Graph[], options: LayoutOptions): void {
  const { width, gutter = 0 } = options;
  const nodeGap = gutter || 20;

  // Sort by area descending — largest first to establish the skyline terrain
  const indexed = graphs.map((sg, i) => {
    const xs = sg.vertices.map((v) => (v.getOptions('x') ?? 0) as number);
    const ys = sg.vertices.map((v) => (v.getOptions('y') ?? 0) as number);
    const w = Math.max(...xs) - Math.min(...xs);
    const h = Math.max(...ys) - Math.min(...ys);
    return { graph: sg, index: i, area: (w + width) * (h + width) };
  });
  indexed.sort((a, b) => b.area - a.area);

  // Skyline: layer-y -> rightmost occupied x
  const skyline: { [key: number]: number } = {};

  indexed.forEach((item, order) => {
    const sg = item.graph;
    const allVerts = sg.vertices;
    const xs = allVerts.map((v) => (v.getOptions('x') ?? 0) as number);
    const ys = allVerts.map((v) => (v.getOptions('y') ?? 0) as number);
    const minX = Math.min(...xs);

    if (order === 0) {
      // First component: anchor at x = 0
      const shift = -minX;
      if (shift !== 0) {
        allVerts.forEach((v) => {
          v.setOptions('x', ((v.getOptions('x') ?? 0) as number) + shift);
        });
      }
    } else {
      // Find layers this component occupies
      const compLevelYs: { [key: number]: boolean } = {};
      allVerts.forEach((v) => {
        const y = (v.getOptions('y') ?? 0) as number;
        compLevelYs[y] = true;
      });

      // Max skyline among occupied layers
      let maxSkyline = 0;
      const levelKeys = Object.keys(compLevelYs);
      for (let i = 0; i < levelKeys.length; i++) {
        const y = Number(levelKeys[i]);
        if (skyline[y] !== undefined && skyline[y] > maxSkyline) {
          maxSkyline = skyline[y];
        }
      }

      // Place just right of the max skyline + gap
      const targetX = maxSkyline + nodeGap;
      const shift = targetX - minX;
      if (shift !== 0) {
        allVerts.forEach((v) => {
          v.setOptions('x', ((v.getOptions('x') ?? 0) as number) + shift);
        });
      }
    }

    // Update skyline with placed nodes
    allVerts.forEach((v) => {
      const x = (v.getOptions('x') ?? 0) as number;
      const y = (v.getOptions('y') ?? 0) as number;
      const rightEdge = x + width;
      if (skyline[y] === undefined || rightEdge > skyline[y]) {
        skyline[y] = rightEdge;
      }
    });
  });
}

/**
 * Merge multiple sub-graphs into a single Graph.
 * All vertices and edges are collected from the original graph,
 * preserving the coordinates already assigned by the layout passes.
 */
function mergeGraphs(subGraphs: Graph[], original: Graph): Graph {
  const allVertices: Vertex[] = [];
  const allEdges: Edge[] = [];
  const vertexIds = new Set<string | number>();

  subGraphs.forEach((sg) => {
    sg.vertices.forEach((v) => {
      if (!vertexIds.has(v.id)) {
        vertexIds.add(v.id);
        allVertices.push(v);
      }
    });
    sg.edges.forEach((e) => {
      allEdges.push(e);
    });
  });

  return new Graph(allVertices, allEdges, { directed: true });
}
