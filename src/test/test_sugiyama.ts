import { expect } from 'chai';
import Graph, { Vertex, Edge } from '../misc/graph';
import { Sugiyama } from '../algos/sugiyama';

describe('Sugiyama', () => {
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
  let sug: Sugiyama = new Sugiyama();
  it('#layout', () => {
    const graphs: Array<Graph> = sug.layout(g);
    /*
    graphs.map(g => {
      console.log('***** vertices *****', g.vertices.length);
      console.log(
        g.vertices.map(v => `${v.id}: ${v.getOptions('y')}, ${v.getOptions('x')}`).join('\n'),
      );
    });
    */
    expect(graphs.length).to.equal(2);
  });
});
