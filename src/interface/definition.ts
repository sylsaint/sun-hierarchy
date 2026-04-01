import { BaryCentricOptions } from '@/algos/barycentric';
import { Vertex } from '@/interface/graph';

export interface LayoutOptions {
  margin?: Margin;
  gutter?: number;
  width: number;
  height: number;
  barycentricOptions?: BaryCentricOptions;
  /**
   * When true (default), all disconnected components (forests, isolated nodes)
   * are merged into a single graph and laid out side by side.
   * When false, each component is returned as a separate Graph.
   */
  mergeComponents?: boolean;
  /**
   * When true, use Skyline Algorithm to pack components compactly (like Tetris).
   * When false (default), place components side by side.
   * Only effective when `mergeComponents` is true.
   */
  compactComponents?: boolean;
}

export interface Margin {
  left?: number;
  right?: number;
  top?: number;
  bottom?: number;
}

export interface HashMap {
  [key: string]: any;
}

export interface VerticeMap {
  [key: number]: Array<Vertex>;
  [key: string]: Array<Vertex>;
}

export interface Priority {
  up: number;
  down: number;
}

export interface Order {
  value: number;
  idx: number;
}

export interface BKOptions {
  root: object;
  align: object;
  sink: object;
  shift: object;
}
