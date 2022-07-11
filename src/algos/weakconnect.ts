import Graph, { Vertex, Edge } from '@/interface/graph';
import { HashMap } from '@/interface/definition';

export function divide(g: Graph): Graph[] {
  let graphs: Graph[] = [];
  let visited: HashMap = {};
  g.vertices.map((v) => {
    if (!visited[v.id]) {
      visited[v.id] = v;
      let vertices: Vertex[] = [v];
      let edges: Edge[] = [];
      let nodes: Vertex[] = [v];
      while (nodes.length) {
        const node: Vertex = nodes.shift() as Vertex;
        node.edges.map((edge) => {
          edges.indexOf(edge) < 0 && edges.push(edge);
          if (edge.up == node && !visited[edge.down.id]) {
            visited[edge.down.id] = edge.down;
            nodes.push(edge.down);
            vertices.push(edge.down);
          }
          if (edge.down == node && !visited[edge.up.id]) {
            visited[edge.up.id] = edge.up;
            nodes.push(edge.up);
            vertices.push(edge.up);
          }
        });
      }
      let wg: Graph = new Graph(vertices, edges, { directed: true });
      graphs.push(wg);
    }
  });
  return graphs;
}
