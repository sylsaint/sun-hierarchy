import { expect } from 'chai';
import Graph, { Vertex, Edge } from '../misc/graph';
import { crossCount } from '../misc/penaltyGraph';
import { penaltyMethod } from '../algos/penaltymethod';
import { makeHierarchy } from '../algos/hierarchy';

describe('Hierarchy', () => {
  let vertices: Array<Vertex> = [];
  let alpha: Array<string> = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l'];
  for (let i: number = 0; i < 12; i++) {
    vertices.push(new Vertex(i));
  }
  // a, b, c, d, e, f, g, h, i, j,  k,  l
  // 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11
  let edges: Array<Edge> = [];
  edges.push(new Edge(vertices[0], vertices[4]));
  edges.push(new Edge(vertices[1], vertices[3]));
  edges.push(new Edge(vertices[2], vertices[3]));
  edges.push(new Edge(vertices[3], vertices[6]));
  edges.push(new Edge(vertices[4], vertices[6]));
  edges.push(new Edge(vertices[4], vertices[7]));
  edges.push(new Edge(vertices[4], vertices[8]));
  edges.push(new Edge(vertices[5], vertices[7]));
  edges.push(new Edge(vertices[6], vertices[11]));
  edges.push(new Edge(vertices[7], vertices[9]));
  edges.push(new Edge(vertices[7], vertices[10]));

  const g: Graph = new Graph(vertices, edges, { directed: true });
  it('#generate', () => {
    makeHierarchy(g);
  });
});
