import * as fs from 'fs';
import * as path from 'path';
import { Vertex } from '@/interface/graph';
import { DUMMY } from '@/interface/constant';

// ─────────────────────────────────────────────────────────
// SVG Generation
// ─────────────────────────────────────────────────────────

/** Style configuration for SVG rendering */
interface SvgStyle {
  /** Padding around the entire SVG content */
  padding: number;
  /** Node rectangle width */
  nodeWidth: number;
  /** Node rectangle height */
  nodeHeight: number;
  /** Dummy node radius */
  dummyRadius: number;
  /** Font size for node labels */
  fontSize: number;
  /** Font family */
  fontFamily: string;
  /** Node fill color */
  nodeFill: string;
  /** Node stroke color */
  nodeStroke: string;
  /** Dummy node fill color */
  dummyFill: string;
  /** Edge stroke color */
  edgeStroke: string;
  /** Edge stroke width */
  edgeWidth: number;
  /** Background color */
  bgColor: string;
  /** Title font size */
  titleFontSize: number;
  /** Stats font size */
  statsFontSize: number;
}

const defaultStyle: SvgStyle = {
  padding: 60,
  nodeWidth: 120,
  nodeHeight: 40,
  dummyRadius: 5,
  fontSize: 13,
  fontFamily: "'SF Mono', 'Cascadia Code', 'Fira Code', Consolas, monospace",
  nodeFill: '#e8f4fd',
  nodeStroke: '#4a90d9',
  dummyFill: '#ccc',
  edgeStroke: '#888',
  edgeWidth: 1.5,
  bgColor: '#ffffff',
  titleFontSize: 16,
  statsFontSize: 12,
};

/** Threshold (in px) to treat two x-coordinates as vertically aligned */
const VERTICAL_THRESHOLD = 2;

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
 * Generate an SVG string from layout levels.
 *
 * Each vertex must have `x` and `y` options set (from the layout algorithm).
 * Dummy nodes (type === DUMMY) are rendered as small dots.
 * Edges are drawn as smooth cubic bezier curves with arrowheads.
 */
export function generateSvg(levels: Vertex[][], title = 'Hierarchical Layout', style: Partial<SvgStyle> = {}): string {
  const s: SvgStyle = { ...defaultStyle, ...style };
  const all = levels.flatMap((v) => v);

  if (all.length === 0) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="60">
  <text x="100" y="35" text-anchor="middle" font-size="14" fill="#999">(empty layout)</text>
</svg>`;
  }

  // ── Compute node positions (center of each node) ──
  const nodes: {
    v: Vertex;
    cx: number;
    cy: number;
    label: string;
    isDummy: boolean;
  }[] = [];

  // Build a map from vertex id to node info
  const nodeMap = new Map<string | number, { cx: number; cy: number; isDummy: boolean }>();

  // ── Collect raw positions and compute scale factors ──
  // The layout algorithm places nodes at (xs * layoutWidth, level * layoutHeight)
  // where gutter may be 0, causing overlap. We need to scale coordinates so that
  // nodes have enough spacing.
  const rawPositions = all.map((v) => ({
    v,
    isDummy: v.getOptions('type') === DUMMY,
    rawX: (v.getOptions('x') ?? 0) as number,
    rawY: (v.getOptions('y') ?? 0) as number,
  }));

  // Find unique sorted x and y values to compute actual spacing
  const uniqueX = Array.from(new Set(rawPositions.map((p) => p.rawX))).sort((a, b) => a - b);
  const uniqueY = Array.from(new Set(rawPositions.map((p) => p.rawY))).sort((a, b) => a - b);

  // Compute minimum gap between adjacent unique coordinates
  const minGapX =
    uniqueX.length > 1
      ? Math.min(
          ...uniqueX
            .slice(1)
            .map((v, i) => v - uniqueX[i])
            .filter((g) => g > 0),
        )
      : 1;
  const minGapY =
    uniqueY.length > 1
      ? Math.min(
          ...uniqueY
            .slice(1)
            .map((v, i) => v - uniqueY[i])
            .filter((g) => g > 0),
        )
      : 1;

  // Desired spacing: node size + comfortable gap
  const desiredGapX = s.nodeWidth + 40; // 40px horizontal gap between nodes
  const desiredGapY = s.nodeHeight + 60; // 60px vertical gap between layers

  // Scale factors to ensure minimum spacing
  const scaleX = minGapX < desiredGapX ? desiredGapX / minGapX : 1;
  const scaleY = minGapY < desiredGapY ? desiredGapY / minGapY : 1;

  rawPositions.forEach(({ v, isDummy, rawX, rawY }) => {
    const label = isDummy ? '' : String(v.id);
    const scaledX = rawX * scaleX;
    const scaledY = rawY * scaleY;
    // Center the node at (scaledX + nodeWidth/2, scaledY + nodeHeight/2)
    const cx = scaledX + s.nodeWidth / 2;
    const cy = scaledY + s.nodeHeight / 2;
    nodes.push({ v, cx, cy, label, isDummy });
    nodeMap.set(v.id, { cx, cy, isDummy });
  });

  // ── Compute bounding box ──
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  nodes.forEach(({ cx, cy, isDummy }) => {
    const hw = isDummy ? s.dummyRadius : s.nodeWidth / 2;
    const hh = isDummy ? s.dummyRadius : s.nodeHeight / 2;
    if (cx - hw < minX) minX = cx - hw;
    if (cy - hh < minY) minY = cy - hh;
    if (cx + hw > maxX) maxX = cx + hw;
    if (cy + hh > maxY) maxY = cy + hh;
  });

  // Title and stats area
  const titleAreaHeight = 40;
  const statsAreaHeight = 30;

  const svgWidth = maxX - minX + s.padding * 2;
  const svgHeight = maxY - minY + s.padding * 2 + titleAreaHeight + statsAreaHeight;

  // Offset to shift all coordinates into the padded area
  const offsetX = s.padding - minX;
  const offsetY = s.padding - minY + titleAreaHeight;

  // ── Collect unique edges ──
  const edgeSet = new Set<string>();
  const edges: { fromId: string | number; toId: string | number }[] = [];
  all.forEach((v) => {
    v.edges.forEach((e) => {
      if (e.up === v || e.up.id === v.id) {
        const key = `${e.up.id}::${e.down.id}`;
        if (!edgeSet.has(key)) {
          edgeSet.add(key);
          edges.push({ fromId: e.up.id, toId: e.down.id });
        }
      }
    });
  });

  // ── Stats ──
  const realNodes = all.filter((v) => v.getOptions('type') !== DUMMY).length;
  const dummyNodes = all.length - realNodes;
  const statsText = `${realNodes} nodes \u00b7 ${dummyNodes} dummy \u00b7 ${edges.length} edges \u00b7 ${levels.length} levels`;

  // ── Build SVG ──
  const parts: string[] = [];

  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${svgWidth}" height="${svgHeight}" viewBox="0 0 ${svgWidth} ${svgHeight}">`,
  );

  // Defs: arrowhead marker, drop shadow filter
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
  edges.forEach(({ fromId, toId }) => {
    const from = nodeMap.get(fromId);
    const to = nodeMap.get(toId);
    if (!from || !to) return;

    const x1 = from.cx + offsetX;
    const y1 = from.cy + offsetY;
    const x2 = to.cx + offsetX;
    const y2 = to.cy + offsetY;

    // Adjust start/end points to node boundaries
    const fromHH = from.isDummy ? s.dummyRadius : s.nodeHeight / 2;
    const toHH = to.isDummy ? s.dummyRadius : s.nodeHeight / 2;

    const startY = y1 + fromHH;
    const endY = y2 - toHH;

    // For dummy target nodes, don't show arrowhead
    const markerEnd = to.isDummy ? '' : ' marker-end="url(#arrowhead)"';

    const dx = Math.abs(x2 - x1);
    let pathD: string;

    if (dx < VERTICAL_THRESHOLD) {
      // Vertical line: use a straight line
      pathD = `M ${x1} ${startY} L ${x2} ${endY}`;
    } else {
      // Non-vertical: use a smooth cubic bezier curve
      // Control points extend ~40% of the vertical distance for a natural S-curve
      const vertDist = endY - startY;
      const cp1Y = startY + vertDist * 0.4;
      const cp2Y = endY - vertDist * 0.4;
      pathD = `M ${x1} ${startY} C ${x1} ${cp1Y}, ${x2} ${cp2Y}, ${x2} ${endY}`;
    }

    parts.push(
      `    <path d="${pathD}" fill="none" stroke="${s.edgeStroke}" stroke-width="${s.edgeWidth}"${markerEnd} />`,
    );
  });
  parts.push(`  </g>`);

  // ── Draw nodes ──
  parts.push(`  <g class="nodes">`);
  nodes.forEach(({ cx, cy, label, isDummy }) => {
    const x = cx + offsetX;
    const y = cy + offsetY;

    if (isDummy) {
      // Dummy node: small filled circle
      parts.push(
        `    <circle cx="${x}" cy="${y}" r="${s.dummyRadius}" fill="${s.dummyFill}" stroke="${s.dummyFill}" stroke-width="1" />`,
      );
    } else {
      // Real node: rounded rectangle with label
      const rx = x - s.nodeWidth / 2;
      const ry = y - s.nodeHeight / 2;

      // Truncate long labels
      let displayLabel = label;
      if (displayLabel.length > 14) {
        displayLabel = displayLabel.slice(0, 12) + '..';
      }

      parts.push(
        `    <rect x="${rx}" y="${ry}" width="${s.nodeWidth}" height="${s.nodeHeight}" rx="6" ry="6" fill="${s.nodeFill}" stroke="${s.nodeStroke}" stroke-width="1.5" filter="url(#shadow)" />`,
      );
      parts.push(
        `    <text x="${x}" y="${y + s.fontSize * 0.35}" text-anchor="middle" font-size="${s.fontSize}" font-family="${s.fontFamily}" fill="#333">${escapeXml(displayLabel)}</text>`,
      );
    }
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

/** Resolve the default SVG output directory */
function resolveOutputDir(outputDir?: string): string {
  return outputDir ?? path.resolve(process.cwd(), 'svg-output');
}

/**
 * Save an SVG file for a layout result.
 *
 * @param levels - The layout levels (vertices with x, y options set)
 * @param filename - The output filename (without extension)
 * @param title - The title to display in the SVG
 * @param outputDir - The output directory (default: `svg-output/` in project root)
 */
export function saveSvg(
  levels: Vertex[][],
  filename: string,
  title = 'Hierarchical Layout',
  outputDir?: string,
): string {
  const dir = resolveOutputDir(outputDir);

  // Ensure output directory exists
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Sanitize filename
  const safeName = filename.replace(/[^a-zA-Z0-9_-]/g, '_');
  const filePath = path.join(dir, `${safeName}.svg`);

  const svgContent = generateSvg(levels, title);
  fs.writeFileSync(filePath, svgContent, 'utf-8');

  return filePath;
}

/**
 * Generate an HTML index page that embeds all SVG files in a directory.
 * This creates a gallery view for easy browsing.
 */
export function generateSvgIndex(outputDir?: string): string {
  const dir = resolveOutputDir(outputDir);

  if (!fs.existsSync(dir)) {
    return '';
  }

  const svgFiles = fs
    .readdirSync(dir)
    .filter((f: string) => f.endsWith('.svg'))
    .sort();

  if (svgFiles.length === 0) return '';

  const cards = svgFiles
    .map((file: string) => {
      const name = file.replace('.svg', '').replace(/_/g, ' ');
      return `    <div class="card">
      <h3>${escapeXml(name)}</h3>
      <div class="svg-container">
        <object data="${file}" type="image/svg+xml" width="100%"></object>
      </div>
    </div>`;
    })
    .join('\n');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sun-Hierarchy Layout Gallery</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f5f5f5;
      padding: 24px;
      color: #333;
    }
    h1 {
      text-align: center;
      margin-bottom: 8px;
      font-size: 28px;
      color: #222;
    }
    .subtitle {
      text-align: center;
      color: #888;
      margin-bottom: 32px;
      font-size: 14px;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(500px, 1fr));
      gap: 24px;
      max-width: 1600px;
      margin: 0 auto;
    }
    .card {
      background: #fff;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
      overflow: hidden;
      transition: box-shadow 0.2s;
    }
    .card:hover {
      box-shadow: 0 4px 16px rgba(0,0,0,0.15);
    }
    .card h3 {
      padding: 16px 20px 12px;
      font-size: 15px;
      color: #555;
      border-bottom: 1px solid #f0f0f0;
      text-transform: capitalize;
    }
    .svg-container {
      padding: 16px;
      overflow-x: auto;
    }
  </style>
</head>
<body>
  <h1>\ud83c\udf33 Sun-Hierarchy Layout Gallery</h1>
  <p class="subtitle">Generated from test suite \u00b7 ${svgFiles.length} layouts</p>
  <div class="grid">
${cards}
  </div>
</body>
</html>`;

  const indexPath = path.join(dir, 'index.html');
  fs.writeFileSync(indexPath, html, 'utf-8');
  return indexPath;
}
