import { expect } from 'chai';
import Graph, { Vertex, Edge } from '../misc/graph';
import { baryCentric } from '../algos/barycentric';
import { vegetables } from './data/data';
import { printVertices } from '../misc/graphUtil';

describe('BaryCentric Method', () => {
  let vertices: Array<Vertex> = [];
  const alphas: Array<string> = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i'];
  alphas.map((alpha, idx) => {
    vertices.push(new Vertex(idx, { key: alpha }));
  });
  let edges: Array<Edge> = [];
  edges.push(new Edge(vertices[0], vertices[4]));
  edges.push(new Edge(vertices[0], vertices[5]));
  edges.push(new Edge(vertices[1], vertices[4]));
  edges.push(new Edge(vertices[1], vertices[7]));
  edges.push(new Edge(vertices[1], vertices[8]));
  edges.push(new Edge(vertices[2], vertices[5]));
  edges.push(new Edge(vertices[2], vertices[7]));
  edges.push(new Edge(vertices[2], vertices[8]));
  edges.push(new Edge(vertices[3], vertices[4]));
  edges.push(new Edge(vertices[3], vertices[6]));
  edges.push(new Edge(vertices[3], vertices[8]));

  const g: Graph = new Graph(vertices, edges, { directed: true });
  const ups: Array<Vertex> = vertices.slice(0, 4);
  const downs: Array<Vertex> = vertices.slice(4);

  it('Should minimize two level crossings', () => {
    const { levels: [row, col], crossCount } = baryCentric([ups, downs], {});
    expect(row.map((v) => v.getOptions('key'))).to.deep.equal(['d', 'a', 'b', 'c']);
    expect(col.map((v) => v.getOptions('key'))).to.deep.equal(['g', 'e', 'i', 'f', 'h']);
    expect(crossCount).equal(7);
  });
  it('Should minimize two level crossings to zero', () => {
    let idx = 0;
    let ups: Vertex[] = [];
    const alphas: Array<string> = ['a', 'b', 'c'];
    alphas.map((alpha) => {
      ups.push(new Vertex(idx++, { key: alpha }));
    });
    let downs: Vertex[] = [];
    const alphaDowns = ['d', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l'];
    alphaDowns.map((alpha) => {
      downs.push(new Vertex(idx++, { key: alpha }));
    });
    let edges: Array<Edge> = [];
    edges.push(new Edge(ups[0], downs[2]));
    edges.push(new Edge(ups[0], downs[5]));
    edges.push(new Edge(ups[0], downs[8]));
    edges.push(new Edge(ups[1], downs[1]));
    edges.push(new Edge(ups[1], downs[4]));
    edges.push(new Edge(ups[1], downs[7]));
    edges.push(new Edge(ups[2], downs[0]));
    edges.push(new Edge(ups[2], downs[3]));
    edges.push(new Edge(ups[2], downs[6]));

    const g: Graph = new Graph([...ups, ...downs], edges, { directed: true });

    const { levels: [row, col], crossCount } = baryCentric([ups, downs], {});
    expect(row.map((v) => v.getOptions('key'))).to.deep.equal(['c', 'b', 'a']);
    expect(col.map((v) => v.getOptions('key'))).to.deep.equal(['j', 'g', 'd', 'k', 'h', 'e', 'l', 'i', 'f']);
    expect(crossCount).equal(0);
  });
  it('Should minimize 3 levels to zero', () => {
    let idx = 0;
    let ups: Vertex[] = [];
    const alphas: Array<string> = ['a', 'b', 'c'];
    alphas.map((alpha) => {
      ups.push(new Vertex(idx++, { key: alpha }));
    });
    let downs: Vertex[] = [];
    const alphaDowns = ['d', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l'];
    alphaDowns.map((alpha) => {
      downs.push(new Vertex(idx++, { key: alpha }));
    });
    let downs2: Vertex[] = [];
    const alphaDowns2 = ['m', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z'];
    alphaDowns2.map((alpha) => {
      downs2.push(new Vertex(idx++, { key: alpha }));
    });
    let edges: Array<Edge> = [];
    edges.push(new Edge(ups[0], downs[2]));
    edges.push(new Edge(ups[0], downs[5]));
    edges.push(new Edge(ups[0], downs[8]));
    edges.push(new Edge(ups[1], downs[1]));
    edges.push(new Edge(ups[1], downs[4]));
    edges.push(new Edge(ups[1], downs[7]));
    edges.push(new Edge(ups[2], downs[0]));
    edges.push(new Edge(ups[2], downs[3]));
    edges.push(new Edge(ups[2], downs[6]));
    edges.push(new Edge(ups[2], downs[6]));
    edges.push(new Edge(downs[0], downs2[0]));
    edges.push(new Edge(downs[0], downs2[7]));
    edges.push(new Edge(downs[1], downs2[1]));
    edges.push(new Edge(downs[1], downs2[8]));
    edges.push(new Edge(downs[2], downs2[2]));
    edges.push(new Edge(downs[2], downs2[9]));
    edges.push(new Edge(downs[3], downs2[3]));
    edges.push(new Edge(downs[3], downs2[10]));
    edges.push(new Edge(downs[4], downs2[4]));
    edges.push(new Edge(downs[4], downs2[11]));
    edges.push(new Edge(downs[5], downs2[5]));
    edges.push(new Edge(downs[5], downs2[12]));
    edges.push(new Edge(downs[6], downs2[6]));
    edges.push(new Edge(downs[6], downs2[13]));

    const g: Graph = new Graph([...ups, ...downs, ...downs2], edges, { directed: true });
    const { levels: [row, col], crossCount } = baryCentric([ups, downs, downs2], {});
    expect(crossCount).equal(0);
  })
  it('Should minimize 4 levels to zero', () => {
    let idx = 0;
    const first = ['a', 'b', 'c'].map((alpha) => {
      return new Vertex(idx++, { key: alpha });
    });
    const second = ['d', 'e', 'f'].map((alpha) => {
      return new Vertex(idx++, { key: alpha });
    });
    const third = ['g', 'h', 'i'].map((alpha) => {
      return new Vertex(idx++, { key: alpha });
    });
    const fourth = ['j', 'k', 'l'].map((alpha) => {
      return new Vertex(idx++, { key: alpha });
    });
    
    let edges: Array<Edge> = [];
    edges.push(new Edge(first[0], second[1]));
    edges.push(new Edge(first[1], second[0]));
    edges.push(new Edge(first[2], second[0]));
    edges.push(new Edge(second[0], third[0]));
    edges.push(new Edge(second[1], third[0]));
    edges.push(new Edge(second[1], third[1]));
    edges.push(new Edge(second[1], third[2]));
    edges.push(new Edge(second[2], third[1]));
    edges.push(new Edge(third[0], fourth[2]));
    edges.push(new Edge(third[1], fourth[0]));
    edges.push(new Edge(third[1], fourth[1]));

    const g: Graph = new Graph([...first, ...second, ...third, ...fourth], edges, { directed: true });
    const { levels, crossCount } = baryCentric([first, second, third, fourth], {});
    expect(crossCount).equal(0);
  })
  it('Should minimize vegetable levels', () => {
    const vMap: {[key: string]: Vertex } = {};
    const vLevels = vegetables.map(vertices => {
      return vertices.map(v => {
        const vertex = new Vertex(v.id);
        vMap[v.id] = vertex;
        return vertex; 
      });
    })
    const edges = vegetables.flatMap(vertices => {
      return vertices.flatMap(v => {
        return v.edges.map(edge => new Edge(vMap[edge.from], vMap[edge.to]));
      });
    })
    const g: Graph = new Graph(vLevels.flatMap(vertices => vertices), edges, { directed: true });
    const { levels, crossCount } = baryCentric(vLevels, {});
    expect(crossCount).equal(0);
  })
  it('Should minimize vegetable levels', () => {
    const vMap: {[key: string]: Vertex } = {};
    const vLevels = vegetables.map(vertices => {
      return vertices.map(v => {
        const vertex = new Vertex(v.id);
        vMap[v.id] = vertex;
        return vertex; 
      });
    })
    const edges = vegetables.flatMap(vertices => {
      return vertices.flatMap(v => {
        return v.edges.map(edge => new Edge(vMap[edge.from], vMap[edge.to]));
      });
    })
    const g: Graph = new Graph(vLevels.flatMap(vertices => vertices), edges, { directed: true });
    const { levels, crossCount } = baryCentric(vLevels, {});
    expect(crossCount).equal(0);
  })
  it('Should minimize crossings to zero', () => {
    let vertices: Array<Vertex> = [];
    for (let i = 0; i <= 11; i++) {
      vertices.push(new Vertex(i));
    }
    vertices[0].setOptions('dummpy', true);
    let edges: Array<Edge> = [];
    edges.push(new Edge(vertices[1], vertices[3]));
    edges.push(new Edge(vertices[3], vertices[4]));
    edges.push(new Edge(vertices[3], vertices[5]));
    edges.push(new Edge(vertices[3], vertices[6]));
    edges.push(new Edge(vertices[3], vertices[7]));
    edges.push(new Edge(vertices[3], vertices[8]));
    edges.push(new Edge(vertices[4], vertices[9]));
    edges.push(new Edge(vertices[5], vertices[10]));
    edges.push(new Edge(vertices[5], vertices[0]));
    edges.push(new Edge(vertices[0], vertices[11]));
    edges.push(new Edge(vertices[10], vertices[11]));
    const g: Graph = new Graph(vertices, edges, { directed: true });
    const levels = [
      [vertices[1], vertices[2]],
      [vertices[3]],
      [vertices[4], vertices[5], vertices[6], vertices[7], vertices[8]],
      [vertices[9], vertices[10], vertices[0]],
      [vertices[11]],
    ];
    const { levels: nLevels, crossCount } = baryCentric(levels, {});
    printVertices(levels);
    expect(crossCount).equal(0);
  })
});
