import { LayoutOptions } from '@/interface/definition';

// default property name for graph
export const PX = '_x';
export const PY = '_y';
export const DUMMY = 'dummy';


export enum Direction { 
  LEFT,
  RIGHT,
  UP,
  DOWN
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
  margin: { left: 0, right: 0, top: 0, bottom: 0 },
  width: 100,
  height: 50,
  gutter: 0,
};