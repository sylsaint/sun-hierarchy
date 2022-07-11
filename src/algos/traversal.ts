import Graph, { Vertex } from '../misc/graph';
import Stack from '../misc/stack';
export function dfs(g: Graph, v?: Vertex): Array<Vertex> | Array<Array<Vertex>> {
  let visited: Array<Vertex> = [];
  let hasVisited = (vertex: Vertex): boolean => visited.indexOf(vertex) > -1;
  if (v) {
    let traversed: Array<Vertex> = [];
    let st: Stack = new Stack();
    st.push(v);
    while (!st.empty()) {
      let tmp: Vertex = st.pop();
      if (!hasVisited(tmp)) {
        visited.push(tmp);
        tmp.edges.map(edge => {
          if (edge.up == tmp) st.push(edge.down);
        });
        traversed.push(tmp);
      }
    }
    return traversed;
  } else {
    let count: number = 0;
    let traversed: Array<Array<Vertex>> = [];
    g.vertices.map(vx => {
      if (hasVisited(vx)) {
        return;
      }
      traversed[count] = [];
      let st: Stack = new Stack();
      st.push(vx);
      while (!st.empty()) {
        let tmp: Vertex = st.pop();
        if (!hasVisited(tmp)) {
          visited.push(tmp);
          tmp.edges.map(edge => {
            if (edge.up == tmp) st.push(edge.down);
          });
          traversed[count].push(tmp);
        }
      }
      count++;
    });
    return traversed;
  }
}

export function dfsGraph(g: Graph): Array<Array<Vertex>> {
  let visited: Array<Vertex> = [];
  let hasVisited = (vertex: Vertex): boolean => visited.indexOf(vertex) > -1;
  let count: number = 0;
  let traversed: Array<Array<Vertex>> = [];
  g.vertices.map(vx => {
    if (hasVisited(vx)) {
      return;
    }
    traversed[count] = [];
    let st: Stack = new Stack();
    st.push(vx);
    while (!st.empty()) {
      let tmp: Vertex = st.pop();
      if (!hasVisited(tmp)) {
        visited.push(tmp);
        tmp.edges.map(edge => {
          if (edge.up == tmp) st.push(edge.down);
        });
        traversed[count].push(tmp);
      }
    }
    count++;
  });
  return traversed;
}

export function dfsVertex(g: Graph, v: Vertex): Array<Vertex> {
  let visited: Array<Vertex> = [];
  let hasVisited = (vertex: Vertex): boolean => visited.indexOf(vertex) > -1;
  let traversed: Array<Vertex> = [];
  let st: Stack = new Stack();
  st.push(v);
  while (!st.empty()) {
    let tmp: Vertex = st.pop();
    if (!hasVisited(tmp)) {
      visited.push(tmp);
      tmp.edges.map(edge => {
        if (edge.up == tmp) st.push(edge.down);
      });
      traversed.push(tmp);
    }
  }
  return traversed;
}

export function dfsUtil(vertices: Array<Vertex>, v: Vertex): Array<Vertex> {
  let visited: Array<Vertex> = [];
  let hasVisited = (vertex: Vertex): boolean => visited.indexOf(vertex) > -1;
  let traversed: Array<Vertex> = [];
  let st: Stack = new Stack();
  st.push(v);
  while (!st.empty()) {
    let tmp: Vertex = st.pop();
    if (!hasVisited(tmp) && vertices.indexOf(tmp) > -1) {
      visited.push(tmp);
      tmp.edges.map(edge => {
        if (edge.up == tmp) st.push(edge.down);
      });
      traversed.push(tmp);
    }
  }
  return traversed;
}
