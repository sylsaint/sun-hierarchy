/**
 * Tarjan algorithm for finding strongly connected components
 * @params DiGraph
 * @returns SCCs(Strongly Connected Components)
 * 
 */
import { Graph, Vertex, Edge } from './graph';

interface N2NMapping {
    [key: number]: number;
}

interface N2BMapping {
    [key: number]: boolean;
}

interface Counter {
    value: number;
}

export function findSccs(graph: Graph): Vertex[][] {
    // where pending Sccs are stored, if full Sccs are found, all the vertice
    // on the stack which are in the Sccs are poped.
    const stack: Vertex[] = [];
    // Indicating whether vertext is on the stack
    const onStack: N2BMapping = {};
    // id mapping, everty vertext has an unique id by ascending order
    const ids: N2NMapping = {};
    // low-link values, vertice in the same Sccs have the same low-link value 
    const lowLinks: N2NMapping = {};
    // visited vertice
    const visited: N2BMapping = {};
    // sccs
    const sccs: Vertex[][] = [];

    let lowLinkId: Counter = { value: 0 };

    graph.getVertice().forEach((v: Vertex) => {
        if (visited[v.id]) return;
        dfs(v, stack, onStack, ids, lowLinks, lowLinkId, visited, sccs);
    });
    return sccs;
}

function dfs(
    v: Vertex, 
    stack: Vertex[], 
    onStack: N2BMapping, 
    ids: N2NMapping, 
    lowLinks: N2NMapping,
    lowLinkId: Counter,
    visited: N2BMapping,
    sccs: Vertex[][]
) {
    stack.push(v);
    onStack[v.id] = true;
    visited[v.id] = true;
    ids[v.id] = lowLinks[v.id] = lowLinkId.value;
    lowLinkId.value += 1;

    v.neighbours.forEach((n: Vertex) => {
        if (!visited[n.id]) {
            dfs(n, stack, onStack, ids, lowLinks, lowLinkId, visited, sccs);
        }
        // if neighbour is on the stack, then update current vertex low-link value
        if (onStack[n.id]) {
            lowLinks[v.id] = Math.min(lowLinks[v.id], lowLinks[n.id]);
        }
    });

    // After finding all vertice reachable by current vertex, if low-link value == ids[v.id]
    // then all the vertice in the Scc starting from v have been found, we should pop them out.
    if (ids[v.id] === lowLinks[v.id]) {
        const scc: Vertex[] = [];
        for(let at: Vertex = stack.pop() as Vertex;;at = stack.pop() as Vertex) {
            onStack[at.id] = false;
            lowLinks[at.id] = lowLinks[v.id];
            scc.push(at);
            if (at === v) {
                break;
            }
        }
        sccs.push(scc);
    }
}