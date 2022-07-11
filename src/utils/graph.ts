import Graph, { Vertex, Edge } from '@/interface/graph';
import { uuidv4 } from '@/utils/uuid';

// in-place transpose edge direction
export function transpose(g: Graph): Graph {
  g.edges.map((edge) => {
    const v: Vertex = edge.down;
    edge.down = edge.up;
    edge.up = v;
  });
  return g;
}

export function findVertexById(g: Graph, vid: number | string): Vertex | null {
  let found = null;
  g.vertices.map((v) => {
    if (v.id === vid) found = v;
  });
  return found;
}

export function cloneGraph(g: Graph): Graph {
  let replica: Graph = new Graph([], [], { directed: true });
  // clone W to Graph pg
  g.vertices.map((v) => {
    replica.addVertex(new Vertex(v.id));
  });
  g.edges.map((edge) => {
    const upVertex = findVertexById(replica, edge.up.id);
    const downVertex = findVertexById(replica, edge.down.id);
    if (upVertex && downVertex) {
      replica.addEdge(new Edge(upVertex, downVertex));
    }
  });
  return replica;
}

export function printVertexNeighbours(g: Graph) {
  console.log('== print incident edges of vertex ==');
  g.vertices.map((v) => {
    let ups: Array<number> = [];
    let downs: Array<number> = [];
    v.edges.map((edge) => {
      if (edge.up == v) downs.push((edge.down.id as number) + 1);
      if (edge.down == v) ups.push((edge.up.id as number) + 1);
    });
    console.log(ups.join(','), '->', (v.id as number) + 1, '->', downs.join(','));
  });
}

export function getDummyId() {
  return uuidv4();
}

export function printVertices(levels: Vertex[][]) {
  let maxWidth = 0;
  levels
    .flatMap((vertices) => vertices)
    .map((v) => {
      if (v.getOptions('x') > maxWidth) maxWidth = v.getOptions('x');
    });
  levels.map((vertices) => {
    let formatted = '';
    vertices.map((v, idx) => {
      if (idx === 0) {
        const spaces = (v.getOptions('x') * 50) / maxWidth;
        for (let i = 0; i < spaces; i++) {
          formatted += ' ';
        }
      } else {
        const spaces = ((v.getOptions('x') - vertices[idx - 1].getOptions('x')) * 50) / maxWidth || 1;
        for (let i = 0; i < spaces; i++) {
          formatted += ' ';
        }
      }
      formatted += v.id;
    });
    console.log(formatted + '\n');
  });
}
