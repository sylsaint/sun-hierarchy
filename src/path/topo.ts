import { Graph, Vertex } from "./graph";

/**
 * In essential, this is an algorithm for showing partial order 
 * topological sort uses depth first search to find sorting in reverse order, first find bottom node
 * @param graph input graph for topological sort
 */
export function topologicalSort(graph: Graph): Vertex[] {
    const sorted: Vertex[] = [];
    const neighboursMap: { [key: number]: Vertex[] } = {};
    const visited: { [key: number]: boolean } = {};
    const vertices: Vertex[] = graph.vertice;
    vertices.forEach(vertex => {
        neighboursMap[vertex.id] = [...vertex.getNeighbours()];
    });
    vertices.forEach(vertex => {
        if (visited[vertex.id]) return;
        const vertexStack: Vertex[] = [vertex];
        while(vertexStack.length) {
            const vt: Vertex = vertexStack.pop() as Vertex;
            if (visited[vt.id]) continue;
            if (neighboursMap[vt.id].length === 0) {
                sorted.push(vt);
                visited[vt.id] = true;
            } else {
                const subVertex: Vertex[] = neighboursMap[vt.id].splice(0, 1);
                vertexStack.push(vt);
                vertexStack.push(subVertex[0]);
            }
        }
    })
    sorted.reverse();
    return sorted;
}