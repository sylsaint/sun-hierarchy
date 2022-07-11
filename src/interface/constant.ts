// default property name for graph
export const PX = '_x';
export const PY = '_y';
export const DUMMY = 'dummy';

// direction
export const LEFT = 'left';
export const RIGHT = 'right';
export const UPPER = 'upper';
export const LOWER = 'lower';

// layout settings
export interface LayoutOptions {
  // extra space for node except width and height 
  padding: number | Padding;
  // horizontal distance between adjacent nodes
  gutter: number;
  // settings for node width
  width: number;
  // settings for node height 
  height: number;
  delta: number,
}

// 
export interface Padding {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export interface HashMap {
  [key: string]: any;
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
  root: object,
  align: object,
  sink: object,
  shift: object,
}

export const defaultOptions: LayoutOptions = {
  padding: { left: 0, right: 0, top: 0, bottom: 0 },
  width: 100,
  height: 50,
  gutter: 0,
  delta: 1,
};