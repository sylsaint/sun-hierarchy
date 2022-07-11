import { expect } from 'chai';
import { topologicalSort } from '../path/topo';
import { Graph, Vertex } from "../path/graph";

describe('Topological sort', () => {
    const v1: Vertex = new Vertex(1);
    const v2: Vertex = new Vertex(2);
    const v3: Vertex = new Vertex(3);
    const v4: Vertex = new Vertex(4);
    const v5: Vertex = new Vertex(5);
    const v6: Vertex = new Vertex(6);
    const v7: Vertex = new Vertex(7);
    v1.setNeighbours([v3]);
    v2.setNeighbours([v3]);
    v3.setNeighbours([v4]);
    v4.setNeighbours([v5, v6]);
    v6.setNeighbours([v7]);
    const graph: Graph = new Graph([v1, v2, v3, v4, v5, v6, v7]);
  it('#sort', () => {
      const vertice: Vertex[]  = topologicalSort(graph);
      vertice.forEach(v => {
          console.log(v.id);
      })
  });
});

