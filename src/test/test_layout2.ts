import { expect } from 'chai';
import Graph, { Vertex, Edge } from '../misc/graph';
import { crossCount } from '../misc/penaltyGraph';
import { penaltyMethod } from '../algos/penaltymethod';
import { position } from '../algos/prioritylayout';

describe('Position layout 2', () => {
  let vertices: Array<Vertex> = [];
  for (let i: number = 0; i < 17; i++) {
    vertices.push(new Vertex(i));
  }
  // a, b, c, d, e, f, g, h, i, j,  k,  l
  // 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11
  let edges: Array<Edge> = [];
  edges.push(new Edge(vertices[0], vertices[3]));
  edges.push(new Edge(vertices[0], vertices[7]));
  edges.push(new Edge(vertices[0], vertices[8]));
  edges.push(new Edge(vertices[1], vertices[2]));
  edges.push(new Edge(vertices[1], vertices[4]));
  edges.push(new Edge(vertices[1], vertices[9]));
  edges.push(new Edge(vertices[2], vertices[6]));
  edges.push(new Edge(vertices[3], vertices[5]));
  edges.push(new Edge(vertices[5], vertices[7]));
  edges.push(new Edge(vertices[5], vertices[8]));
  edges.push(new Edge(vertices[6], vertices[9]));

  const g: Graph = new Graph(vertices, edges, { directed: true });
  let nLevels: Array<Array<Vertex>> = [];
  const levelNumber: Array<number> = [0, 2, 5, 7, 10]

  levelNumber.map((v, idx) => {
    if (idx === levelNumber.length - 1) return;
    nLevels[idx] = [];
    for (let i: number = v; i < levelNumber[idx + 1]; i++) {
      nLevels[idx].push(vertices[i])
    }
  })
  it('#layout', () => {
    // console.log(nLevels);
    position(g, nLevels);
    // console.log('nlevels position...');
    nLevels.map((level, idx) => {
      // console.log('level ', idx + 1);
      level.map(v => {
        // console.log(`${v.id}: ${v.getOptions('x')}, ${v.getOptions('y')}`);
      })
    })
  });
});
