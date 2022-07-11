import { expect } from 'chai';
import { ShortestPath, Grid } from '../path/index';
import { breadFirstShortestGridSearch } from '../path/grid';

describe('Grid shortest path', () => {
  const grid1: Grid = [
      [0, 0, 1, 0, 0],
      [0, 1, 1, 0, 0],
      [0, 1, 0, 1, 0],
      [0, 0, 1, 0, 0]
  ];
  const grid2: Grid = [
      [0, 0, 1, 0, 0],
      [0, 1, 1, 0, 0],
      [0, 1, 0, 1, 0],
      [0, 1, 1, 0, 0]
  ];
  it('#with path', () => {
    const shortest: ShortestPath = breadFirstShortestGridSearch(grid1, { x: 0, y: 1}, { x: 3, y: 3});
    expect(shortest.points.length).equal(5);
  });
  it('#no path', () => {
    const shortest: ShortestPath = breadFirstShortestGridSearch(grid2, { x: 0, y: 1}, { x: 3, y: 3});
    expect(shortest.points.length).equal(0);
  });
});

