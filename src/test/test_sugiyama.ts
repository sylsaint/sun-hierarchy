import { expect } from 'chai';
import Graph, { Vertex, Edge } from '@/interface/graph';
import { layout } from '@/algos/sugiyama';

describe('Sugiyama layout with 5 vertices and 4 edges', () => {
  let vertices: Array<Vertex> = [];
  for (let i: number = 0; i < 5; i++) {
    vertices.push(new Vertex(i));
  }
  let edges: Array<Edge> = [];
  edges.push(new Edge(vertices[0], vertices[1]));
  edges.push(new Edge(vertices[0], vertices[3]));
  edges.push(new Edge(vertices[1], vertices[2]));
  edges.push(new Edge(vertices[2], vertices[3]));

  const g: Graph = new Graph(vertices, edges, { directed: true });
  it('#layout', () => {
    const graphs: Array<Graph> = layout(g);
    expect(graphs.length).to.equal(2);
  });
});
