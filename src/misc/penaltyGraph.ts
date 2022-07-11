import Graph, { Vertex, Edge } from './graph';
import { findVertexById } from './graphUtil';

function penalty(u: Vertex, v: Vertex, nLevel: Array<Vertex>): number {
  return cross(v, u, nLevel) - cross(u, v, nLevel);
}

function cross(u: Vertex, v: Vertex, nLevel: Array<Vertex>): number {
  let crossCnt: number = 0;
  u.edges.map(ue => {
    if (ue.up == u && nLevel.indexOf(ue.down) > -1) {
      v.edges.map(ve => {
        if (ve.up == v && nLevel.indexOf(ve.down) > -1) {
          if (nLevel.indexOf(ue.down) > nLevel.indexOf(ve.down)) crossCnt++;
        }
      });
    }
  });
  return crossCnt;
}

function combinatorN2(vertices: Array<Vertex>): Array<Array<Vertex>> {
  let combineList: Array<Array<Vertex>> = [];
  for (let fst: number = 0; fst < vertices.length - 1; fst++) {
    for (let snd: number = fst + 1; snd < vertices.length; snd++) {
      combineList.push([vertices[fst], vertices[snd]]);
    }
  }
  return combineList;
}

/*
 * penalty graph: H = (W, F, p)
 * W = V1
 * F = {(u, v) \in W X W | cross(r(u), r(v)) < cross(r(v), r(u))}
 * N = {1,2, ...}
 * p: F -> N
 */

/*
 * @param: {Array<Vertex>} W vertices to construct digraph
 */
export function penaltyGraph(W: Array<Vertex>, nLevel: Array<Vertex>): Graph {
  let pg: Graph = new Graph([], [], { directed: true });
  // clone W to Graph pg
  W.map(v => {
    pg.addVertex(new Vertex(v.id));
  });
  let combineList: Array<Array<Vertex>> = combinatorN2(W);
  combineList.map(vec => {
    const penlty: number = penalty(vec[0], vec[1], nLevel);
    if (penlty > 0) {
      pg.addEdge(
        new Edge(findVertexById(pg, vec[0].id), findVertexById(pg, vec[1].id), {
          penalty: penlty,
        }),
      );
    } else if (penlty < 0) {
      pg.addEdge(
        new Edge(findVertexById(pg, vec[1].id), findVertexById(pg, vec[0].id), {
          penalty: 0 - penlty,
        }),
      );
    }
  });
  return pg;
}

export function crossCount(W: Array<Vertex>, nLevel: Array<Vertex>): number {
  let totalCross: number = 0;
  let combineList: Array<Array<Vertex>> = combinatorN2(W);
  combineList.map(vec => {
    const xCnt: number = cross(vec[0], vec[1], nLevel);
    totalCross += xCnt;
  });
  return totalCross;
}
