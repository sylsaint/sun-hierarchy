import { expect } from 'chai';
import { findSccs } from '../path/tarjan';
import { Graph, Vertex } from '../path/graph';

describe('find sccs', () => {
  const v0: Vertex = new Vertex(0);
  const v1: Vertex = new Vertex(1);
  const v2: Vertex = new Vertex(2);
  const v3: Vertex = new Vertex(3);
  const v4: Vertex = new Vertex(4);
  const v5: Vertex = new Vertex(5);
  const v6: Vertex = new Vertex(6);
  const v7: Vertex = new Vertex(7);
  v0.setNeighbours([v1]);
  v1.setNeighbours([v2]);
  v2.setNeighbours([v0]);
  v3.setNeighbours([v4, v7]);
  v4.setNeighbours([v5]);
  v5.setNeighbours([v0, v6]);
  v6.setNeighbours([v0, v2, v4]);
  v7.setNeighbours([v3, v5]);
  const graph: Graph = new Graph([v0, v1, v2, v3, v4, v5, v6, v7]);
  it('#test case 1', () => {
    const sccs: Vertex[][] = findSccs(graph);
    expect(sccs.length).equal(3);
    sccs.forEach((scc: Vertex[]) => {
      console.log(scc.map(v => v.id));
    })
  });
});
