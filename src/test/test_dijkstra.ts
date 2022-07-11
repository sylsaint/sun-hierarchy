import { expect } from 'chai';
import { dijkstraShortestPath } from '../path/dijkstra';
import { Vertex, Edge } from '../path/graph';

describe('Dijkstra shortest path', () => {
  const v1: Vertex = new Vertex(1); // A
  const v2: Vertex = new Vertex(2); // B
  const v3: Vertex = new Vertex(3); // C
  const v4: Vertex = new Vertex(4); // D
  const v5: Vertex = new Vertex(5); // E
  const v6: Vertex = new Vertex(6); // F
  const v7: Vertex = new Vertex(7); // G
  const v8: Vertex = new Vertex(8); // H
  v1.setEdges([new Edge(v2, 3), new Edge(v3, 6)]);
  v2.setEdges([new Edge(v3, 4), new Edge(v4, 4), new Edge(v5, 11)]);
  v3.setEdges([new Edge(v4, 8), new Edge(v7, 11)]);
  v4.setEdges([new Edge(v5, -4), new Edge(v6, 5), new Edge(v7, 2)]);
  v5.setEdges([new Edge(v8, 9)]);
  v6.setEdges([new Edge(v8, 1)]);
  v7.setEdges([new Edge(v8, 2)]);

  it('#path list', () => {
      const r = dijkstraShortestPath(v1, v8);
      console.log(r);
  });
  
});


