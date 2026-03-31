import { expect } from 'chai';
import Graph, { Vertex, Edge } from '@/interface/graph';
import { layout } from '@/algos/sugiyama';
import { printLayoutResult, printPositionTable } from '@/utils/printer';
import { saveSvg } from './helpers/svg';

/**
 * Test case for multi-parent node positioning optimization.
 * Verifies that nodes with multiple parents/ancestors are placed
 * at optimal positions (centered between their parents).
 */
describe('Sugiyama layout - multi-parent node optimization', () => {
  /**
   * Diamond pattern: node D has two parents B and C
   *     A
   *    / \
   *   B   C
   *    \ /
   *     D
   */
  it('should center a node between its two parents (diamond)', () => {
    const vertices: Vertex[] = [];
    for (let i = 0; i < 4; i++) {
      vertices.push(new Vertex(i));
    }
    const edges: Edge[] = [
      new Edge(vertices[0], vertices[1]), // A -> B
      new Edge(vertices[0], vertices[2]), // A -> C
      new Edge(vertices[1], vertices[3]), // B -> D
      new Edge(vertices[2], vertices[3]), // C -> D
    ];
    const g = new Graph(vertices, edges, { directed: true });
    const graphs = layout(g, { width: 100, height: 50, gutter: 20 });
    expect(graphs.length).to.equal(1);

    printLayoutResult(getLevelsFromGraph(graphs[0]), 'Diamond: A→B,C→D');
    saveSvg(getLevelsFromGraph(graphs[0]), 'mp_diamond', 'Multi-parent Diamond: A→B,C→D');

    // D should be positioned between B and C
    const [A, B, C, D] = vertices;
    const bx = B.getOptions('x');
    const cx = C.getOptions('x');
    const dx = D.getOptions('x');
    const midpoint = (bx + cx) / 2;
    // D's x should be close to the midpoint of B and C
    expect(Math.abs(dx - midpoint)).to.be.lessThan(
      Math.abs(cx - bx) * 0.5 + 1,
      `D(x=${dx}) should be near midpoint(${midpoint}) of B(x=${bx}) and C(x=${cx})`,
    );
  });

  /**
   * Multiple ancestors converging:
   *   A   B   C
   *    \ | /
   *     D
   *     |
   *     E
   */
  it('should center a node with 3 parents', () => {
    const vertices: Vertex[] = [];
    for (let i = 0; i < 5; i++) {
      vertices.push(new Vertex(i));
    }
    const edges: Edge[] = [
      new Edge(vertices[0], vertices[3]), // A -> D
      new Edge(vertices[1], vertices[3]), // B -> D
      new Edge(vertices[2], vertices[3]), // C -> D
      new Edge(vertices[3], vertices[4]), // D -> E
    ];
    const g = new Graph(vertices, edges, { directed: true });
    const graphs = layout(g, { width: 100, height: 50, gutter: 20 });
    expect(graphs.length).to.equal(1);

    printLayoutResult(getLevelsFromGraph(graphs[0]), '3 Parents → D → E');
    saveSvg(getLevelsFromGraph(graphs[0]), 'mp_3_parents', '3 Parents → D → E');

    const [A, B, C, D, E] = vertices;
    const parentXs = [A.getOptions('x'), B.getOptions('x'), C.getOptions('x')].sort((a, b) => a - b);
    const dx = D.getOptions('x');
    // D should be within the range of its parents
    expect(dx).to.be.at.least(parentXs[0], 'D should not be left of leftmost parent');
    expect(dx).to.be.at.most(parentXs[2], 'D should not be right of rightmost parent');
  });

  /**
   * Complex multi-parent with long edges:
   *   A       B
   *   |       |
   *   C       D
   *    \     /
   *      E
   *      |
   *      F
   */
  it('should handle multi-parent with intermediate levels', () => {
    const vertices: Vertex[] = [];
    for (let i = 0; i < 6; i++) {
      vertices.push(new Vertex(i));
    }
    const edges: Edge[] = [
      new Edge(vertices[0], vertices[2]), // A -> C
      new Edge(vertices[1], vertices[3]), // B -> D
      new Edge(vertices[2], vertices[4]), // C -> E
      new Edge(vertices[3], vertices[4]), // D -> E
      new Edge(vertices[4], vertices[5]), // E -> F
    ];
    const g = new Graph(vertices, edges, { directed: true });
    const graphs = layout(g, { width: 100, height: 50, gutter: 20 });
    expect(graphs.length).to.equal(1);

    printLayoutResult(getLevelsFromGraph(graphs[0]), 'Multi-parent: C,D→E→F');
    saveSvg(getLevelsFromGraph(graphs[0]), 'mp_intermediate', 'Multi-parent: C,D→E→F');

    const [A, B, C, D, E, F] = vertices;
    const cx = C.getOptions('x');
    const ddx = D.getOptions('x');
    const ex = E.getOptions('x');
    const midpoint = (cx + ddx) / 2;
    // E should be reasonably centered between C and D
    expect(Math.abs(ex - midpoint)).to.be.lessThan(
      Math.abs(ddx - cx) * 0.5 + 1,
      `E(x=${ex}) should be near midpoint(${midpoint}) of C(x=${cx}) and D(x=${ddx})`,
    );
  });

  /**
   * Connected graph with shared descendants:
   *     A
   *    / \
   *   B   C
   *  /|   |\
   * D  E  F  G
   *  \ | / \ /
   *    H    I
   */
  it('should handle connected graph with multiple shared descendants', () => {
    const vertices: Vertex[] = [];
    for (let i = 0; i < 9; i++) {
      vertices.push(new Vertex(i));
    }
    // A=0, B=1, C=2, D=3, E=4, F=5, G=6, H=7, I=8
    const edges: Edge[] = [
      new Edge(vertices[0], vertices[1]), // A -> B
      new Edge(vertices[0], vertices[2]), // A -> C
      new Edge(vertices[1], vertices[3]), // B -> D
      new Edge(vertices[1], vertices[4]), // B -> E
      new Edge(vertices[2], vertices[5]), // C -> F
      new Edge(vertices[2], vertices[6]), // C -> G
      new Edge(vertices[3], vertices[7]), // D -> H
      new Edge(vertices[4], vertices[7]), // E -> H
      new Edge(vertices[5], vertices[7]), // F -> H
      new Edge(vertices[5], vertices[8]), // F -> I
      new Edge(vertices[6], vertices[8]), // G -> I
    ];
    const g = new Graph(vertices, edges, { directed: true });
    const graphs = layout(g, { width: 100, height: 50, gutter: 20 });
    expect(graphs.length).to.equal(1);

    printLayoutResult(getLevelsFromGraph(graphs[0]), 'Shared Descendants: D,E,F→H, F,G→I');
    printPositionTable(getLevelsFromGraph(graphs[0]));
    saveSvg(getLevelsFromGraph(graphs[0]), 'mp_shared_descendants', 'Shared Descendants: D,E,F→H, F,G→I');

    // H has parents D, E, F - should be within their range
    const dx = vertices[3].getOptions('x');
    const ex = vertices[4].getOptions('x');
    const ffx = vertices[5].getOptions('x');
    const hx = vertices[7].getOptions('x');
    const parentMin = Math.min(dx, ex, ffx);
    const parentMax = Math.max(dx, ex, ffx);
    expect(hx).to.be.at.least(parentMin, 'H should be within parent range');
    expect(hx).to.be.at.most(parentMax, 'H should be within parent range');
  });
});

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
