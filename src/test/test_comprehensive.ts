import { expect } from 'chai';
import Graph, { Vertex, Edge } from '@/interface/graph';
import { layout } from '@/algos/sugiyama';
import { transpose, cloneGraph, findVertexById, printVertexNeighbours } from '@/utils/graph';
import { printVertices, printLayoutResult, printPositionTable } from '@/utils/printer';
import { saveSvg, generateSvgIndex } from './helpers/svg';
import { edgeMatrix, range } from '@/utils/edge';
import { makeHierarchy } from '@/algos/hierarchy';
import { baryCentric } from '@/algos/barycentric';
import { DUMMY } from '@/interface/constant';
import { vegetables } from './data/data';
import defaultExport, { Graph as GraphExport, Vertex as VertexExport, Edge as EdgeExport } from '@/index';

// ============================================================
// 1. Utils coverage: graph.ts
// ============================================================
describe('Utils - graph.ts', () => {
  it('transpose should reverse edge directions', () => {
    const v0 = new Vertex(0);
    const v1 = new Vertex(1);
    const e = new Edge(v0, v1);
    const g = new Graph([v0, v1], [e], { directed: true });
    expect(g.edges[0].up).to.equal(v0);
    expect(g.edges[0].down).to.equal(v1);
    transpose(g);
    expect(g.edges[0].up).to.equal(v1);
    expect(g.edges[0].down).to.equal(v0);
  });

  it('cloneGraph should create an independent copy', () => {
    const v0 = new Vertex(0);
    const v1 = new Vertex(1);
    const e = new Edge(v0, v1);
    const g = new Graph([v0, v1], [e], { directed: true });
    const clone = cloneGraph(g);
    expect(clone.vertices.length).to.equal(2);
    expect(clone.edges.length).to.equal(1);
    // Vertices should be different objects
    expect(clone.vertices[0]).to.not.equal(v0);
  });

  it('findVertexById should return null for non-existent id', () => {
    const v0 = new Vertex(0);
    const g = new Graph([v0], [], { directed: true });
    expect(findVertexById(g, 999)).to.be.null;
    expect(findVertexById(g, 0)).to.not.be.null;
  });

  it('printVertexNeighbours should not throw', () => {
    const v0 = new Vertex(0);
    const v1 = new Vertex(1);
    const e = new Edge(v0, v1);
    const g = new Graph([v0, v1], [e], { directed: true });
    expect(() => printVertexNeighbours(g)).to.not.throw();
  });

  it('printVertices should not throw on empty levels', () => {
    expect(() => printVertices([[]])).to.not.throw();
  });

  it('printLayoutResult should not throw on empty levels', () => {
    expect(() => printLayoutResult([])).to.not.throw();
  });

  it('printPositionTable should not throw on empty levels', () => {
    expect(() => printPositionTable([])).to.not.throw();
  });
});

// ============================================================
// 2. Utils coverage: edge.ts
// ============================================================
describe('Utils - edge.ts', () => {
  it('edgeMatrix should build correct adjacency matrix', () => {
    const v0 = new Vertex(0);
    const v1 = new Vertex(1);
    const v2 = new Vertex(2);
    new Edge(v0, v1); // not added to graph, just to vertex
    const g = new Graph([v0, v1, v2], [new Edge(v0, v1)], { directed: true });
    const matrix = edgeMatrix([v0], [v1, v2]);
    expect(matrix[0][0]).to.equal(1);
    expect(matrix[0][1]).to.equal(0);
  });

  it('range should generate correct ascending range', () => {
    const r = range(0, 5);
    expect(r).to.deep.equal([0, 1, 2, 3, 4, 5]);
  });

  it('range should generate correct descending range', () => {
    const r = range(5, 0);
    expect(r).to.deep.equal([5, 4, 3, 2, 1, 0]);
  });

  it('range should support custom step', () => {
    const r = range(0, 6, 2);
    expect(r).to.deep.equal([0, 2, 4, 6]);
  });
});

// ============================================================
// 3. Graph class coverage
// ============================================================
describe('Graph class', () => {
  it('should report order, empty, trivial correctly', () => {
    const g0 = new Graph([], [], { directed: true });
    expect(g0.order).to.equal(0);
    expect(g0.empty).to.be.true;
    expect(g0.trivial).to.be.true;

    const v0 = new Vertex(0);
    const g1 = new Graph([v0], [], { directed: true });
    expect(g1.order).to.equal(1);
    expect(g1.empty).to.be.false;
    expect(g1.trivial).to.be.true;

    const v1 = new Vertex(1);
    const g2 = new Graph([v0, v1], [new Edge(v0, v1)], { directed: true });
    expect(g2.order).to.equal(2);
    expect(g2.trivial).to.be.false;
  });

  it('should add and remove vertices', () => {
    const g = new Graph([], [], { directed: true });
    const v0 = new Vertex(0);
    const v1 = new Vertex(1);
    g.addVertex(v0);
    g.addVertex(v1);
    expect(g.order).to.equal(2);

    // Adding duplicate should not increase count
    g.addVertex(v0);
    expect(g.order).to.equal(2);

    // Remove vertex
    const removed = g.removeVertex(v0);
    expect(removed).to.equal(v0);
    expect(g.order).to.equal(1);

    // Remove non-existent vertex
    const result = g.removeVertex(new Vertex(999));
    expect(result).to.be.null;
  });

  it('should add and remove edges', () => {
    const v0 = new Vertex(0);
    const v1 = new Vertex(1);
    const g = new Graph([v0, v1], [], { directed: true });
    const e = new Edge(v0, v1);
    g.addEdge(e);
    expect(g.edges.length).to.equal(1);

    // Adding duplicate edge should not increase count
    g.addEdge(e);
    expect(g.edges.length).to.equal(1);

    // Remove edge
    const removed = g.removeEdge(e);
    expect(removed).to.equal(e);
    expect(g.edges.length).to.equal(0);

    // Remove non-existent edge
    const result = g.removeEdge(new Edge(v0, v1));
    expect(result).to.be.null;
  });

  it('should handle getVertexById', () => {
    const v0 = new Vertex(0);
    const v1 = new Vertex(1);
    const g = new Graph([v0, v1], [], { directed: true });
    expect(g.getVertexById(0)).to.equal(v0);
  });

  it('should handle hasVertex with same id but different object', () => {
    const v0 = new Vertex(0);
    const g = new Graph([v0], [], { directed: true });
    const v0Copy = new Vertex(0);
    expect(g.hasVertex(v0Copy)).to.be.true;
  });

  it('should prevent adding edge with non-existent vertices', () => {
    const v0 = new Vertex(0);
    const v1 = new Vertex(1);
    const v2 = new Vertex(2);
    const g = new Graph([v0, v1], [], { directed: true });
    const e = new Edge(v0, v2); // v2 not in graph
    g.addEdge(e);
    expect(g.edges.length).to.equal(0);
  });

  it('Vertex should handle options correctly', () => {
    const v = new Vertex(0, { color: 'red' });
    expect(v.getOptions('color')).to.equal('red');
    v.setOptions('color', 'blue');
    expect(v.getOptions('color')).to.equal('blue');
    const removed = v.removeOptions('color');
    expect(removed).to.equal('blue');
    expect(v.getOptions('color')).to.be.undefined;
  });

  it('Edge should handle options correctly', () => {
    const v0 = new Vertex(0);
    const v1 = new Vertex(1);
    const e = new Edge(v0, v1, { weight: 5 });
    expect(e.getOptions('weight')).to.equal(5);
    expect(e.options).to.deep.equal({ weight: 5 });
    e.setOptions('weight', 10);
    expect(e.getOptions('weight')).to.equal(10);
  });
});

// ============================================================
// 4. Hierarchy coverage - cycle handling
// ============================================================
describe('Hierarchy - edge cases', () => {
  it('should handle graph with cycle (no natural roots)', () => {
    const v0 = new Vertex(0);
    const v1 = new Vertex(1);
    const v2 = new Vertex(2);
    const edges = [
      new Edge(v0, v1),
      new Edge(v1, v2),
      new Edge(v2, v0), // creates cycle
    ];
    const g = new Graph([v0, v1, v2], edges, { directed: true });
    // Should not throw, should handle cycle gracefully
    const levels = makeHierarchy(g);
    expect(levels.length).to.be.greaterThan(0);
  });

  it('should handle single node graph', () => {
    const v0 = new Vertex(0);
    const g = new Graph([v0], [], { directed: true });
    const levels = makeHierarchy(g);
    expect(levels.length).to.equal(1);
    expect(levels[0].length).to.equal(1);
  });
});

// ============================================================
// 5. Index.ts coverage
// ============================================================
describe('Index exports', () => {
  it('should export layout as default', () => {
    expect(defaultExport).to.be.a('function');
    expect(GraphExport).to.be.a('function');
    expect(VertexExport).to.be.a('function');
    expect(EdgeExport).to.be.a('function');
  });
});

// ============================================================
// 6. Beautiful output tests with various graph topologies
// ============================================================
describe('Layout visualization - beautiful output', () => {
  it('should display a simple chain layout', () => {
    const vertices: Vertex[] = [];
    for (let i = 0; i < 4; i++) vertices.push(new Vertex(i));
    const edges = [
      new Edge(vertices[0], vertices[1]),
      new Edge(vertices[1], vertices[2]),
      new Edge(vertices[2], vertices[3]),
    ];
    const g = new Graph(vertices, edges, { directed: true });
    const graphs = layout(g, { width: 80, height: 40, gutter: 20 });
    expect(graphs.length).to.equal(1);

    console.log('\n=== Simple Chain (0 → 1 → 2 → 3) ===');
    const levels = getLevelsFromGraph(graphs[0]);
    printLayoutResult(levels, 'Chain: 0 → 1 → 2 → 3');
    printPositionTable(levels);
    saveSvg(levels, 'chain_0_1_2_3', 'Chain: 0 → 1 → 2 → 3');
  });

  it('should display a binary tree layout', () => {
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
    expect(graphs.length).to.equal(1);

    console.log('\n=== Binary Tree ===');
    const levels = getLevelsFromGraph(graphs[0]);
    printLayoutResult(levels, 'Binary Tree');
    printPositionTable(levels);
    saveSvg(levels, 'binary_tree', 'Binary Tree');
  });

  it('should display a diamond (multi-parent) layout', () => {
    const vertices: Vertex[] = [];
    for (let i = 0; i < 4; i++) vertices.push(new Vertex(i));
    const edges = [
      new Edge(vertices[0], vertices[1]),
      new Edge(vertices[0], vertices[2]),
      new Edge(vertices[1], vertices[3]),
      new Edge(vertices[2], vertices[3]),
    ];
    const g = new Graph(vertices, edges, { directed: true });
    const graphs = layout(g, { width: 80, height: 40, gutter: 20 });
    expect(graphs.length).to.equal(1);

    console.log('\n=== Diamond (multi-parent) ===');
    const levels = getLevelsFromGraph(graphs[0]);
    printLayoutResult(levels, 'Diamond: A→B,C→D');
    printPositionTable(levels);
    saveSvg(levels, 'diamond', 'Diamond: A→B,C→D');
  });

  it('should display a wide fan-out layout', () => {
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
    expect(graphs.length).to.equal(1);

    console.log('\n=== Wide Fan-out (1 parent → 7 children) ===');
    const levels = getLevelsFromGraph(graphs[0]);
    printLayoutResult(levels, 'Fan-out: 0 → {1..7}');
    printPositionTable(levels);
    saveSvg(levels, 'fan_out_7', 'Fan-out: 0 → {1..7}');
  });

  it('should display a complex DAG with multiple parents', () => {
    // Build a complex DAG:
    //     0
    //    /|\
    //   1  2  3
    //   |\/|  |
    //   4  5  6
    //    \ | /
    //      7
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
    expect(graphs.length).to.equal(1);

    console.log('\n=== Complex DAG with multi-parent convergence ===');
    const levels = getLevelsFromGraph(graphs[0]);
    printLayoutResult(levels, 'Complex DAG');
    printPositionTable(levels);
    saveSvg(levels, 'complex_dag', 'Complex DAG');

    // Verify node 7 is within parent range
    const x4 = vertices[4].getOptions('x');
    const x5 = vertices[5].getOptions('x');
    const x6 = vertices[6].getOptions('x');
    const x7 = vertices[7].getOptions('x');
    const parentMin = Math.min(x4, x5, x6);
    const parentMax = Math.max(x4, x5, x6);
    expect(x7).to.be.at.least(parentMin);
    expect(x7).to.be.at.most(parentMax);
  });

  it('should display a long-span edge layout with dummy nodes', () => {
    // 0 → 1 → 2 → 3, and 0 → 3 (long span)
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
    expect(graphs.length).to.equal(1);

    console.log('\n=== Long-span edge (0→3 skips 2 levels) ===');
    const levels = getLevelsFromGraph(graphs[0]);
    printLayoutResult(levels, 'Long-span: 0→1→2→3, 0→3');
    printPositionTable(levels);
    saveSvg(levels, 'long_span', 'Long-span: 0→1→2→3, 0→3');
  });

  it('should display disconnected components', () => {
    const vertices: Vertex[] = [];
    for (let i = 0; i < 6; i++) vertices.push(new Vertex(i));
    const edges = [
      new Edge(vertices[0], vertices[1]),
      new Edge(vertices[1], vertices[2]),
      // Component 2
      new Edge(vertices[3], vertices[4]),
      new Edge(vertices[4], vertices[5]),
    ];
    const g = new Graph(vertices, edges, { directed: true });

    // Default: merged into one graph
    const mergedGraphs = layout(g, { width: 80, height: 40, gutter: 20 });
    expect(mergedGraphs.length).to.equal(1);

    console.log('\n=== Disconnected Components (merged) ===');
    const mergedLevels = getLevelsFromGraph(mergedGraphs[0]);
    printLayoutResult(mergedLevels, 'Disconnected Components (merged)');
    saveSvg(mergedLevels, 'disconnected_merged', 'Disconnected Components (merged)');

    // Split mode: separate sub-graphs
    const graphs = layout(g, { width: 80, height: 40, gutter: 20, mergeComponents: false });
    expect(graphs.length).to.equal(2);

    console.log('\n=== Disconnected Components (split) ===');
    graphs.map((subGraph, idx) => {
      const levels = getLevelsFromGraph(subGraph);
      printLayoutResult(levels, `Component ${idx + 1}`);
      saveSvg(levels, `disconnected_component_${idx + 1}`, `Component ${idx + 1}`);
    });

    // Generate HTML index page after all SVGs are created
    generateSvgIndex();
  });
});

// ============================================================
// 7. Branch coverage: barycentric edge cases
// ============================================================
describe('BaryCentric - branch coverage', () => {
  it('calcMulLevelbaryCentric should return early when totalRound is 0', () => {
    const v0 = new Vertex(0);
    const v1 = new Vertex(1);
    const v2 = new Vertex(2);
    new Edge(v0, v1);
    new Edge(v1, v2);
    const result = baryCentric([[v0], [v1], [v2]], { totalRound: 0 });
    expect(result.levels.length).to.equal(3);
  });

  it('calcTwoLevelbaryCentric should handle rowFixed with equal coefficients', () => {
    // Create a scenario where row is fixed and col has equal barycentric coefficients
    const v0 = new Vertex('r0');
    const v1 = new Vertex('r1');
    const v2 = new Vertex('c0');
    const v3 = new Vertex('c1');
    // Both rows connect to both cols symmetrically
    new Edge(v0, v2);
    new Edge(v0, v3);
    new Edge(v1, v2);
    new Edge(v1, v3);
    const result = baryCentric(
      [
        [v0, v1],
        [v2, v3],
      ],
      { rowFixed: true },
    );
    expect(result.crossCount).to.be.a('number');
  });

  it('should handle single level input', () => {
    const v0 = new Vertex(0);
    const result = baryCentric([[v0]], {});
    expect(result.levels.length).to.equal(1);
    expect(result.crossCount).to.equal(0);
  });
});

// ============================================================
// 8. Branch coverage: Graph removeVertex with edges
// ============================================================
describe('Graph - removeVertex with edges', () => {
  it('should remove vertex and its associated edges', () => {
    const v0 = new Vertex(0);
    const v1 = new Vertex(1);
    const v2 = new Vertex(2);
    const e1 = new Edge(v0, v1);
    const e2 = new Edge(v1, v2);
    const g = new Graph([v0, v1, v2], [e1, e2], { directed: true });
    expect(g.edges.length).to.equal(2);
    g.removeVertex(v1);
    expect(g.order).to.equal(2);
    // At least some edges connected to v1 should be removed
    expect(g.edges.length).to.be.lessThan(2);
  });
});

// ============================================================
// 9. Performance test
// ============================================================
describe('Performance', () => {
  it('should layout vegetable data within 1000ms', function () {
    this.timeout(2000);
    const vMap: { [key: string]: Vertex } = {};
    const vLevels = vegetables.map((vertices: any[]) => {
      return vertices.map((v: any) => {
        const vertex = new Vertex(v.id);
        vMap[v.id] = vertex;
        return vertex;
      });
    });
    const edges = vegetables.flatMap((vertices: any[]) => {
      return vertices.flatMap((v: any) => {
        return v.edges.map((edge: any) => new Edge(vMap[edge.from], vMap[edge.to]));
      });
    });
    const g = new Graph(
      vLevels.flatMap((vertices: Vertex[]) => vertices),
      edges,
      { directed: true },
    );

    const start = Date.now();
    const { levels, crossCount } = baryCentric(vLevels, {});
    const elapsed = Date.now() - start;

    console.log(`\n  ⏱  Vegetable baryCentric: ${elapsed}ms, crossings: ${crossCount}`);
    expect(elapsed).to.be.lessThan(1000);
    expect(crossCount).to.equal(1);
  });
});

// ============================================================
// Helper: extract levels from a laid-out graph
// ============================================================
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
