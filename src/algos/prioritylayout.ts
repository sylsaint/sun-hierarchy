import Graph, { Vertex } from '../misc/graph';
import { LayoutOptions, Priority, Order } from '../misc/interface';
import { defaultOptions, PX, PY, DUMMY } from '../misc/constant';

export function position(g: Graph, levels: Array<Array<Vertex>>, options: LayoutOptions = defaultOptions): Graph {
  // initial horizontal position
  options = { ...defaultOptions, ...options };
  const { left, right, top, bottom } = options.padding;
  const { width, height, gutter } = options;
  let upMax: number = 0;
  let downMax: number = 0;
  // calculate the up/down connectivity of all vertice
  levels.map((lvl, li) => {
    lvl.map((v, vi) => {
      v.setOptions(PX, vi + 1);
      v.setOptions(PY, li + 1);
      const prio: Priority = connectivity(v);
      prio.up > upMax && (upMax = prio.up);
      prio.down > downMax && (downMax = prio.down);
    });
  });
  // assign max priority to dummy vertice
  levels.map(lvl => {
    lvl.map(v => {
      if (v.getOptions('type') == DUMMY) {
        // 2 is a empirical number
        v.setOptions('upPriority', upMax * 2);
        v.setOptions('downPriority', downMax * 2);
      }
    });
  });
  // improve horizontal positions
  // down procedure
  for (let i: number = 0; i < levels.length - 1; i++) {
    const ups: Array<Vertex> = levels[i];
    const downs: Array<Vertex> = levels[i + 1];
    doProcedure(ups, downs);
  }
  // up procedure
  for (let i: number = levels.length - 1; i > 0; i--) {
    const downs: Array<Vertex> = levels[i];
    const ups: Array<Vertex> = levels[i - 1];
    doProcedure(ups, downs, true);
  }
  // down procedure
  for (let i: number = 1; i < levels.length - 1; i++) {
    const ups: Array<Vertex> = levels[i];
    const downs: Array<Vertex> = levels[i + 1];
    doProcedure(ups, downs);
  }

  g.vertices.map(v => {
    v.setOptions('x', left + (v.getOptions(PX) - 1) * (width + gutter));
    v.setOptions('y', top + (v.getOptions(PY) - 1) * (height + gutter));
    rmOptions(v);
  })
  return g;
}

function connectivity(v: Vertex): Priority {
  let upConn: number = 0;
  let downConn: number = 0;
  v.edges.map(edge => {
    if (edge.up == v) downConn += 1;
    if (edge.down == v) upConn += 1;
  });
  v.setOptions('up', upConn);
  v.setOptions('down', downConn);
  v.setOptions('upPriority', upConn);
  v.setOptions('downPriority', downConn);
  return { up: upConn, down: downConn };
}

function BikU(ups: Array<Vertex>, v: Vertex): number {
  let barycenter: number = 0;
  v.edges.map(edge => {
    if (edge.down == v) {
      const pos: number = edge.up.getOptions(PX) || ups.indexOf(edge.up) + 1;
      if (pos > -1) barycenter += pos * 1;
    }
  });
  return barycenter / v.getOptions('up');
}

function BikL(downs: Array<Vertex>, v: Vertex): number {
  let barycenter: number = 0;
  v.edges.map(edge => {
    if (edge.up == v) {
      const pos: number = edge.down.getOptions(PX) || downs.indexOf(edge.down) + 1;
      if (pos > -1) barycenter += pos * 1;
    }
  });
  return barycenter / v.getOptions('down');
}



function doProcedure(ups: Array<Vertex>, downs: Array<Vertex>, reverse: boolean = false) {
  const vertices: Array<Vertex> = reverse ? ups : downs;
  const priorityKey: string = reverse ? 'downPriority' : 'upPriority';
  const orderList: Array<Order> = vertices.map((v, idx) => { return { value: v.getOptions(priorityKey), idx } }).sort((a, b) => {
    return a.value < b.value ? 1 : -1;
  });
  orderList.map(order => {
    const v: Vertex = vertices[order.idx];
    const bary: number = reverse ? BikL(downs, v) : BikU(ups, v);
    if (isNaN(bary)) { return; }
    const reorderPos: number = parseInt(Math.floor(bary).toString());
    const origPos: number = v.getOptions(PX);
    const shift: number = reorderPos - origPos;
    if (shift < 0) {
      let pivot: number = order.idx;
      for (let i: number = order.idx - 1; i > -1; i--) {
        if (vertices[i].getOptions(priorityKey) >= order.value) {
          pivot = i;
          break;
        }
      }
      if (pivot === order.idx) {
        // if vertex can be placed into the expected position
        // but we can not move to small than zero
        if (origPos + shift - order.idx < 0) {
          // underflow
          const offset: number = origPos - order.idx;
          if (offset > 0) {
            // can move position by offset
            v.setOptions(PX, origPos - offset);
            let movePos: number = origPos - offset - 1;
            for (let i: number = order.idx - 1; i > -1; i--) {
              if (vertices[i].getOptions(PX) <= movePos) {
                break;
              } else {
                vertices[i].setOptions(PX, movePos);
                movePos--;
              }
            }
          }
        } else {
          v.setOptions(PX, reorderPos);
          let movePos: number = reorderPos - 1;
          for (let i: number = order.idx - 1; i > -1; i--) {
            if (vertices[i].getOptions(PX) <= movePos) {
              break;
            } else {
              vertices[i].setOptions(PX, movePos);
              movePos--;
            }
          }
        }
      } else {
        // if there is a vertex with higher priority
        const leftMostPos: number = vertices[pivot].getOptions(PX);
        if (leftMostPos < reorderPos - (order.idx - pivot)) {
          // if there is enough space for position
          v.setOptions(PX, reorderPos);
          let movePos: number = reorderPos - 1;
          for (let i: number = order.idx - 1; i > -1; i--) {
            if (vertices[i].getOptions(PX) <= movePos) {
              break;
            } else {
              vertices[i].setOptions(PX, movePos);
              movePos--;
            }
          }
        } else {
          const offset: number = origPos - leftMostPos - (order.idx - pivot);
          if (offset > 0) {
            // can move position by offset
            v.setOptions(PX, origPos - offset);
            let movePos: number = origPos - offset - 1;
            for (let i: number = order.idx - 1; i > -1; i--) {
              if (vertices[i].getOptions(PX) <= movePos) {
                break;
              } else {
                vertices[i].setOptions(PX, movePos);
                movePos--;
              }
            }
          }
        }
      }
    }
    if (shift > 0) {
      let pivot: number = order.idx;
      for (let i: number = order.idx + 1; i < vertices.length; i++) {
        if (vertices[i].getOptions(priorityKey) >= order.value) {
          pivot = i;
          break;
        }
      }
      if (pivot === order.idx) {
        // if vertex can be placed into the expected position
        v.setOptions(PX, reorderPos);
        let movePos: number = reorderPos + 1;
        for (let i: number = order.idx + 1; i < pivot; i++) {
          if (vertices[i].getOptions(PX) >= movePos) {
            break;
          } else {
            vertices[i].setOptions(PX, movePos);
            movePos++;
          }
        }
      } else {
        const rightMostPos: number = vertices[pivot].getOptions(PX);
        // if right most vertex with higher priority has larger enough position
        if (rightMostPos > reorderPos + (pivot - order.idx)) {
          v.setOptions(PX, reorderPos);
          let movePos: number = reorderPos + 1;
          for (let i: number = order.idx + 1; i < pivot; i++) {
            if (vertices[i].getOptions(PX) >= movePos) {
              break;
            } else {
              vertices[i].setOptions(PX, movePos);
              movePos++;
            }
          }
        } else {
          // if there is not enough space for moving vertice
          if (rightMostPos > origPos + (pivot - order.idx)) {
            let movePos: number = rightMostPos - (pivot - order.idx) - 1;
            for (let i: number = order.idx; i < pivot; i++) {
              vertices[i].setOptions(PX, movePos);
              movePos++;
            }
          }
        }
      }
    }
  })
}

function rmOptions(v: Vertex) {
  v.removeOptions('up');
  v.removeOptions('down');
  v.removeOptions('upPriority');
  v.removeOptions('downPriority');
  v.removeOptions(PX);
  v.removeOptions(PY);
}