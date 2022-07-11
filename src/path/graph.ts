export class Graph {
    vertice: Vertex[] = [];
    constructor(vertice?: Vertex[]) {
        if (vertice) {
            this.vertice = vertice;
        }
    }
    getVertice(): Vertex[] {
        return this.vertice;
    }
}

export class Edge {
    to: Vertex | undefined;
    weight: number = 0;
    constructor(to?: Vertex, w?: number) {
        if (to) this.to = to;
        if (w !== undefined) this.weight = w;
    }
    setNext(v: Vertex) {
        this.to = v;
    }
    setWeight(w: number) {
        this.weight = w;
    }
}

export class Vertex {
    id: number;
    neighbours: Vertex[] = [];
    edges: Edge[] = [];
    constructor(id: number) {
        this.id = id;
    }
    setNeighbours(vertice: Vertex[]) {
        this.neighbours = [...vertice];
    }
    getNeighbours(): Vertex[] {
        return this.neighbours;
    }
    setEdges(edges: Edge[]) {
        this.edges = edges;
    }
    getEdges(): Edge[] {
        return this.edges;
    }
}
