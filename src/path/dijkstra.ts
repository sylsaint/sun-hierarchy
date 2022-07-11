import { Vertex, Edge } from './graph';
import { ShortestPath } from './shortest';
import PriorityQueue, { Comparable } from '../misc/priorityQueue';

interface VertexComparable extends Comparable {
  index: number;
  prev: number;
}

function compareFunc(item1: VertexComparable, item2: VertexComparable): number {
  if (item1.value < item2.value) return -1;
  if (item1.value > item2.value) return 1;
  if (item1.index < item2.index) return -1;
  if (item1.index > item2.index) return 1;
  return 0;
}

export function dijkstraShortestPath(start: Vertex, end: Vertex): ShortestPath {
  const pq: PriorityQueue<VertexComparable> = new PriorityQueue<VertexComparable>(compareFunc);
  const idToDisMap: { [key: number]: number } = { [start.id]: 0 };
  const idToVertexMap: { [key: number]: Vertex } = { [start.id]: start };
  const prevMap: { [key: number]: number } = {};
  const visited: { [key: number]: boolean } = {};
  pq.insert({ index: start.id, value: 0, prev: -1 });
  // 使用优先级队列，找到最有希望的下一个节点
  while (!pq.empty()) {
    const vc: VertexComparable = pq.pop() as VertexComparable;
    if (!idToDisMap[vc.index] || vc.value < idToDisMap[vc.index]) {
      visited[vc.index] = true;
      idToDisMap[vc.index] = vc.value;
      prevMap[vc.index] = vc.prev;
    }
    const v: Vertex = idToVertexMap[vc.index];
    v.edges.forEach((edge: Edge) => {
      const nextVertex: Vertex = edge.to as Vertex;
      idToVertexMap[nextVertex.id] = nextVertex;
      let needIns: boolean = false;
      // 如果没有访问过，需要将节点插入
      if (!visited[nextVertex.id]) {
        needIns = true;
      }
      // 如果访问过，但是节点的距离比目前计算的距离大，也插入
      if (visited[nextVertex.id] && idToDisMap[nextVertex.id] > idToDisMap[vc.index] + edge.weight) {
        needIns = true;
      }
      if (needIns) {
        pq.insert({ 
          index: nextVertex.id, 
          value: idToDisMap[vc.index] + edge.weight, 
          prev: vc.index 
        });
      }
    });
  }
  const path: Vertex[] = [];
  let tmp: Vertex = end;
  while (tmp.id !== start.id && prevMap[tmp.id] !== -1) {
    path.push(idToVertexMap[tmp.id]);
    tmp = idToVertexMap[prevMap[tmp.id]];
  }
  path.push(start);
  path.reverse();
  if (idToDisMap[end.id]) {
    return {
      distance: idToDisMap[end.id],
      path,
    };
  }
  return {
    distance: Number.POSITIVE_INFINITY,
    path: [],
  };
}
