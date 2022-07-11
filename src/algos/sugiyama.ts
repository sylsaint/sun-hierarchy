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

import Graph, { Vertex } from '@/interface/graph';
import { divide } from '@/algos/weakconnect';
import { makeHierarchy } from '@/algos/hierarchy';
import { LayoutOptions } from '@/interface/definition';
import { defaultOptions } from '@/interface/constant';
import { baryCentric } from '@/algos/barycentric';
import { brandeskopf } from '@/algos/brandeskopf';

export function layout(g: Graph, options = defaultOptions): Graph[] {
  const finalGraphs: Graph[] = [];
  const graphs: Graph[] = divide(g);
  let aggregateLeftMargin: number = 0;
  const mergedOptions: LayoutOptions = { ...options };
  const { width, gutter = 0 } = mergedOptions;
  graphs.map((subGraph) => {
    const levels: Vertex[][] = makeHierarchy(subGraph);
    const { levels: orderedLevels } = baryCentric(levels, {});
    const maxVerticesCount: number = Math.max.apply(
      null,
      orderedLevels.map((lvl) => lvl.length),
    );
    brandeskopf(orderedLevels, mergedOptions);
    aggregateLeftMargin += maxVerticesCount * (width + gutter) + ((2 * gutter) | 20);
    mergedOptions.margin = { ...(mergedOptions.margin || {}), ...{ left: aggregateLeftMargin } };
    finalGraphs.push(subGraph);
  });
  return finalGraphs;
}
