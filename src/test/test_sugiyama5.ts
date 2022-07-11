import { expect } from 'chai';
import Graph, { Vertex, Edge } from '../misc/graph';
import { Sugiyama } from '../algos/sugiyama'

describe('Sugiyama layout 5', () => {
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
