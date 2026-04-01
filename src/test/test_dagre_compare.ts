import { expect } from 'chai';
import * as dagre from 'dagre';
import Graph, { Vertex, Edge } from '@/interface/graph';
import { layout } from '@/algos/sugiyama';
import { saveSvg, generateSvgIndex } from './helpers/svg';
import { saveDagreSvg } from './helpers/dagre_svg';
import { data } from './data/data1';
import { data2 } from './data/data2';

// ─────────────────────────────────────────────────────────
// Helper: extract levels from a sun-hierarchy laid-out graph
// ─────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────
// Helper: build a dagre graph from nodes and edges
// ─────────────────────────────────────────────────────────
interface SimpleEdge {
  from: string;
  to: string;
}

function buildDagreGraph(
  nodeIds: string[],
  edges: SimpleEdge[],
  opts?: { nodeWidth?: number; nodeHeight?: number; ranksep?: number; nodesep?: number },
): dagre.graphlib.Graph {
  const g = new dagre.graphlib.Graph();
  const nodeWidth = opts?.nodeWidth ?? 120;
  const nodeHeight = opts?.nodeHeight ?? 40;

  g.setGraph({
    rankdir: 'TB',
    ranksep: opts?.ranksep ?? 80,
    nodesep: opts?.nodesep ?? 60,
    marginx: 20,
    marginy: 20,
  });
  g.setDefaultEdgeLabel(() => ({}));

  nodeIds.forEach((id) => {
    g.setNode(id, { label: id, width: nodeWidth, height: nodeHeight });
  });

  edges.forEach((e) => {
    // Only add edge if both nodes exist
    if (g.hasNode(e.from) && g.hasNode(e.to)) {
      g.setEdge(e.from, e.to);
    }
  });

  dagre.layout(g);
  return g;
}

// ─────────────────────────────────────────────────────────
// Test: Compare layouts
// ─────────────────────────────────────────────────────────

describe('Dagre vs Sun-Hierarchy Comparison', () => {
  // ── Test 1: Simple chain ──
  it('should compare simple chain layout', () => {
    const nodeIds = ['0', '1', '2', '3'];
    const edges: SimpleEdge[] = [
      { from: '0', to: '1' },
      { from: '1', to: '2' },
      { from: '2', to: '3' },
    ];

    // Dagre layout
    const dg = buildDagreGraph(nodeIds, edges);
    saveDagreSvg(dg, 'compare_chain_dagre', 'Dagre: Chain 0→1→2→3');

    // Sun-hierarchy layout
    const vertices: Vertex[] = [];
    for (let i = 0; i < 4; i++) vertices.push(new Vertex(i));
    const sunEdges = [
      new Edge(vertices[0], vertices[1]),
      new Edge(vertices[1], vertices[2]),
      new Edge(vertices[2], vertices[3]),
    ];
    const g = new Graph(vertices, sunEdges, { directed: true });
    const graphs = layout(g);
    graphs.forEach((sg) => {
      const levels = getLevelsFromGraph(sg);
      saveSvg(levels, 'compare_chain_sun', 'Sun-Hierarchy: Chain 0→1→2→3');
    });
  });

  // ── Test 2: Binary tree ──
  it('should compare binary tree layout', () => {
    const nodeIds = ['0', '1', '2', '3', '4', '5', '6'];
    const edges: SimpleEdge[] = [
      { from: '0', to: '1' },
      { from: '0', to: '2' },
      { from: '1', to: '3' },
      { from: '1', to: '4' },
      { from: '2', to: '5' },
      { from: '2', to: '6' },
    ];

    const dg = buildDagreGraph(nodeIds, edges);
    saveDagreSvg(dg, 'compare_binary_tree_dagre', 'Dagre: Binary Tree');

    const vertices: Vertex[] = [];
    for (let i = 0; i < 7; i++) vertices.push(new Vertex(i));
    const sunEdges = [
      new Edge(vertices[0], vertices[1]),
      new Edge(vertices[0], vertices[2]),
      new Edge(vertices[1], vertices[3]),
      new Edge(vertices[1], vertices[4]),
      new Edge(vertices[2], vertices[5]),
      new Edge(vertices[2], vertices[6]),
    ];
    const g = new Graph(vertices, sunEdges, { directed: true });
    const graphs = layout(g);
    graphs.forEach((sg) => {
      const levels = getLevelsFromGraph(sg);
      saveSvg(levels, 'compare_binary_tree_sun', 'Sun-Hierarchy: Binary Tree');
    });
  });

  // ── Test 3: Diamond (multi-parent convergence) ──
  it('should compare diamond layout', () => {
    const nodeIds = ['0', '1', '2', '3'];
    const edges: SimpleEdge[] = [
      { from: '0', to: '1' },
      { from: '0', to: '2' },
      { from: '1', to: '3' },
      { from: '2', to: '3' },
    ];

    const dg = buildDagreGraph(nodeIds, edges);
    saveDagreSvg(dg, 'compare_diamond_dagre', 'Dagre: Diamond');

    const vertices: Vertex[] = [];
    for (let i = 0; i < 4; i++) vertices.push(new Vertex(i));
    const sunEdges = [
      new Edge(vertices[0], vertices[1]),
      new Edge(vertices[0], vertices[2]),
      new Edge(vertices[1], vertices[3]),
      new Edge(vertices[2], vertices[3]),
    ];
    const g = new Graph(vertices, sunEdges, { directed: true });
    const graphs = layout(g);
    graphs.forEach((sg) => {
      const levels = getLevelsFromGraph(sg);
      saveSvg(levels, 'compare_diamond_sun', 'Sun-Hierarchy: Diamond');
    });
  });

  // ── Test 4: Wide fan-out ──
  it('should compare wide fan-out layout', () => {
    const nodeIds = ['0', '1', '2', '3', '4', '5', '6', '7'];
    const edges: SimpleEdge[] = [
      { from: '0', to: '1' },
      { from: '0', to: '2' },
      { from: '0', to: '3' },
      { from: '0', to: '4' },
      { from: '0', to: '5' },
      { from: '0', to: '6' },
      { from: '0', to: '7' },
    ];

    const dg = buildDagreGraph(nodeIds, edges);
    saveDagreSvg(dg, 'compare_fanout_dagre', 'Dagre: Fan-out 1→7');

    const vertices: Vertex[] = [];
    for (let i = 0; i < 8; i++) vertices.push(new Vertex(i));
    const sunEdges = [
      new Edge(vertices[0], vertices[1]),
      new Edge(vertices[0], vertices[2]),
      new Edge(vertices[0], vertices[3]),
      new Edge(vertices[0], vertices[4]),
      new Edge(vertices[0], vertices[5]),
      new Edge(vertices[0], vertices[6]),
      new Edge(vertices[0], vertices[7]),
    ];
    const g = new Graph(vertices, sunEdges, { directed: true });
    const graphs = layout(g);
    graphs.forEach((sg) => {
      const levels = getLevelsFromGraph(sg);
      saveSvg(levels, 'compare_fanout_sun', 'Sun-Hierarchy: Fan-out 1→7');
    });
  });

  // ── Test 5: Complex DAG with multi-parent convergence ──
  it('should compare complex DAG layout', () => {
    const nodeIds = ['0', '1', '2', '3', '4', '5', '6', '7'];
    const edges: SimpleEdge[] = [
      { from: '0', to: '1' },
      { from: '0', to: '2' },
      { from: '0', to: '3' },
      { from: '1', to: '4' },
      { from: '2', to: '4' },
      { from: '2', to: '5' },
      { from: '3', to: '6' },
      { from: '4', to: '7' },
      { from: '5', to: '7' },
      { from: '6', to: '7' },
    ];

    const dg = buildDagreGraph(nodeIds, edges);
    saveDagreSvg(dg, 'compare_complex_dag_dagre', 'Dagre: Complex DAG');

    const vertices: Vertex[] = [];
    for (let i = 0; i < 8; i++) vertices.push(new Vertex(i));
    const sunEdges = [
      new Edge(vertices[0], vertices[1]),
      new Edge(vertices[0], vertices[2]),
      new Edge(vertices[0], vertices[3]),
      new Edge(vertices[1], vertices[4]),
      new Edge(vertices[2], vertices[4]),
      new Edge(vertices[2], vertices[5]),
      new Edge(vertices[3], vertices[6]),
      new Edge(vertices[4], vertices[7]),
      new Edge(vertices[5], vertices[7]),
      new Edge(vertices[6], vertices[7]),
    ];
    const g = new Graph(vertices, sunEdges, { directed: true });
    const graphs = layout(g);
    graphs.forEach((sg) => {
      const levels = getLevelsFromGraph(sg);
      saveSvg(levels, 'compare_complex_dag_sun', 'Sun-Hierarchy: Complex DAG');
    });
  });

  // ── Test 6: Long-span edge with dummy nodes ──
  it('should compare long-span edge layout', () => {
    const nodeIds = ['0', '1', '2', '3'];
    const edges: SimpleEdge[] = [
      { from: '0', to: '1' },
      { from: '1', to: '2' },
      { from: '2', to: '3' },
      { from: '0', to: '3' }, // long-span
    ];

    const dg = buildDagreGraph(nodeIds, edges);
    saveDagreSvg(dg, 'compare_longspan_dagre', 'Dagre: Long-span 0→3');

    const vertices: Vertex[] = [];
    for (let i = 0; i < 4; i++) vertices.push(new Vertex(i));
    const sunEdges = [
      new Edge(vertices[0], vertices[1]),
      new Edge(vertices[1], vertices[2]),
      new Edge(vertices[2], vertices[3]),
      new Edge(vertices[0], vertices[3]),
    ];
    const g = new Graph(vertices, sunEdges, { directed: true });
    const graphs = layout(g);
    graphs.forEach((sg) => {
      const levels = getLevelsFromGraph(sg);
      saveSvg(levels, 'compare_longspan_sun', 'Sun-Hierarchy: Long-span 0→3');
    });
  });

  // ── Test 7: Real-world data1 (large DAG) ──
  it('should compare data1 real-world DAG layout', () => {
    // Dagre
    const nodeIds = data.tasks.map((t) => t.taskId);
    const edges: SimpleEdge[] = data.links.map((l) => ({ from: l.taskFrom, to: l.taskTo }));
    const dg = buildDagreGraph(nodeIds, edges);
    saveDagreSvg(dg, 'compare_data1_dagre', 'Dagre: Real-world DAG (data1)');

    // Sun-hierarchy
    const vertices: Vertex[] = [];
    const vertexMap: { [key: string]: Vertex } = {};
    data.tasks.forEach((task) => {
      const v = new Vertex(task.taskId);
      vertices.push(v);
      vertexMap[task.taskId] = v;
    });
    const sunEdges: Edge[] = [];
    data.links.forEach((link) => {
      sunEdges.push(new Edge(vertexMap[link.taskFrom], vertexMap[link.taskTo]));
    });
    const g = new Graph(vertices, sunEdges, { directed: true });
    const graphs = layout(g, { width: 100, height: 50, compactComponents: true });
    graphs.forEach((sg, idx) => {
      const levels = getLevelsFromGraph(sg);
      saveSvg(levels, `compare_data1_sun_${idx + 1}`, `Sun-Hierarchy: Real-world DAG (data1) #${idx + 1}`);
    });
  });

  // ── Test 8: Real-world data2 (Industry Opportunity Insight) ──
  it('should compare data2 Industry DAG layout', () => {
    // Dagre
    const nodeIds = data2.tasks.map((t) => t.taskId);
    const edges: SimpleEdge[] = data2.links.map((l) => ({ from: l.taskFrom, to: l.taskTo }));
    const dg = buildDagreGraph(nodeIds, edges);
    saveDagreSvg(dg, 'compare_data2_dagre', 'Dagre: Industry Insight DAG (data2)');

    // Sun-hierarchy
    const vertices: Vertex[] = [];
    const vertexMap: { [key: string]: Vertex } = {};
    data2.tasks.forEach((task) => {
      const v = new Vertex(task.taskId);
      vertices.push(v);
      vertexMap[task.taskId] = v;
    });
    const sunEdges: Edge[] = [];
    data2.links.forEach((link) => {
      sunEdges.push(new Edge(vertexMap[link.taskFrom], vertexMap[link.taskTo]));
    });
    const g = new Graph(vertices, sunEdges, { directed: true });
    const graphs = layout(g, { width: 100, height: 50, compactComponents: true });
    graphs.forEach((sg, idx) => {
      const levels = getLevelsFromGraph(sg);
      saveSvg(levels, `compare_data2_sun_${idx + 1}`, `Sun-Hierarchy: Industry Insight DAG (data2) #${idx + 1}`);
    });
  });

  // ── Final: regenerate index ──
  after(() => {
    generateSvgIndex();
  });
});
