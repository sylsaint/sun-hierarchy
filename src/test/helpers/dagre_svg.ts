import * as fs from 'fs';
import * as path from 'path';
import * as dagre from 'dagre';

// ─────────────────────────────────────────────────────────
// SVG Generation for Dagre layout results
// ─────────────────────────────────────────────────────────

/** Style configuration (matches svg.ts defaults for fair comparison) */
interface SvgStyle {
  padding: number;
  nodeWidth: number;
  nodeHeight: number;
  fontSize: number;
  fontFamily: string;
  nodeFill: string;
  nodeStroke: string;
  edgeStroke: string;
  edgeWidth: number;
  bgColor: string;
  titleFontSize: number;
  statsFontSize: number;
}

const defaultStyle: SvgStyle = {
  padding: 60,
  nodeWidth: 120,
  nodeHeight: 40,
  fontSize: 13,
  fontFamily: "'SF Mono', 'Cascadia Code', 'Fira Code', Consolas, monospace",
  nodeFill: '#fde8e8',
  nodeStroke: '#d94a4a',
  edgeStroke: '#888',
  edgeWidth: 1.5,
  bgColor: '#ffffff',
  titleFontSize: 16,
  statsFontSize: 12,
};

/** Escape XML special characters */
function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Generate a bezier curve SVG path between two points with vertical tangents.
 * Matches the style used in sun-hierarchy's edge routing.
 */
function bezierPath(x1: number, y1: number, x2: number, y2: number): string {
  const dx = Math.abs(x2 - x1);
  const VERTICAL_THRESHOLD = 2;

  if (dx < VERTICAL_THRESHOLD) {
    return `M ${x1} ${y1} L ${x2} ${y2}`;
  }

  const vd = y2 - y1;
  const guideMin = 30;
  const guide = Math.max(guideMin, vd * 0.45, dx * 0.25);

  return `M ${x1} ${y1} C ${x1} ${y1 + guide}, ${x2} ${y2 - guide}, ${x2} ${y2}`;
}

/**
 * Generate a bezier path through multiple points (for dagre edge points).
 */
function bezierPathMulti(points: Array<{ x: number; y: number }>): string {
  if (points.length < 2) return '';
  if (points.length === 2) {
    return bezierPath(points[0].x, points[0].y, points[1].x, points[1].y);
  }

  // For 3+ points, use Catmull-Rom → cubic Bezier conversion
  const n = points.length;
  const parts: string[] = [`M ${points[0].x} ${points[0].y}`];
  const guideMin = 30;

  function guideArm(vd: number, dx: number): number {
    return Math.max(guideMin, vd * 0.45, dx * 0.25);
  }

  for (let i = 0; i < n - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(n - 1, i + 2)];

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

    parts.push(`C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`);
  }

  return parts.join(' ');
}

/**
 * Generate an SVG string from a dagre graph layout result.
 */
export function generateDagreSvg(
  g: dagre.graphlib.Graph,
  title = 'Dagre Layout',
  style: Partial<SvgStyle> = {},
): string {
  const s: SvgStyle = { ...defaultStyle, ...style };
  const nodes = g.nodes();
  const edgeObjs = g.edges();

  if (nodes.length === 0) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="60">
  <text x="100" y="35" text-anchor="middle" font-size="14" fill="#999">(empty layout)</text>
</svg>`;
  }

  // ── Collect node positions ──
  interface NodeInfo {
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
    label: string;
  }

  const nodeInfos: NodeInfo[] = [];
  const nodeMap = new Map<string, NodeInfo>();

  nodes.forEach((id) => {
    const node = g.node(id);
    if (!node) return;
    const info: NodeInfo = {
      id,
      x: node.x,
      y: node.y,
      width: node.width ?? s.nodeWidth,
      height: node.height ?? s.nodeHeight,
      label: String(id),
    };
    nodeInfos.push(info);
    nodeMap.set(id, info);
  });

  // ── Compute bounding box ──
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;

  nodeInfos.forEach(({ x, y, width, height }) => {
    const hw = width / 2;
    const hh = height / 2;
    if (x - hw < minX) minX = x - hw;
    if (y - hh < minY) minY = y - hh;
    if (x + hw > maxX) maxX = x + hw;
    if (y + hh > maxY) maxY = y + hh;
  });

  // Also consider edge points in bounding box
  edgeObjs.forEach((e) => {
    const edge = g.edge(e);
    if (edge && edge.points) {
      edge.points.forEach((p: { x: number; y: number }) => {
        if (p.x < minX) minX = p.x;
        if (p.y < minY) minY = p.y;
        if (p.x > maxX) maxX = p.x;
        if (p.y > maxY) maxY = p.y;
      });
    }
  });

  const titleAreaHeight = 40;
  const statsAreaHeight = 30;

  const svgWidth = maxX - minX + s.padding * 2;
  const svgHeight = maxY - minY + s.padding * 2 + titleAreaHeight + statsAreaHeight;

  const offsetX = s.padding - minX;
  const offsetY = s.padding - minY + titleAreaHeight;

  // ── Stats ──
  const statsText = `${nodes.length} nodes · ${edgeObjs.length} edges`;

  // ── Build SVG ──
  const parts: string[] = [];

  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${svgWidth}" height="${svgHeight}" viewBox="0 0 ${svgWidth} ${svgHeight}">`,
  );

  // Defs
  parts.push(`  <defs>`);
  parts.push(
    `    <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto" markerUnits="strokeWidth">`,
  );
  parts.push(`      <polygon points="0 0, 8 3, 0 6" fill="${s.edgeStroke}" />`);
  parts.push(`    </marker>`);
  parts.push(`    <filter id="shadow" x="-10%" y="-10%" width="130%" height="130%">`);
  parts.push(`      <feDropShadow dx="1" dy="1" stdDeviation="2" flood-opacity="0.15" />`);
  parts.push(`    </filter>`);
  parts.push(`  </defs>`);

  // Background
  parts.push(`  <rect width="100%" height="100%" fill="${s.bgColor}" rx="8" />`);

  // Title
  parts.push(
    `  <text x="${svgWidth / 2}" y="${titleAreaHeight / 2 + 6}" text-anchor="middle" font-size="${s.titleFontSize}" font-weight="600" font-family="${s.fontFamily}" fill="#333">${escapeXml(title)}</text>`,
  );

  // Title underline
  parts.push(
    `  <line x1="${s.padding / 2}" y1="${titleAreaHeight}" x2="${svgWidth - s.padding / 2}" y2="${titleAreaHeight}" stroke="#e0e0e0" stroke-width="1" />`,
  );

  // ── Draw edges ──
  parts.push(`  <g class="edges">`);
  edgeObjs.forEach((e) => {
    const edge = g.edge(e);
    if (!edge) return;

    const sourceNode = nodeMap.get(e.v);
    const targetNode = nodeMap.get(e.w);
    if (!sourceNode || !targetNode) return;

    // Build waypoints: source bottom → edge points → target top
    const waypoints: Array<{ x: number; y: number }> = [];

    // Source bottom center
    waypoints.push({
      x: sourceNode.x + offsetX,
      y: sourceNode.y + sourceNode.height / 2 + offsetY,
    });

    // Dagre edge intermediate points (skip first and last which are near node centers)
    if (edge.points && edge.points.length > 2) {
      for (let i = 1; i < edge.points.length - 1; i++) {
        waypoints.push({
          x: edge.points[i].x + offsetX,
          y: edge.points[i].y + offsetY,
        });
      }
    }

    // Target top center
    waypoints.push({
      x: targetNode.x + offsetX,
      y: targetNode.y - targetNode.height / 2 + offsetY,
    });

    const d = bezierPathMulti(waypoints);
    parts.push(
      `    <path d="${d}" fill="none" stroke="${s.edgeStroke}" stroke-width="${s.edgeWidth}" marker-end="url(#arrowhead)" />`,
    );
  });
  parts.push(`  </g>`);

  // ── Draw nodes ──
  parts.push(`  <g class="nodes">`);
  nodeInfos.forEach(({ x, y, width, height, label }) => {
    const nx = x + offsetX;
    const ny = y + offsetY;
    const rx = nx - width / 2;
    const ry = ny - height / 2;

    // Truncate long labels
    let displayLabel = label;
    if (displayLabel.length > 14) {
      displayLabel = displayLabel.slice(0, 12) + '..';
    }

    parts.push(
      `    <rect x="${rx}" y="${ry}" width="${width}" height="${height}" rx="6" ry="6" fill="${s.nodeFill}" stroke="${s.nodeStroke}" stroke-width="1.5" filter="url(#shadow)" />`,
    );
    parts.push(
      `    <text x="${nx}" y="${ny + s.fontSize * 0.35}" text-anchor="middle" font-size="${s.fontSize}" font-family="${s.fontFamily}" fill="#333">${escapeXml(displayLabel)}</text>`,
    );
  });
  parts.push(`  </g>`);

  // Stats bar
  const statsY = svgHeight - statsAreaHeight / 2 + 4;
  parts.push(
    `  <line x1="${s.padding / 2}" y1="${svgHeight - statsAreaHeight}" x2="${svgWidth - s.padding / 2}" y2="${svgHeight - statsAreaHeight}" stroke="#e0e0e0" stroke-width="1" />`,
  );
  parts.push(
    `  <text x="${svgWidth / 2}" y="${statsY}" text-anchor="middle" font-size="${s.statsFontSize}" font-family="${s.fontFamily}" fill="#999">${escapeXml(statsText)}</text>`,
  );

  parts.push(`</svg>`);

  return parts.join('\n');
}

/**
 * Save an SVG file for a dagre layout result.
 */
export function saveDagreSvg(
  g: dagre.graphlib.Graph,
  filename: string,
  title = 'Dagre Layout',
  outputDir?: string,
): string {
  const dir = outputDir ?? path.resolve(process.cwd(), 'svg-output');

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const safeName = filename.replace(/[^a-zA-Z0-9_-]/g, '_');
  const filePath = path.join(dir, `${safeName}.svg`);

  const svgContent = generateDagreSvg(g, title);
  fs.writeFileSync(filePath, svgContent, 'utf-8');

  return filePath;
}
