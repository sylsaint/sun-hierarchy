import { expect } from 'chai';
import Graph, { Vertex, Edge } from '../misc/graph';
import { Sugiyama } from '../algos/sugiyama'

describe('Sugiyama layout 3', () => {
  let vertices: Array<Vertex> = [];
  for (let i: number = 0; i < 21; i++) {
    vertices.push(new Vertex(i));
  }
  // a, b, c, d, e, f, g, h, i, j,  k,  l
  // 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11
  let edges: Array<Edge> = [];
  edges.push(new Edge(vertices[0], vertices[1]));
  edges.push(new Edge(vertices[0], vertices[2]));
  edges.push(new Edge(vertices[0], vertices[11]));
  edges.push(new Edge(vertices[0], vertices[12]));
  edges.push(new Edge(vertices[0], vertices[15]));
  edges.push(new Edge(vertices[0], vertices[16]));
  edges.push(new Edge(vertices[0], vertices[17]));
  edges.push(new Edge(vertices[0], vertices[18]));
  edges.push(new Edge(vertices[0], vertices[19]));
  edges.push(new Edge(vertices[2], vertices[3]));
  edges.push(new Edge(vertices[2], vertices[4]));
  edges.push(new Edge(vertices[2], vertices[5]));
  edges.push(new Edge(vertices[2], vertices[6]));
  edges.push(new Edge(vertices[2], vertices[7]));
  edges.push(new Edge(vertices[2], vertices[8]));
  edges.push(new Edge(vertices[2], vertices[9]));
  edges.push(new Edge(vertices[2], vertices[10]));
  edges.push(new Edge(vertices[3], vertices[11]));
  edges.push(new Edge(vertices[5], vertices[12]));
  edges.push(new Edge(vertices[5], vertices[13]));
  edges.push(new Edge(vertices[5], vertices[14]));
  edges.push(new Edge(vertices[6], vertices[15]));
  edges.push(new Edge(vertices[7], vertices[16]));
  edges.push(new Edge(vertices[8], vertices[17]));
  edges.push(new Edge(vertices[9], vertices[18]));
  edges.push(new Edge(vertices[10], vertices[19]));
  edges.push(new Edge(vertices[10], vertices[20]));


  const g: Graph = new Graph(vertices, edges, { directed: true });
  let sug: Sugiyama = new Sugiyama();
  it('#layout', () => {
    const graphs: Array<Graph> = sug.layout(g);
    /*
    graphs.map(g => {
      console.log('***** vertices *****', g.vertices.length);
      console.log(
        g.vertices.map(v => `${v.id}: level[${v.getOptions('y')}], x[${v.getOptions('x')}]`).join('\n'),
      );
    });
    */
    expect(graphs.length).to.equal(1);
  })
});
