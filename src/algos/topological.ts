import Graph, { Vertex, Edge } from '../misc/graph';

export function kahn(g: Graph) {
  let roots: Array<Vertex> = [];
  // find all the roots without incoming edges
  g.vertices.map(v => {
    let isRoot: boolean = true;
    v.edges.map(edge => {
      if (edge.down == v) isRoot = false;
    });
    if (isRoot) roots.push(v);
  });
  let visited = [];
  let hasCycle: boolean = false;
  while (roots.length) {
    const node: Vertex = roots.shift() as Vertex;
    if (visited.indexOf(node) > -1) {
      hasCycle = true;
      break;
    }
    visited.push(node);
    let exclude: Array<Edge> = [];
    node.edges.map(edge => {
      const down: Vertex = edge.down;
      exclude.push(edge);
      let only: boolean = true;
      // check if there are other incomming edges
      down.edges.map(edge => {
        if (edge.up != node && edge.down == down) only = false;
      });
      if (only) roots.push(down);
    });
    exclude.map(edge => g.removeEdge(edge));
  }
  if (hasCycle) {
    throw new Error('There are cycles in the graph!');
  }
  return visited;
}
