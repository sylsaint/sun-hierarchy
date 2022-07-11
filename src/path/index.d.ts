export interface ShortestPath {
    start: GridPoint;
    end: GridPoint;
    points: GridPoint[];
}

export interface GridPoint {
    x: number;
    y: number;
}

export type Grid = Array<Array<number>>;
