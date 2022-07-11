import { Vertex, Edge } from './graph';

export interface ShortestPath {
  distance: number;
  path: Vertex[];
}

export function dagShortestPath(start: Vertex, end: Vertex): ShortestPath {
  const sorted: Vertex[] = [];
  const visited: { [key: number]: boolean } = {};
  const neighboursMap: { [key: number]: Edge[] } = {};
  const vertexStack: Vertex[] = [start];
  const idToOrderMap: { [key: number]: number } = {};
  const prev: { [key: number]: Vertex } = {};
  while (vertexStack.length) {
    const vt: Vertex = vertexStack.pop() as Vertex;
    if (visited[vt.id]) continue;
    if (!neighboursMap[vt.id]) neighboursMap[vt.id] = [...vt.edges];
    if (neighboursMap[vt.id].length === 0) {
      sorted.push(vt);
      visited[vt.id] = true;
    } else {
      const edge: Edge = neighboursMap[vt.id].splice(0, 1)[0];
      vertexStack.push(vt);
      vertexStack.push(edge.to as Vertex);
    }
  }
  sorted.reverse();
  const dist: number[] = new Array(sorted.length);
  sorted.forEach((v, idx) => (idToOrderMap[v.id] = idx));
  sorted.forEach((v) => {
    if (v.id === start.id) {
      dist[idToOrderMap[v.id]] = 0;
    }
    const currentOrder: number = idToOrderMap[v.id];
    v.edges.forEach((edge) => {
      const order: number = idToOrderMap[(edge.to as Vertex).id];
      if (!dist[order] || dist[order] > dist[currentOrder] + edge.weight) {
        dist[order] = dist[currentOrder] + edge.weight;
        prev[(edge.to as Vertex).id] = v;
      }
    });
  });
  const shortestPath: Vertex[] = [];
  if (idToOrderMap[end.id]) {
    let tmp: Vertex = end;
    while (tmp.id !== start.id && prev[tmp.id]) {
      shortestPath.push(tmp);
      tmp = prev[tmp.id]; 
    }
    shortestPath.push(start);
    shortestPath.reverse();
    return { distance: dist[idToOrderMap[end.id]], path: shortestPath };
  }
  return { distance: Number.POSITIVE_INFINITY, path: [] };
}
