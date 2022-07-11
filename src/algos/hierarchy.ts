import Graph, { Vertex, Edge } from '../misc/graph';
import { cloneGraph, findVertexById, getDummyId } from '../misc/graphUtil';
import { PX, PY, DUMMY } from '../misc/constant';

export function makeHierarchy(g: Graph): Array<Array<Vertex>> {
  let roots: Array<Vertex> = [];
  // find all the roots without incoming edges
  let cloned: Graph = cloneGraph(g);
  cloned.vertices.map(v => {
    let isRoot: boolean = true;
    let outDegree: number = 0;
    let inDegree: number = 0;
    v.edges.map(edge => {
      if (edge.down == v) {
        isRoot = false;
        inDegree += 1;
      } else {
        outDegree += 1;
      }
    });
    if (isRoot) {
      roots.push(v);
    } else {
      v.setOptions('outInRatio', outDegree / inDegree);
    }
  });
  // judge if roots is empty, if yes, add max (out(v) / in (v)) to roots
  if (!roots.length) {
    // find the maximum ratio
    let max: number = 0;
    cloned.vertices.map(v => {
      let ratio: number = v.getOptions('outInRatio');
      if (ratio > max) max = ratio;
    });
    cloned.vertices.map(v => {
      if (v.getOptions('outInRatio') == max) roots.push(v);
    });
  }
  let visited = [];
  while (roots.length) {
    const node: Vertex = roots.shift() as Vertex;
    if (!node.getOptions(PY)) {
      node.setOptions(PY, 1);
    }
    if (visited.indexOf(node) > -1) {
      continue;
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
      if (only) {
        let downLevel: number = down.getOptions(PY);
        if (!downLevel) {
          down.setOptions(PY, node.getOptions(PY) + 1);
        } else {
          // ensure even there are cycles, procedure can be terminated
          if (downLevel < node.getOptions(PY) + 1 && downLevel != 1) {
            down.setOptions(PY, node.getOptions(PY) + 1);
          }
        }
        roots.push(down);
      }
    });
    exclude.map(edge => cloned.removeEdge(edge));
  }
  let levels: Array<Array<Vertex>> = adjustLevel(g, visited);
  addDummy(g, levels);
  return levels;
}

function adjustLevel(g: Graph, vertices: Array<Vertex>): Array<Array<Vertex>> {
  // retrieving real vertices from visited
  let levels: Array<Array<Vertex>> = [];
  let gVertices: Array<Vertex> = [];
  vertices.map(v => {
    let found: Vertex = findVertexById(g, v.id);
    if (found instanceof Vertex) {
      found.setOptions(PY, v.getOptions(PY));
      found.setOptions(PX, v.getOptions(PX));
      gVertices.push(found);
    }
  });
  if (gVertices.length != vertices.length) {
    throw new Error('vertices are not equal to expected !');
  }
  gVertices.map(v => {
    const lvl: number = v.getOptions(PY);
    if (levels[lvl - 1]) {
      levels[lvl - 1].push(v);
    } else {
      levels[lvl - 1] = [v];
    }
  });
  for (let i: number = levels.length - 1; i >= 0; i--) {
    let exclude: Array<Vertex> = [];
    levels[i].map(v => {
      let min: number = Number.POSITIVE_INFINITY;
      v.edges.map(edge => {
        if (edge.up == v && edge.down.getOptions(PY) < min) min = edge.down.getOptions(PY);
      });
      if (min != Number.POSITIVE_INFINITY && min != 1 && v.getOptions(PY) != min - 1) {
        v.setOptions(PY, min - 1);
        levels[min - 2].push(v);
        exclude.push(v);
      }
    });
    exclude.map(v => {
      const pos: number = levels[i].indexOf(v);
      if (pos > -1) levels[i].splice(pos, 1);
    });
  }
  return levels;
}

function addDummy(g: Graph, levels: Array<Array<Vertex>>): Array<Array<Vertex>> {
  levels.map(level => {
    level.map((v, idx) => {
      const currentLevel: number = v.getOptions(PY);
      const dummyVertice: Array<Vertex> = [];
      const dummyEdges: Array<Edge> = [];
      const excludeEdges: Array<Edge> = [];
      v.edges.map(edge => {
        if (edge.up != v) return;
        let down: Vertex = edge.down;
        const nextLevel: number = down.getOptions(PY);
        let up: Vertex = v;
        if (nextLevel - currentLevel > 1) {
          for (let lvl: number = currentLevel + 1; lvl < nextLevel; lvl++) {
            let dummpyVertex: Vertex = new Vertex(getDummyId(), { level: lvl, type: DUMMY });
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
      dummyVertice.map(v => {
        g.addVertex(v);
      });
      dummyEdges.map(e => {
        g.addEdge(e);
      });
      excludeEdges.map(e => {
        g.removeEdge(e);
      })
    });
  });
  return levels;
}
