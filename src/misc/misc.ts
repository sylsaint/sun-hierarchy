import { Vertex } from './graph';

export function edgeMatrix(ups: Array<Vertex>, downs: Array<Vertex>): Array<Array<number>> {
  let em: Array<Array<any>> = [];
  ups.map((up, i) => {
    em[i] = [];
    downs.map((down, j) => {
      if (hasEdge(up, down)) em[i][j] = 1;
      else em[i][j] = 0;
    });
  });
  return em;
}

function hasEdge(from: Vertex, to: Vertex): boolean {
  let exist: boolean = false;
  from.edges.map(edge => {
    if (edge.down == to) exist = true;
  });
  return exist;
}

export function range(from: number, to: number, step?: number): Array<number> {
  const sign = from < to ? 1 : -1;
  step = Math.abs(step || 1) * sign;
  let length = Math.ceil((to - from) / step);
  const rt = Array(length + 1);
  let index = -1;
  while (length--) {
    rt[++index] = from;
    from += step;
  }
  rt[++index] = to;
  return rt;
}