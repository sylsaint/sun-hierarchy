import { expect } from 'chai';
import Graph, { Vertex, Edge } from '@/interface/graph';
import { layout } from '@/algos/sugiyama';
import { data } from './data/data1';

describe('Sugiyama layout 6', () => {
  const vertices: Array<Vertex> = [];
  const verticeMap: { [key: string | number]: Vertex } = {};
  data.tasks.map(task => {
    const vertice = new Vertex(task.taskId);
    vertices.push(vertice);
    verticeMap[task.taskId] = vertice;
  })

  const edges: Array<Edge> = [];
  data.links.map(link => {
    edges.push(new Edge(verticeMap[link.taskFrom], verticeMap[link.taskTo]));
  })

  const g: Graph = new Graph(vertices, edges, { directed: true });
  it('#layout', () => {
    const graphs: Array<Graph> = layout(g);
    graphs.map(g => {
      console.log('***** vertices *****', g.vertices.length);
      console.log(
        g.vertices.map(v => `${v.id}: level[${v.getOptions('y')}], x[${v.getOptions('x')}]`).join('\n'),
      );
    });
  })
});
