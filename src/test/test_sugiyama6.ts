import { expect } from 'chai';
import Graph, { Vertex, Edge } from '@/interface/graph';
import { layout } from '@/algos/sugiyama';
import { printLayoutResult } from '@/utils/printer';
import { saveSvg } from './helpers/svg';
import { data } from './data/data1';

// Helper: extract levels from a laid-out graph
function getLevelsFromGraph(g: Graph): Vertex[][] {
  const levelMap: { [key: number]: Vertex[] } = {};
  g.vertices.map((v) => {
    const level = v.getOptions('level') ?? v.getOptions('_y') ?? 0;
    if (!levelMap[level]) levelMap[level] = [];
    levelMap[level].push(v);
  });
  const sortedKeys = Object.keys(levelMap)
    .map(Number)
    .sort((a, b) => a - b);
  return sortedKeys.map((k) => {
    const verts = levelMap[k];
    verts.sort((a, b) => (a.getOptions('x') ?? 0) - (b.getOptions('x') ?? 0));
    return verts;
  });
}

describe('Sugiyama layout 6', () => {
  const vertices: Array<Vertex> = [];
  const verticeMap: { [key: string | number]: Vertex } = {};
  data.tasks.map((task) => {
    const vertice = new Vertex(task.taskId);
    vertices.push(vertice);
    verticeMap[task.taskId] = vertice;
  });

  const edges: Array<Edge> = [];
  data.links.map((link) => {
    edges.push(new Edge(verticeMap[link.taskFrom], verticeMap[link.taskTo]));
  });

  const g: Graph = new Graph(vertices, edges, { directed: true });
  it('#layout', () => {
    const graphs: Array<Graph> = layout(g);
    graphs.map((g, idx) => {
      const levels = getLevelsFromGraph(g);
      printLayoutResult(levels, `Sub-graph ${idx + 1} (${g.vertices.length} vertices)`);
      saveSvg(levels, `sugiyama6_subgraph_${idx + 1}`, `Sub-graph ${idx + 1} (${g.vertices.length} vertices)`);
    });
  });
});
