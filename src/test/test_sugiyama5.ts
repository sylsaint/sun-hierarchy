import { expect } from 'chai';
import Graph, { Vertex, Edge } from '@/interface/graph';
import { layout } from '@/algos/sugiyama'

describe('Sugiyama layout with 10 vertices', () => {
  let vertices: Array<Vertex> = [];
  for (let i: number = 0; i < 10; i++) {
    vertices.push(new Vertex(i));
  }
  // a, b, c, d, e, f, g, h, i, j,  k,  l
  // 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11
  let edges: Array<Edge> = [];
  edges.push(new Edge(vertices[1], vertices[4]));
  edges.push(new Edge(vertices[1], vertices[5]));
  edges.push(new Edge(vertices[4], vertices[3]));
  edges.push(new Edge(vertices[5], vertices[2]));
  edges.push(new Edge(vertices[6], vertices[2]));
  edges.push(new Edge(vertices[7], vertices[3]));
  edges.push(new Edge(vertices[7], vertices[9]));
  edges.push(new Edge(vertices[8], vertices[5]));


  const g: Graph = new Graph(vertices.slice(1), edges, { directed: true });
  it('#layout', () => {
    const graphs: Array<Graph> = layout(g);
    expect(graphs.length).to.equal(1);
  })
});
