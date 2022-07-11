/*
 * @author: yonglu.syl@gmail.com
 */

/*
 * @param: {number} id
 * @param: {object} opts
 * @return: {Vertex}
 */

export class Vertex {
  private _id: number | string;
  private _options: object = { up: 1, down: 1 };
  private adjacents: Array<Edge>;
  constructor(id: number | string, opts?: object) {
    this._id = id;
    this._options = { ...this._options, ...opts };
    this.adjacents = [];
  }
  /*
   * Adding edge which current vertext incident to
   * @param: {Edge} e
   * @return: {boolean}
   */
  public add(e: Edge): boolean {
    if (this.adjacents.indexOf(e) == -1) {
      this.adjacents.push(e);
    }
    return true;
  }
  /*
   * Removing edge which current vertext incident to
   * @param: {Edge} e
   * @return: {boolean}
   */
  public remove(e: Edge): boolean {
    const idx: number = this.adjacents.indexOf(e);
    if (idx > -1) {
      this.adjacents.splice(idx, 1);
    }
    return true;
  }
  /*
   * return all the edges which current vertex is incident to
   */
  get edges(): Array<Edge> {
    return this.adjacents;
  }
  get id() {
    return this._id;
  }
  getOptions(name: string) {
    return this._options[name];
  }
  setOptions(name: string, value: any) {
    this._options[name] = value;
  }
  removeOptions(name: string): any {
    const v: any = this._options[name];
    delete this._options[name];
    return v;
  }
}

/*
 * Edge class: immutable
 * @param: {Vertex} source -- endvertex
 * @param: {Vertex} target -- endvertex
 */
export class Edge {
  private source: Vertex;
  private target: Vertex;
  private _options: object = {};
  constructor(source: Vertex, target: Vertex, opts?: object) {
    this.source = source;
    this.target = target;
    this._options = opts || this._options;
  }
  /*
   * Returning upstream end vertex
   * @return: {Vertex}
   */
  get up(): Vertex {
    return this.source;
  }
  set up(v: Vertex) {
    this.source = v;
  }
  /*
   * Returning downstream end vertex
   * @return: {Vertex}
   */
  get down(): Vertex {
    return this.target;
  }
  set down(v: Vertex) {
    this.target = v;
  }
  get options(): object {
    return this._options;
  }
  getOptions(name: any) {
    return this._options[name];
  }
  setOptions(name: any, value: any) {
    this._options[name] = value;
  }
}

/*
 * Common Graph class Representation, accepting vertices and edges
 * @param: {Array<Vertex>} vertices
 */
export default class Graph {
  private _vertices: Array<Vertex> = [];
  private _edges: Array<Edge> = [];
  private opts: any = { directed: false };
  constructor(vertices?: Array<Vertex>, edges?: Array<Edge>, opts?: any) {
    vertices && (this._vertices = vertices);
    edges && this.addEdges(edges);
    edges && (this._edges = edges);
    opts && (this.opts = { ...this.opts, ...opts });
  }
  findVertex(v: Vertex): number {
    return this._vertices.indexOf(v);
  }
  getVertexById(vid: number): Vertex {
    let idx: number = -1;
    this._vertices.map((v, i) => {
      if (v.id === vid) idx = i;
    })
    return this._vertices[idx];
  }
  hasVertex(v: Vertex): boolean {
    let hasV: boolean = this.findVertex(v) > -1;
    this._vertices.map(_v => {
      if (_v.id === v.id) hasV = true;
    });
    return hasV;
  }
  addVertex(v: Vertex) {
    if (!this.hasVertex(v)) {
      this._vertices.push(v);
    }
  }
  removeVertex(v: Vertex): Vertex | any {
    if (this.hasVertex(v)) {
      let rmIdx = this.findVertex(v);
      this._vertices.splice(rmIdx, 1);
      v.edges.map(edge => {
        this.removeEdge(edge);
      });
      return v;
    }
    return null;
  }
  hasEdge(edge: Edge): boolean {
    let exist: boolean = this.findEdge(edge) > -1;
    const up: Vertex = edge.up;
    const down: Vertex = edge.down;
    up.edges.map(e => {
      if (e.down == down) exist = true;
      !this.opts.directed && e.up == edge.down && e.down == edge.up && (exist = true);
    });
    down.edges.map(e => {
      if (e.up == up) exist = true;
      !this.opts.directed && e.up == edge.down && e.down == edge.up && (exist = true);
    });
    return exist;
  }
  findEdge(edge: Edge): number {
    return this._edges.indexOf(edge);
  }
  addEdge(edge: Edge) {
    if (this.edgeAddable(edge)) {
      this._edges.push(edge);
      this.addEdgeToVertex(edge);
    }
  }
  addEdges(edges: Array<Edge>) {
    edges.map(edge => {
      this.addEdge(edge);
    });
  }
  addEdgeToVertex(edge: Edge) {
    edge.up.add(edge);
    edge.down.add(edge);
  }
  edgeAddable(edge: Edge): Boolean {
    let canAdd = true;
    // check if edge is existing
    if (this.hasEdge(edge)) {
      canAdd = false;
    }
    // check if edge is valid
    if (!this.hasVertex(edge.up) || !this.hasVertex(edge.down)) {
      canAdd = false;
    }
    return canAdd;
  }
  removeEdge(edge: Edge): any {
    if (this.hasEdge(edge)) {
      const idx: number = this.findEdge(edge);
      this._edges.splice(idx, 1);
      const up: Vertex = edge.up;
      const down: Vertex = edge.down;
      up && up.remove(edge);
      down && down.remove(edge);
      return edge;
    }
    return null;
  }
  get vertices(): Array<Vertex> {
    return this._vertices;
  }
  get edges(): Array<Edge> {
    return this._edges;
  }
  /*
   * Return the number of vertices
   */
  get order(): Number {
    return this._vertices.length;
  }
  /*
   * Indicate whether the graph is emtpy
   */
  get empty(): Boolean {
    return this.order == 0;
  }
  /*
   * Indicate whether the graph is trivial
   */
  get trivial(): Boolean {
    return this.order <= 1;
  }
}
