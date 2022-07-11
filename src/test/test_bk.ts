import { expect } from 'chai';
import Graph, { Vertex, Edge } from '../misc/graph';
import { markConflicts, alignVertices, brandeskopf } from '../algos/brandeskopf';
import { DUMMY } from '../misc/constant';
import { printVertices } from '../misc/graphUtil';

describe('Position layout bk new', () => {
  let vertices: Array<Vertex> = [];
  for (let i: number = 0; i < 26; i++) {
    vertices.push(new Vertex(i));
  }

  // set dummy vertices
  vertices[4].setOptions('type', DUMMY);
  vertices[6].setOptions('type', DUMMY);
  vertices[7].setOptions('type', DUMMY);
  vertices[12].setOptions('type', DUMMY);
  vertices[13].setOptions('type', DUMMY);
  vertices[14].setOptions('type', DUMMY);
  vertices[18].setOptions('type', DUMMY);
  vertices[19].setOptions('type', DUMMY);
  vertices[20].setOptions('type', DUMMY);
  vertices[22].setOptions('type', DUMMY);
  // a, b, c, d, e, f, g, h, i, j,  k,  l
  // 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11
  let edges: Array<Edge> = [];
  edges.push(new Edge(vertices[0], vertices[2]));
  edges.push(new Edge(vertices[0], vertices[7]));
  edges.push(new Edge(vertices[0], vertices[9]));
  edges.push(new Edge(vertices[1], vertices[4]));
  edges.push(new Edge(vertices[1], vertices[6]));

  edges.push(new Edge(vertices[3], vertices[11]));
  edges.push(new Edge(vertices[4], vertices[11]));
  edges.push(new Edge(vertices[5], vertices[11]));
  edges.push(new Edge(vertices[6], vertices[12]));
  edges.push(new Edge(vertices[7], vertices[13]));
  edges.push(new Edge(vertices[8], vertices[11]));
  edges.push(new Edge(vertices[8], vertices[15]));
  edges.push(new Edge(vertices[9], vertices[11]));
  edges.push(new Edge(vertices[9], vertices[14]));

  edges.push(new Edge(vertices[10], vertices[16]));
  edges.push(new Edge(vertices[10], vertices[17]));
  edges.push(new Edge(vertices[10], vertices[21]));
  edges.push(new Edge(vertices[12], vertices[19]));
  edges.push(new Edge(vertices[13], vertices[20]));
  edges.push(new Edge(vertices[14], vertices[21]));
  edges.push(new Edge(vertices[15], vertices[18]));
  edges.push(new Edge(vertices[15], vertices[22]));

  edges.push(new Edge(vertices[16], vertices[23]));
  edges.push(new Edge(vertices[16], vertices[24]));
  edges.push(new Edge(vertices[17], vertices[24]));
  edges.push(new Edge(vertices[18], vertices[23]));
  edges.push(new Edge(vertices[19], vertices[25]));
  edges.push(new Edge(vertices[20], vertices[25]));
  edges.push(new Edge(vertices[21], vertices[25]));
  edges.push(new Edge(vertices[22], vertices[25]));

  const g: Graph = new Graph(vertices, edges, { directed: true });
  let nLevels: Array<Array<Vertex>> = [];
  const levelNumber: Array<number> = [0, 2, 10, 16, 23, 26];

  levelNumber.map((v, idx) => {
    if (idx === levelNumber.length - 1) return;
    nLevels[idx] = [];
    for (let i: number = v; i < levelNumber[idx + 1]; i++) {
      nLevels[idx].push(vertices[i]);
    }
  });
  it('should mark conflicts correctly', () => {
    const conflicts = markConflicts(nLevels);
  });
  it('should align correctly', () => {
    const conflicts = markConflicts(nLevels);
    const { root, align } = alignVertices(nLevels, { conflicts });
  });
  it('should brandeskopf correctly', () => {
    // brandeskopf(nLevels, { width: 100, height: 20, gutter: 5, padding: { left: 0, top: 0, right: 0, bottom: 0 } });
  });
  it('should brandeskopf correctly with 7 nodes', () => {
    let vertices: Array<Vertex> = [];
    for (let i = 0; i <= 7; i++) {
      vertices.push(new Vertex(i));
    }
    let edges: Array<Edge> = [];
    edges.push(new Edge(vertices[1], vertices[2]));
    edges.push(new Edge(vertices[1], vertices[7]));
    edges.push(new Edge(vertices[2], vertices[3]));
    edges.push(new Edge(vertices[2], vertices[6]));
    edges.push(new Edge(vertices[4], vertices[3]));
    edges.push(new Edge(vertices[4], vertices[6]));
    edges.push(new Edge(vertices[5], vertices[2]));
    edges.push(new Edge(vertices[5], vertices[4]));
    const g: Graph = new Graph(vertices.slice(1), edges, { directed: true });
    const levels = [
      [vertices[1], vertices[5]],
      [vertices[7], vertices[2], vertices[4]],
      [vertices[3], vertices[6]],
    ];
    const sortLevels: Vertex[][] = brandeskopf(levels, {
      width: 100,
      height: 20,
      gutter: 5,
      padding: { left: 0, top: 0, right: 0, bottom: 0 },
    });
    for (let i = 0; i < sortLevels.length; i++) {
      console.log(sortLevels[i].map((v) => `${v.id}: ${v.getOptions('x')}`).join(' , '));
    }
  });
  it('should brandeskopf correctly with tvision nodes', () => {
    let vertices: Array<Vertex> = [];
    for (let i = 0; i <= 11; i++) {
      vertices.push(new Vertex(i));
    }
    vertices[0].setOptions('dummpy', true);
    let edges: Array<Edge> = [];
    edges.push(new Edge(vertices[1], vertices[3]));
    edges.push(new Edge(vertices[3], vertices[4]));
    edges.push(new Edge(vertices[3], vertices[5]));
    edges.push(new Edge(vertices[3], vertices[6]));
    edges.push(new Edge(vertices[3], vertices[7]));
    edges.push(new Edge(vertices[3], vertices[8]));
    edges.push(new Edge(vertices[4], vertices[9]));
    edges.push(new Edge(vertices[5], vertices[10]));
    edges.push(new Edge(vertices[5], vertices[0]));
    edges.push(new Edge(vertices[0], vertices[11]));
    edges.push(new Edge(vertices[10], vertices[11]));
    const g: Graph = new Graph(vertices, edges, { directed: true });
    const levels = [
      [vertices[1], vertices[2]],
      [vertices[3]],
      [vertices[4], vertices[5], vertices[6], vertices[7], vertices[8]],
      [vertices[9], vertices[10], vertices[0]],
      [vertices[11]],
    ];
    const sortLevels: Vertex[][] = brandeskopf(levels, {
      width: 100,
      height: 20,
      gutter: 5,
      padding: { left: 0, top: 0, right: 0, bottom: 0 },
    });
    for (let i = 0; i < sortLevels.length; i++) {
      console.log(sortLevels[i].map((v) => `${v.id}: ${v.getOptions('x')}`).join(' , '));
    }
    printVertices(sortLevels);
  });
  it('Should do right layout', () => {
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
    edges.push(new Edge(vertices[7], vertices[0]));
    edges.push(new Edge(vertices[0], vertices[3]));
    edges.push(new Edge(vertices[7], vertices[9]));
    edges.push(new Edge(vertices[8], vertices[5]));
  
  
    const g: Graph = new Graph(vertices, edges, { directed: true });
    const levels = [
      [vertices[1], vertices[8], vertices[7]],
      [vertices[4], vertices[5], vertices[0], vertices[9], vertices[6]],
      [vertices[3], vertices[2]],
    ];
    const sortLevels: Vertex[][] = brandeskopf(levels, {
      width: 100,
      height: 20,
      gutter: 5,
      padding: { left: 0, top: 0, right: 0, bottom: 0 },
    });
    for (let i = 0; i < sortLevels.length; i++) {
      console.log(sortLevels[i].map((v) => `${v.id}: ${v.getOptions('x')}`).join(' , '));
    }
    printVertices(sortLevels);
  })
});
