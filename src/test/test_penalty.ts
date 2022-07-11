import { expect } from 'chai';
import Graph, { Vertex, Edge } from '../misc/graph';
import { penaltyGraph, crossCount } from '../misc/penaltyGraph';
import { kosaraju } from '../algos/kosaraju';
import { findVertexById } from '../misc/graphUtil';
import { pm } from '../algos/penalty';

describe('Penalty', () => {
  let vertices: Array<Vertex> = [];
  for (let i: number = 0; i < 8; i++) {
    vertices.push(new Vertex(i));
  }
  for (let i: number = 8; i < 16; i++) {
    vertices.push(new Vertex(i));
  }
  // a, b, c, d, e, f, g, h
  // 8, 9, 10,11,12,13,14,15
  let edges: Array<Edge> = [];
  edges.push(new Edge(vertices[0], vertices[10]));
  edges.push(new Edge(vertices[0], vertices[11]));
  edges.push(new Edge(vertices[0], vertices[12]));
  edges.push(new Edge(vertices[0], vertices[15]));
  edges.push(new Edge(vertices[1], vertices[10]));
  edges.push(new Edge(vertices[1], vertices[12]));
  edges.push(new Edge(vertices[2], vertices[8]));
  edges.push(new Edge(vertices[2], vertices[12]));
  edges.push(new Edge(vertices[2], vertices[13]));
  edges.push(new Edge(vertices[2], vertices[15]));
  edges.push(new Edge(vertices[3], vertices[12]));
  edges.push(new Edge(vertices[4], vertices[10]));
  edges.push(new Edge(vertices[4], vertices[14]));
  edges.push(new Edge(vertices[5], vertices[13]));
  edges.push(new Edge(vertices[6], vertices[9]));
  edges.push(new Edge(vertices[6], vertices[11]));
  edges.push(new Edge(vertices[7], vertices[9]));
  edges.push(new Edge(vertices[7], vertices[13]));
  edges.push(new Edge(vertices[7], vertices[14]));

  const g: Graph = new Graph(vertices, edges, { directed: true });
  const W: Array<Vertex> = vertices.slice(0, 8);
  const nLevel: Array<Vertex> = vertices.slice(8, 16);

  it('#SCC - penalty', () => {
    expect(vertices.length).to.equal(16);
    expect(edges.length).to.equal(19);
  });
  it('#SCC - cycles', () => {
    const dig: Graph = penaltyGraph(W, nLevel);
    const sccs: any = kosaraju(dig);
    const sigmas: Array<Array<Vertex>> = pm(sccs, dig);
    // console.log('== print all the reorder cross count ==');
    // console.log('original cross: ', crossCount(W, nLevel));
    sigmas.map(sigma => {
      // console.log(sigma.map(v => v.id + 1).join(','));
      const reorder: Array<Vertex> = sigma.map(v => findVertexById(g, v.id));
      const totalCross: number = crossCount(reorder, nLevel);
      // console.log('cross count: ', totalCross);
    });
  });
});
