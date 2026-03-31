/**
 * Edge Routing Module
 *
 * Generates connection paths (bezier curves, orthogonal lines, etc.)
 * between nodes after layout. This is a core layout capability —
 * callers receive path data and can render it however they like
 * (SVG, Canvas, WebGL, etc.).
 */

import { Vertex } from '@/interface/graph';
import { DUMMY } from '@/interface/constant';

// ─────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────

/** A 2D point */
export interface Point {
  x: number;
  y: number;
}

/**
 * A single SVG-style path command.
 *
 * - `M` : moveTo(x, y)
 * - `L` : lineTo(x, y)
 * - `C` : cubicBezier(cp1x, cp1y, cp2x, cp2y, x, y)
 */
export type PathCommand =
  | { type: 'M'; x: number; y: number }
  | { type: 'L'; x: number; y: number }
  | { type: 'C'; cp1x: number; cp1y: number; cp2x: number; cp2y: number; x: number; y: number };

/**
 * Describes the routed path for one logical edge (source → target).
 *
 * A "logical edge" may span multiple levels (through dummy nodes);
 * the path merges the entire chain into one continuous route.
 */
export interface EdgePath {
  /** ID of the source (real) vertex */
  sourceId: string | number;
  /** ID of the target (real) vertex */
  targetId: string | number;
  /** Ordered waypoints the path passes through (including source/target connection points) */
  points: Point[];
  /** Structured path commands — can be converted to SVG `d` attribute or used directly */
  commands: PathCommand[];
  /** Pre-built SVG path `d` attribute string for convenience */
  svgPath: string;
}

/**
 * A path generator function.
 *
 * Given an ordered list of waypoints (first = source connection point,
 * last = target connection point, middle = dummy node centers), produce
 * the SVG path `d` string and structured commands.
 */
export type PathGenerator = (points: Point[]) => {
  svgPath: string;
  commands: PathCommand[];
};

/** Options for edge routing */
export interface EdgeRouteOptions {
  /** Node width — used to compute connection points (default: 100) */
  nodeWidth?: number;
  /** Node height — used to compute connection points (default: 50) */
  nodeHeight?: number;
  /** Dummy node radius (default: 5) */
  dummyRadius?: number;
  /**
   * Path generation strategy.
   * - `'bezier'`      — smooth cubic bezier S-curves (default)
   * - `'orthogonal'`  — right-angle polylines
   * - A custom `PathGenerator` function
   */
  pathGenerator?: 'bezier' | 'orthogonal' | PathGenerator;
  /**
   * Minimum vertical "guide arm" length for bezier curves.
   * Controls how far the control point extends vertically from
   * the endpoint to ensure a vertical tangent. (default: 30)
   * Only used when pathGenerator is 'bezier'.
   */
  bezierGuideMin?: number;
  /**
   * Custom position function to override vertex coordinates.
   * When provided, this function is called for each vertex to
   * obtain its rendered position instead of reading from
   * `vertex.getOptions('x'/'y')`. This is useful when the
   * renderer applies scaling, offsets, or other transforms.
   *
   * @param vertex - The vertex to get position for
   * @returns The rendered center position of the vertex
   */
  positionFn?: (vertex: Vertex) => Point;
}

// ─────────────────────────────────────────────────────────
// Built-in Path Generators
// ─────────────────────────────────────────────────────────

/** Threshold (in px) to treat two x-coordinates as vertically aligned */
const VERTICAL_THRESHOLD = 2;

/**
 * Create a bezier path generator with the given guide arm minimum.
 *
 * The curve uses Catmull-Rom → cubic Bezier conversion for interior
 * segments. At the first and last segments, control points are placed
 * directly above/below the endpoint (same x) so the tangent is
 * perfectly vertical — producing a smooth curve that naturally
 * straightens into a vertical approach at both ends.
 */
export function createBezierGenerator(guideMin = 30): PathGenerator {
  /**
   * Compute the vertical guide arm length for an endpoint.
   *
   * The guide arm determines how far the bezier control point sits
   * vertically from the endpoint (keeping the same x), which forces
   * the curve tangent to be vertical at that point.
   *
   * A longer guide arm = a longer visually-vertical segment before
   * the curve starts bending horizontally.
   *
   * The arm length scales with:
   * - The vertical distance between the two points (vd)
   * - The horizontal span (dx) — wider spans need longer vertical
   *   runs so the curve doesn't immediately shoot sideways
   *
   * Formula: max(guideMin, vd * 0.45, dx * 0.25)
   *
   * The dx * 0.25 term ensures that even for very wide horizontal
   * spans, the vertical segment is proportionally long enough to
   * look natural and stay above the arrowhead height.
   */
  function guideArm(vd: number, dx: number): number {
    return Math.max(guideMin, vd * 0.45, dx * 0.25);
  }

  return (pts: Point[]) => {
    if (pts.length < 2) return { svgPath: '', commands: [] };

    const commands: PathCommand[] = [];

    if (pts.length === 2) {
      const [p0, p1] = pts;
      const dx = Math.abs(p1.x - p0.x);

      commands.push({ type: 'M', x: p0.x, y: p0.y });

      if (dx < VERTICAL_THRESHOLD) {
        // Straight vertical line
        commands.push({ type: 'L', x: p1.x, y: p1.y });
      } else {
        // S-curve with vertical tangents at both ends
        const vd = p1.y - p0.y;
        const guide = guideArm(vd, dx);
        commands.push({
          type: 'C',
          cp1x: p0.x,
          cp1y: p0.y + guide,
          cp2x: p1.x,
          cp2y: p1.y - guide,
          x: p1.x,
          y: p1.y,
        });
      }
    } else {
      // 3+ points: Catmull-Rom with vertical-tangent overrides at ends
      const n = pts.length;
      commands.push({ type: 'M', x: pts[0].x, y: pts[0].y });

      for (let i = 0; i < n - 1; i++) {
        const p0 = pts[Math.max(0, i - 1)];
        const p1 = pts[i];
        const p2 = pts[i + 1];
        const p3 = pts[Math.min(n - 1, i + 2)];

        const tension = 6;
        let cp1x = p1.x + (p2.x - p0.x) / tension;
        let cp1y = p1.y + (p2.y - p0.y) / tension;
        let cp2x = p2.x - (p3.x - p1.x) / tension;
        let cp2y = p2.y - (p3.y - p1.y) / tension;

        // First segment: vertical departure
        if (i === 0) {
          const segH = p2.y - p1.y;
          const dx = Math.abs(p2.x - p1.x);
          cp1x = p1.x;
          cp1y = p1.y + guideArm(segH, dx);
        }

        // Last segment: vertical arrival
        if (i === n - 2) {
          const segH = p2.y - p1.y;
          const dx = Math.abs(p2.x - p1.x);
          cp2x = p2.x;
          cp2y = p2.y - guideArm(segH, dx);
        }

        commands.push({
          type: 'C',
          cp1x,
          cp1y,
          cp2x,
          cp2y,
          x: p2.x,
          y: p2.y,
        });
      }
    }

    return { svgPath: commandsToSvgPath(commands), commands };
  };
}

/**
 * Create an orthogonal (right-angle) path generator.
 *
 * The path leaves the source vertically downward, makes a horizontal
 * jog at the midpoint, then enters the target vertically downward.
 * Through dummy nodes, the path follows a staircase pattern.
 */
export function createOrthogonalGenerator(): PathGenerator {
  return (pts: Point[]) => {
    if (pts.length < 2) return { svgPath: '', commands: [] };

    const commands: PathCommand[] = [];
    commands.push({ type: 'M', x: pts[0].x, y: pts[0].y });

    for (let i = 0; i < pts.length - 1; i++) {
      const cur = pts[i];
      const next = pts[i + 1];
      const dx = Math.abs(next.x - cur.x);

      if (dx < VERTICAL_THRESHOLD) {
        // Already vertically aligned — straight line
        commands.push({ type: 'L', x: next.x, y: next.y });
      } else {
        // Orthogonal routing: go down to midpoint Y, jog horizontally, then down
        const midY = (cur.y + next.y) / 2;
        commands.push({ type: 'L', x: cur.x, y: midY });
        commands.push({ type: 'L', x: next.x, y: midY });
        commands.push({ type: 'L', x: next.x, y: next.y });
      }
    }

    return { svgPath: commandsToSvgPath(commands), commands };
  };
}

// ─────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────

/** Convert structured path commands to an SVG `d` attribute string */
export function commandsToSvgPath(commands: PathCommand[]): string {
  return commands
    .map((cmd) => {
      switch (cmd.type) {
        case 'M':
          return `M ${cmd.x} ${cmd.y}`;
        case 'L':
          return `L ${cmd.x} ${cmd.y}`;
        case 'C':
          return `C ${cmd.cp1x} ${cmd.cp1y}, ${cmd.cp2x} ${cmd.cp2y}, ${cmd.x} ${cmd.y}`;
      }
    })
    .join(' ');
}

// ─────────────────────────────────────────────────────────
// Main API
// ─────────────────────────────────────────────────────────

/**
 * Route edges for a laid-out hierarchy.
 *
 * Given the levels produced by the layout algorithm (with x/y
 * coordinates assigned), this function:
 *
 * 1. Collects all directed edges
 * 2. Merges dummy-node chains into single logical edges
 * 3. Generates a path for each logical edge using the chosen strategy
 *
 * The returned `EdgePath[]` contains everything a renderer needs:
 * waypoints, structured commands, and a ready-to-use SVG path string.
 *
 * @example
 * ```ts
 * // Use built-in bezier (default)
 * const paths = routeEdges(levels);
 * paths.forEach(p => console.log(p.svgPath));
 *
 * // Use orthogonal routing
 * const paths = routeEdges(levels, { pathGenerator: 'orthogonal' });
 *
 * // Use custom generator
 * const paths = routeEdges(levels, {
 *   pathGenerator: (points) => ({
 *     svgPath: `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`,
 *     commands: [
 *       { type: 'M', x: points[0].x, y: points[0].y },
 *       { type: 'L', x: points[1].x, y: points[1].y },
 *     ],
 *   }),
 * });
 * ```
 */
export function routeEdges(levels: Vertex[][], options: EdgeRouteOptions = {}): EdgePath[] {
  const { nodeWidth = 100, nodeHeight = 50, dummyRadius = 5, pathGenerator = 'bezier', bezierGuideMin = 30 } = options;

  const all = levels.flatMap((v) => v);
  if (all.length === 0) return [];

  // ── Resolve path generator ──
  let generate: PathGenerator;
  if (typeof pathGenerator === 'function') {
    generate = pathGenerator;
  } else if (pathGenerator === 'orthogonal') {
    generate = createOrthogonalGenerator();
  } else {
    generate = createBezierGenerator(bezierGuideMin);
  }

  // ── Build node position map ──
  const nodeMap = new Map<string | number, { x: number; y: number; isDummy: boolean }>();
  all.forEach((v) => {
    const isDummy = v.getOptions('type') === DUMMY;
    if (options.positionFn) {
      const pos = options.positionFn(v);
      nodeMap.set(v.id, { x: pos.x, y: pos.y, isDummy });
    } else {
      const x = (v.getOptions('x') ?? 0) as number;
      const y = (v.getOptions('y') ?? 0) as number;
      nodeMap.set(v.id, { x, y, isDummy });
    }
  });

  // ── Collect unique directed edges ──
  const edgeSet = new Set<string>();
  const rawEdges: { fromId: string | number; toId: string | number }[] = [];
  all.forEach((v) => {
    v.edges.forEach((e) => {
      if (e.up === v || e.up.id === v.id) {
        const key = `${e.up.id}::${e.down.id}`;
        if (!edgeSet.has(key)) {
          edgeSet.add(key);
          rawEdges.push({ fromId: e.up.id, toId: e.down.id });
        }
      }
    });
  });

  // ── Build forward adjacency for dummy-chain merging ──
  const fwdAdj = new Map<string | number, (string | number)[]>();
  rawEdges.forEach(({ fromId, toId }) => {
    if (!fwdAdj.has(fromId)) fwdAdj.set(fromId, []);
    fwdAdj.get(fromId)!.push(toId);
  });

  /** Trace a chain: real → dummy → ... → dummy → real */
  function traceDummyChain(startId: string | number, nextId: string | number): (string | number)[] {
    const chain = [startId, nextId];
    let current = nextId;
    while (true) {
      const node = nodeMap.get(current);
      if (!node || !node.isDummy) break;
      const children = fwdAdj.get(current);
      if (!children || children.length !== 1) break;
      chain.push(children[0]);
      current = children[0];
    }
    return chain;
  }

  // ── Merge dummy chains and collect logical edges ──
  const drawnEdges = new Set<string>();

  interface LogicalEdge {
    sourceId: string | number;
    targetId: string | number;
    chain: (string | number)[];
  }

  const logicalEdges: LogicalEdge[] = [];

  rawEdges.forEach(({ fromId, toId }) => {
    const key = `${fromId}::${toId}`;
    if (drawnEdges.has(key)) return;

    const fromNode = nodeMap.get(fromId);
    const toNode = nodeMap.get(toId);
    if (!fromNode || !toNode) return;

    if (!fromNode.isDummy && toNode.isDummy) {
      // Start of a dummy chain
      const chain = traceDummyChain(fromId, toId);
      for (let i = 0; i < chain.length - 1; i++) {
        drawnEdges.add(`${chain[i]}::${chain[i + 1]}`);
      }
      const lastId = chain[chain.length - 1];
      logicalEdges.push({ sourceId: fromId, targetId: lastId, chain });
    } else {
      drawnEdges.add(key);
      logicalEdges.push({ sourceId: fromId, targetId: toId, chain: [fromId, toId] });
    }
  });

  // ── Generate paths ──
  const halfW = nodeWidth / 2;
  const halfH = nodeHeight / 2;

  return logicalEdges.map(({ sourceId, targetId, chain }) => {
    // Build waypoints: connection points on node edges + dummy centers
    const points: Point[] = [];

    for (let i = 0; i < chain.length; i++) {
      const node = nodeMap.get(chain[i])!;

      if (i === 0) {
        // Source: bottom edge center
        const hh = node.isDummy ? dummyRadius : halfH;
        points.push({ x: node.x, y: node.y + hh });
      } else if (i === chain.length - 1) {
        // Target: top edge center
        const hh = node.isDummy ? dummyRadius : halfH;
        points.push({ x: node.x, y: node.y - hh });
      } else {
        // Dummy node: center
        points.push({ x: node.x, y: node.y });
      }
    }

    const { svgPath, commands } = generate(points);

    return {
      sourceId,
      targetId,
      points,
      commands,
      svgPath,
    };
  });
}
