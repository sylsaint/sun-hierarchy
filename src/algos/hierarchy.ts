import Graph, { Vertex, Edge } from '@/interface/graph';
import { cloneGraph, findVertexById, getDummyId } from '@/utils/graph';
import { PX, PY, DUMMY } from '@/interface/constant';

/**
 * Build hierarchy levels using topological sort (Kahn's algorithm).
 * For nodes with multiple parents, the level is max(parent levels) + 1,
 * which ensures proper placement below all ancestors.
 */
export function makeHierarchy(g: Graph): Vertex[][] {
  const cloned: Graph = cloneGraph(g);

  // Compute in-degree for each vertex in the cloned graph
  const inDegreeMap = new Map<string | number, number>();
  const vertexMap = new Map<string | number, Vertex>();
  cloned.vertices.map((v) => {
    vertexMap.set(v.id, v);
    let inDegree = 0;
    v.edges.map((edge) => {
      if (edge.down === v) inDegree++;
    });
    inDegreeMap.set(v.id, inDegree);
  });

  // Find roots (in-degree == 0)
  const roots: Vertex[] = [];
  cloned.vertices.map((v) => {
    if (inDegreeMap.get(v.id) === 0) {
      roots.push(v);
    }
  });

  // If no roots found (cycle), pick vertices with max out/in ratio
  if (!roots.length) {
    let maxRatio = 0;
    cloned.vertices.map((v) => {
      let outDegree = 0;
      let inDegree = 0;
      v.edges.map((edge) => {
        if (edge.down === v) inDegree++;
        else outDegree++;
      });
      const ratio = inDegree > 0 ? outDegree / inDegree : outDegree;
      v.setOptions('outInRatio', ratio);
      if (ratio > maxRatio) maxRatio = ratio;
    });
    cloned.vertices.map((v) => {
      if (v.getOptions('outInRatio') === maxRatio) {
        roots.push(v);
        inDegreeMap.set(v.id, 0);
      }
    });
  }

  // Topological sort with level assignment
  // Level of a node = max(level of all parents) + 1
  const levelMap = new Map<string | number, number>();
  roots.map((v) => levelMap.set(v.id, 1));

  const queue: Vertex[] = [...roots];
  const visited: Vertex[] = [];

  while (queue.length) {
    const node = queue.shift() as Vertex;
    if (visited.some((v) => v.id === node.id)) continue;
    visited.push(node);

    const currentLevel = levelMap.get(node.id) || 1;
    node.setOptions(PY, currentLevel);

    // Process all outgoing edges
    node.edges.map((edge) => {
      if (edge.up !== node) return;
      const down = edge.down;
      const downId = down.id;

      // Set child level to max(current child level, parent level + 1)
      const existingLevel = levelMap.get(downId) || 0;
      const newLevel = currentLevel + 1;
      if (newLevel > existingLevel) {
        levelMap.set(downId, newLevel);
      }

      // Decrease in-degree; when all parents processed, enqueue
      const newInDegree = (inDegreeMap.get(downId) || 1) - 1;
      inDegreeMap.set(downId, newInDegree);
      if (newInDegree <= 0) {
        queue.push(down);
      }
    });
  }

  // Handle any unvisited vertices (disconnected or in cycles)
  cloned.vertices.map((v) => {
    if (!visited.some((vis) => vis.id === v.id)) {
      visited.push(v);
      if (!levelMap.has(v.id)) {
        levelMap.set(v.id, 1);
        v.setOptions(PY, 1);
      }
    }
  });

  const levels: Array<Array<Vertex>> = adjustLevel(g, visited);
  addDummy(g, levels);
  return levels;
}

function adjustLevel(g: Graph, vertices: Array<Vertex>): Vertex[][] {
  // retrieving real vertices from visited
  const levels: Array<Array<Vertex>> = [];
  const gVertices: Array<Vertex> = [];
  vertices.map((v) => {
    const found = findVertexById(g, v.id);
    if (found) {
      found.setOptions(PY, v.getOptions(PY));
      found.setOptions(PX, v.getOptions(PX));
      gVertices.push(found);
    }
  });
  if (gVertices.length != vertices.length) {
    throw new Error('vertices are not equal to expected !');
  }
  gVertices.map((v) => {
    const lvl: number = v.getOptions(PY);
    if (levels[lvl - 1]) {
      levels[lvl - 1].push(v);
    } else {
      levels[lvl - 1] = [v];
    }
  });
  for (let i: number = levels.length - 1; i >= 0; i--) {
    const exclude: Array<Vertex> = [];
    levels[i].map((v) => {
      let min: number = Number.POSITIVE_INFINITY;
      v.edges.map((edge) => {
        if (edge.up == v && edge.down.getOptions(PY) < min) min = edge.down.getOptions(PY);
      });
      if (min != Number.POSITIVE_INFINITY && min != 1 && v.getOptions(PY) != min - 1) {
        v.setOptions(PY, min - 1);
        levels[min - 2].push(v);
        exclude.push(v);
      }
    });
    exclude.map((v) => {
      const pos: number = levels[i].indexOf(v);
      if (pos > -1) levels[i].splice(pos, 1);
    });
  }
  return levels;
}

function addDummy(g: Graph, levels: Vertex[][]): Vertex[][] {
  levels.map((level) => {
    level.map((v, idx) => {
      const currentLevel: number = v.getOptions(PY);
      const dummyVertice: Array<Vertex> = [];
      const dummyEdges: Array<Edge> = [];
      const excludeEdges: Array<Edge> = [];
      v.edges.map((edge) => {
        if (edge.up != v) return;
        const down: Vertex = edge.down;
        const nextLevel: number = down.getOptions(PY);
        let up: Vertex = v;
        if (nextLevel - currentLevel > 1) {
          for (let lvl: number = currentLevel + 1; lvl < nextLevel; lvl++) {
            const dummpyVertex: Vertex = new Vertex(getDummyId(), { level: lvl, type: DUMMY });
            dummyVertice.push(dummpyVertex);
            dummyEdges.push(new Edge(up, dummpyVertex));
            up = dummpyVertex;
            if (idx >= levels[lvl - 1].length) {
              levels[lvl - 1].push(dummpyVertex);
            } else {
              levels[lvl - 1].splice(idx, 0, dummpyVertex);
            }
          }
          dummyEdges.push(new Edge(up, down));
          excludeEdges.push(edge);
        }
      });
      dummyVertice.map((v) => {
        g.addVertex(v);
      });
      dummyEdges.map((e) => {
        g.addEdge(e);
      });
      excludeEdges.map((e) => {
        g.removeEdge(e);
      });
    });
  });
  return levels;
}
