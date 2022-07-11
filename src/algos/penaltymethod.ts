import { kosaraju } from './kosaraju';
import { kahn } from './topological';
import { pm } from './penalty';
import Graph, { Vertex } from '../misc/graph';
import { penaltyGraph } from '../misc/penaltyGraph';
import { cloneGraph } from '../misc/graphUtil';

export function penaltyMethod(g: Graph, levels: Array<Array<Vertex>>, iterCount: number = 5): Array<Array<Vertex>> {
  if (levels.length <= 1) return levels;
  // iteration termination condition:
  // 1. the same matrix realization appears periodically
  // 2. reaching the iteration limit
  for (let it: number = 0; it < iterCount; it++) {
    for (let i: number = levels.length - 1; i > 0; i--) {
      let ordered: Array<Vertex> = doIter(levels[i - 1], levels[i]);
      let orderedMap = {};
      ordered.map((v, idx) => {
        orderedMap[v.id] = idx;
      });
      levels[i - 1] = levels[i - 1].sort((v1, v2) => {
        return orderedMap[v1.id] < orderedMap[v2.id] ? -1 : 1;
      });
    }
  }
  for (let i: number = 0; i < levels.length - 1; i++) {
    let ordered: Array<Vertex> = doIter(levels[i], levels[i + 1]);
    let orderedMap: object = {};
    ordered.map((v, idx) => {
      orderedMap[v.id] = idx;
    });
    levels[i] = levels[i].sort((v1, v2) => {
      return orderedMap[v1.id] < orderedMap[v2.id] ? -1 : 1;
    });
  }
  return levels;
}

function doIter(up: Array<Vertex>, down: Array<Vertex>): Array<Vertex> {
  const dig: Graph = penaltyGraph(up, down);
  const sccs: any = kosaraju(dig);
  const sigmas: Array<Array<Vertex>> = pm(sccs, dig);
  return sigmas.length ? sigmas[0] : kahn(cloneGraph(dig));
}
