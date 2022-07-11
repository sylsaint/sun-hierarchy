import { expect } from 'chai';
import Graph, { Vertex, Edge } from '../misc/graph';
import { kosaraju } from '../algos/kosaraju';

describe('SCCS', () => {
  let vertices: Array<Vertex> = [];
  for (let i: number = 0; i < 5; i++) {
    vertices.push(new Vertex(i));
  }
  let edges: Array<Edge> = [];
  edges.push(new Edge(vertices[0], vertices[3]));
  edges.push(new Edge(vertices[3], vertices[4]));
  edges.push(new Edge(vertices[1], vertices[0]));
  edges.push(new Edge(vertices[0], vertices[2]));
  edges.push(new Edge(vertices[2], vertices[1]));

  const g: Graph = new Graph(vertices, edges, { directed: true });

  it('#SCC - kosaraju', () => {
    expect(vertices.length).to.equal(5);
    expect(edges.length).to.equal(5);
    // const tree: any = kosaraju(g);
  });
});
