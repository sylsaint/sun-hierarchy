import * as path from 'path';
import Graph, { Vertex, Edge } from '@/interface/graph';
import { layout } from '@/algos/sugiyama';
import { generateSvg } from '@/test/helpers/svg';
import * as fs from 'fs';

const EXAMPLES_DIR = path.resolve(process.cwd(), 'examples');

function getLevelsFromGraph(g: Graph): Vertex[][] {
  const levelMap = new Map<number, Vertex[]>();
  g.vertices.forEach((v) => {
    const y = (v.getOptions('y') ?? 0) as number;
    if (!levelMap.has(y)) levelMap.set(y, []);
    levelMap.get(y)!.push(v);
  });
  return Array.from(levelMap.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([, vs]) => vs);
}

function saveSvgToExamples(levels: Vertex[][], filename: string, title: string) {
  if (!fs.existsSync(EXAMPLES_DIR)) {
    fs.mkdirSync(EXAMPLES_DIR, { recursive: true });
  }
  const content = generateSvg(levels, title);
  const filePath = path.join(EXAMPLES_DIR, `${filename}.svg`);
  fs.writeFileSync(filePath, content, 'utf-8');
  console.log(`✅ Generated: examples/${filename}.svg`);
}

// ── 1. Balanced Binary Tree ──
{
  const vertices: Vertex[] = [];
  for (let i = 0; i < 7; i++) vertices.push(new Vertex(i));
  const edges = [
    new Edge(vertices[0], vertices[1]),
    new Edge(vertices[0], vertices[2]),
    new Edge(vertices[1], vertices[3]),
    new Edge(vertices[1], vertices[4]),
    new Edge(vertices[2], vertices[5]),
    new Edge(vertices[2], vertices[6]),
  ];
  const g = new Graph(vertices, edges, { directed: true });
  const graphs = layout(g, { width: 80, height: 40, gutter: 20 });
  const levels = getLevelsFromGraph(graphs[0]);
  saveSvgToExamples(levels, 'balanced-binary-tree', 'Balanced Binary Tree');
}

// ── 2. Multi-Path Convergence ──
{
  const vertices: Vertex[] = [];
  for (let i = 0; i < 8; i++) vertices.push(new Vertex(i));
  const edges = [
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
  const g = new Graph(vertices, edges, { directed: true });
  const graphs = layout(g, { width: 80, height: 40, gutter: 20 });
  const levels = getLevelsFromGraph(graphs[0]);
  saveSvgToExamples(levels, 'multi-path-convergence', 'Multi-Path Convergence');
}

// ── 3. Cross-Level Bezier Curves ──
{
  const vertices: Vertex[] = [];
  for (let i = 0; i < 4; i++) vertices.push(new Vertex(i));
  const edges = [
    new Edge(vertices[0], vertices[1]),
    new Edge(vertices[1], vertices[2]),
    new Edge(vertices[2], vertices[3]),
    new Edge(vertices[0], vertices[3]), // long-span edge
  ];
  const g = new Graph(vertices, edges, { directed: true });
  const graphs = layout(g, { width: 80, height: 40, gutter: 20 });
  const levels = getLevelsFromGraph(graphs[0]);
  saveSvgToExamples(levels, 'cross-level-bezier-curves', 'Cross-Level Bezier Curves');
}

// ── 4. Wide Fan-Out Hierarchy ──
{
  const vertices: Vertex[] = [];
  for (let i = 0; i < 8; i++) vertices.push(new Vertex(i));
  const edges = [
    new Edge(vertices[0], vertices[1]),
    new Edge(vertices[0], vertices[2]),
    new Edge(vertices[0], vertices[3]),
    new Edge(vertices[0], vertices[4]),
    new Edge(vertices[0], vertices[5]),
    new Edge(vertices[0], vertices[6]),
    new Edge(vertices[0], vertices[7]),
  ];
  const g = new Graph(vertices, edges, { directed: true });
  const graphs = layout(g, { width: 60, height: 40, gutter: 10 });
  const levels = getLevelsFromGraph(graphs[0]);
  saveSvgToExamples(levels, 'wide-fanout-hierarchy', 'Wide Fan-Out Hierarchy');
}

// ── 5. Large-Scale Real-World DAG ──
{
  // Build a larger DAG to represent a real-world scenario
  const ids = Array.from({ length: 20 }, (_, i) => i);
  const vertices = ids.map((id) => new Vertex(id));
  const edgePairs: [number, number][] = [
    [0, 1],
    [0, 2],
    [0, 3],
    [1, 4],
    [1, 5],
    [2, 5],
    [2, 6],
    [3, 6],
    [3, 7],
    [4, 8],
    [4, 9],
    [5, 9],
    [5, 10],
    [6, 10],
    [6, 11],
    [7, 11],
    [7, 12],
    [8, 13],
    [9, 13],
    [9, 14],
    [10, 14],
    [10, 15],
    [11, 15],
    [11, 16],
    [12, 16],
    [13, 17],
    [14, 17],
    [14, 18],
    [15, 18],
    [16, 18],
    [17, 19],
    [18, 19],
  ];
  const edges = edgePairs.map(([s, t]) => new Edge(vertices[s], vertices[t]));
  const g = new Graph(vertices, edges, { directed: true });
  const graphs = layout(g, { width: 80, height: 40, gutter: 20 });
  const levels = getLevelsFromGraph(graphs[0]);
  saveSvgToExamples(levels, 'large-scale-real-world-dag', 'Large-Scale Real-World DAG');
}

console.log('\n🎉 All examples generated!');
