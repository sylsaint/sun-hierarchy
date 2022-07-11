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
import { divide } from './weakconnect';
import { makeHierarchy } from './hierarchy';
import { cloneGraph } from '../misc/graphUtil';
import { LayoutOptions } from '../misc/interface';
import { defaultOptions } from '../misc/constant';
import { baryCentric } from './barycentric';
import { brandeskopf } from './brandeskopf';

export class Sugiyama {
  constructor() { }
  private clone(g: Graph): Graph {
    return cloneGraph(g);
  }
  private divide(g: Graph): Array<Graph> {
    return divide(g);
  }
  private hierarchy(g: Graph): Vertex[][] {
    return makeHierarchy(g);
  }
  private cross(g: Graph, levels: Vertex[][]): Vertex[][] {
    const { levels: orderedLevels } = baryCentric(levels, {});
    return orderedLevels;
  }
  private position(g: Graph, levels: Vertex[][], options?: LayoutOptions): Graph {
    brandeskopf(levels, options);
    return g;
  }
  public layout(g: Graph, options?: LayoutOptions): Array<Graph> {
    let finals: Array<Graph> = [];
    let graphs: Array<Graph> = this.divide(g);
    let leftPadding: number = 0;
    let merged: LayoutOptions = { ...defaultOptions, ...options };
    const { width, gutter } = merged;
    graphs.map(gi => {
      let levels: Vertex[][] = this.hierarchy(gi);
      levels = this.cross(gi, levels);
      const maxWidth: number = Math.max.apply(null, levels.map(lvl => lvl.length));
      let ordered: Graph = this.position(gi, levels, merged);
      leftPadding += maxWidth * (width + gutter) + (2 * gutter | 20);
      merged.padding = { ...merged.padding, ...{ left: leftPadding } };
      finals.push(ordered);
    });
    return finals;
  }
}
