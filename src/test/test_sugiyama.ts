import { expect } from 'chai';
import Graph, { Vertex, Edge } from '@/interface/graph';
import { layout } from '@/algos/sugiyama';

describe('Sugiyama layout with 5 vertices and 4 edges', () => {
  const vertices: Array<Vertex> = [];
  for (let i: number = 0; i < 5; i++) {
    vertices.push(new Vertex(i));
  }
  const edges: Array<Edge> = [];
  edges.push(new Edge(vertices[0], vertices[1]));
  edges.push(new Edge(vertices[0], vertices[3]));
  edges.push(new Edge(vertices[1], vertices[2]));
  edges.push(new Edge(vertices[2], vertices[3]));

  const g: Graph = new Graph(vertices, edges, { directed: true });
  it('#layout should merge components by default', () => {
    const graphs: Array<Graph> = layout(g);
    expect(graphs.length).to.equal(1);
    // All vertices should be in the single merged graph
    expect(graphs[0].vertices.length).to.be.greaterThanOrEqual(vertices.length);
  });

  it('#layout should split components when mergeComponents is false', () => {
    const graphs: Array<Graph> = layout(g, { width: 100, height: 50, mergeComponents: false });
    expect(graphs.length).to.equal(2);
  });
});
