import { Grid, GridPoint, ShortestPath } from './index';

function isEqual(p1: GridPoint, p2: GridPoint): boolean {
  return p1.x === p2.x && p1.y === p2.y;
}

function isBarrier(p: GridPoint, grid: Grid): boolean {
  const v: number = grid[p.y][p.x];
  return v == 1;
}

export function breadFirstShortestGridSearch(grid: Grid, start: GridPoint, end: GridPoint): ShortestPath {
  // visited points
  const visited: { [key: string]: boolean } = {};
  // prev map
  const prevLink: { [key: string]: string } = {};
  // top, right, bottom, left, top-right, bottom-right, bottom-left, top-left
  const directionX: number[] = [0, 1, 0, -1, 1, 1, -1, -1];
  const directionY: number[] = [-1, 0, 1, 0, -1, 1, 1, -1];

  let tmp: GridPoint = { ...start };
  const pointStack: GridPoint[] = [tmp];
  const depth: { [key: string]: number } = {};
  let distance: number = 1;
  depth[`${tmp.x}-${tmp.y}`] = distance;
  let needBreak: boolean = false;
  while (pointStack.length) {
    const point: GridPoint = pointStack.shift() as GridPoint;
    visited[`${point.x}_${point.y}`] = true;
    for (let i = 0; i < directionX.length; i++) {
      tmp = { x: point.x + directionX[i], y: point.y + directionY[i] };
      if (tmp.x < 0 || tmp.x >= grid[0].length) continue;
      if (tmp.y < 0 || tmp.y >= grid.length) continue;
      if (visited[`${tmp.x}_${tmp.y}`]) continue;
      if (isBarrier(tmp, grid)) continue;
      if (depth[`${tmp.x}-${tmp.y}`] && depth[`${tmp.x}-${tmp.y}`] <= depth[`${point.x}-${point.y}`]) {
        continue;
      }
      depth[`${tmp.x}-${tmp.y}`] = depth[`${point.x}-${point.y}`] + 1;
      prevLink[`${tmp.x}-${tmp.y}`] = `${point.x}-${point.y}`;
      pointStack.push(tmp);
      if (isEqual(tmp, end)) {
        needBreak = true;
        break;
      }
    }
    if (needBreak) break;
  }
  const shortestPath: ShortestPath = { start, end, points: [] };
  tmp = { ...end };
  let hasPath: boolean = true;
  while (!isEqual(start, tmp)) {
    shortestPath.points.push(tmp);
    const prev = prevLink[`${tmp.x}-${tmp.y}`];
    if (prev) {
      const [x, y] = prev.split('-');
      tmp = { x: parseInt(x), y: parseInt(y) };
    } else {
      hasPath = false;
      break;
    }
  }
  if (hasPath) {
    shortestPath.points.push(start);
  } else {
    shortestPath.points = [];
  }
  shortestPath.points.reverse();
  return shortestPath;
}
