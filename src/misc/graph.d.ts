export class Vertex {
  id: Number;
  opts: Object;
  constructor(id: Number, opts?: Object) {
    this.id = id;
    this.opts = opts || {};
  }
}

export class Edge {
  source: Vertex;
  target: Vertex;
  constructor(source: Vertex, target: Vertex) {
    this.source = source;
    this.target = target;
  }
}
