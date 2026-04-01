import * as fs from 'fs';
import * as path from 'path';
import { Vertex } from '@/interface/graph';
import { DUMMY } from '@/interface/constant';
import { routeEdges } from '@/algos/edgeRouting';

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

  // ── Position strategy ──
  // Check whether the layout algorithm has assigned meaningful x/y coordinates.
  // If all nodes share the same x (or y), coordinates are missing and we must
  // fall back to computing positions from the levels structure directly.
  const rawXValues = all.map((v) => (v.getOptions('x') ?? 0) as number);
  const rawYValues = all.map((v) => (v.getOptions('y') ?? 0) as number);
  const uniqueRawX = new Set(rawXValues);
  const uniqueRawY = new Set(rawYValues);
  const hasValidCoords = uniqueRawX.size > 1 || uniqueRawY.size > 1;

  // Desired center-to-center spacing for fallback layout
  const cellWidth = s.nodeWidth + 60; // 60px gap between node edges horizontally
  const cellHeight = s.nodeHeight + 80; // 80px gap between layer edges vertically

  if (hasValidCoords) {
    // ── Scaled layout from algorithm coordinates ──
    // Use the layout algorithm's coordinates directly, applying a scale factor
    // to ensure nodes don't overlap. This preserves the algorithm's relative
    // positioning (including compact dummy node placement) while guaranteeing
    // comfortable spacing for rendering.

    // Find minimum non-zero x gap between adjacent real nodes ON THE SAME
    // LEVEL. Cross-level gaps are irrelevant because nodes on different
    // levels don't overlap horizontally.
    const sortedUniqueX = Array.from(uniqueRawX).sort((a, b) => a - b);
    const sortedUniqueY = Array.from(uniqueRawY).sort((a, b) => a - b);

    let minXGap = Infinity;
    // Group real nodes by level (y-value) and find per-level minimum gaps
    const levelGroups = new Map<number, number[]>();
    all.forEach((v) => {
      if (v.getOptions('type') === DUMMY) return;
      const rawY = (v.getOptions('y') ?? 0) as number;
      const rawX = (v.getOptions('x') ?? 0) as number;
      if (!levelGroups.has(rawY)) levelGroups.set(rawY, []);
      levelGroups.get(rawY)!.push(rawX);
    });
    levelGroups.forEach((xs) => {
      xs.sort((a, b) => a - b);
      for (let i = 1; i < xs.length; i++) {
        const gap = xs[i] - xs[i - 1];
        if (gap > 0 && gap < minXGap) minXGap = gap;
      }
    });
    // Fallback: if no same-level gaps found, use all unique x values
    if (!isFinite(minXGap)) {
      for (let i = 1; i < sortedUniqueX.length; i++) {
        const gap = sortedUniqueX[i] - sortedUniqueX[i - 1];
        if (gap > 0 && gap < minXGap) minXGap = gap;
      }
    }
    let minYGap = Infinity;
    for (let i = 1; i < sortedUniqueY.length; i++) {
      const gap = sortedUniqueY[i] - sortedUniqueY[i - 1];
      if (gap > 0 && gap < minYGap) minYGap = gap;
    }

    // Scale factors: ensure minimum gap maps to cellWidth/cellHeight
    const xScale = isFinite(minXGap) && minXGap > 0 ? cellWidth / minXGap : 1;
    const yScale = isFinite(minYGap) && minYGap > 0 ? cellHeight / minYGap : 1;

    const minRawX = Math.min(...rawXValues);
    const minRawY = Math.min(...rawYValues);

    all.forEach((v) => {
      const isDummy = v.getOptions('type') === DUMMY;
      const label = isDummy ? '' : String(v.id);
      const rawX = (v.getOptions('x') ?? 0) as number;
      const rawY = (v.getOptions('y') ?? 0) as number;
      const cx = Math.round((rawX - minRawX) * xScale) + s.nodeWidth / 2;
      const cy = Math.round((rawY - minRawY) * yScale) + s.nodeHeight / 2;
      nodes.push({ v, cx, cy, label, isDummy });
      nodeMap.set(v.id, { cx, cy, isDummy });
    });
  } else {
    // ── Fallback: derive positions from levels structure ──
    // No valid coordinates from layout algorithm (e.g. only baryCentric was
    // called without brandeskopf). Use each vertex's position within its
    // level row and the level index as row.
    levels.forEach((level, rowIdx) => {
      // Center the row: compute offset so the row is horizontally centered
      // relative to the widest row.
      const maxCols = Math.max(...levels.map((l) => l.length));
      const rowOffset = ((maxCols - level.length) * cellWidth) / 2;

      level.forEach((v, colIdx) => {
        const isDummy = v.getOptions('type') === DUMMY;
        const label = isDummy ? '' : String(v.id);
        const cx = rowOffset + colIdx * cellWidth + s.nodeWidth / 2;
        const cy = rowIdx * cellHeight + s.nodeHeight / 2;
        nodes.push({ v, cx, cy, label, isDummy });
        nodeMap.set(v.id, { cx, cy, isDummy });
      });
    });
  }

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

  // ── Route edges using core library ──
  // Build a position lookup that maps vertex → rendered center (with offset)
  const edgePaths = routeEdges(levels, {
    nodeWidth: s.nodeWidth,
    nodeHeight: s.nodeHeight,
    dummyRadius: s.dummyRadius,
    pathGenerator: 'bezier',
    positionFn: (v) => {
      const info = nodeMap.get(v.id);
      if (info) return { x: info.cx + offsetX, y: info.cy + offsetY };
      return { x: offsetX, y: offsetY };
    },
  });

  // ── Stats ──
  const realNodes = all.filter((v) => v.getOptions('type') !== DUMMY).length;
  const dummyNodes = all.length - realNodes;
  const statsText = `${realNodes} nodes \u00b7 ${dummyNodes} dummy \u00b7 ${edgePaths.length} edges \u00b7 ${levels.length} levels`;

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
  edgePaths.forEach((ep) => {
    const targetInfo = nodeMap.get(ep.targetId);
    const markerEnd = targetInfo && !targetInfo.isDummy ? ' marker-end="url(#arrowhead)"' : '';
    parts.push(
      `    <path d="${ep.svgPath}" fill="none" stroke="${s.edgeStroke}" stroke-width="${s.edgeWidth}"${markerEnd} />`,
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
 * Extract a comparison group key from a compare_* filename.
 * e.g. "compare_chain_dagre.svg" → "chain"
 *      "compare_data1_sun_1.svg" → "data1"
 *      "compare_complex_dag_dagre.svg" → "complex_dag"
 * Returns null if the file is not a compare file.
 */
function extractCompareGroup(filename: string): string | null {
  const base = filename.replace('.svg', '');
  if (!base.startsWith('compare_')) return null;
  const rest = base.slice('compare_'.length); // e.g. "chain_dagre", "data1_sun_1", "complex_dag_dagre"
  // Remove trailing _dagre or _sun or _sun_N
  const cleaned = rest.replace(/_(dagre|sun(?:_\d+)?)$/, '');
  return cleaned;
}

/**
 * Determine if a compare file is a dagre or sun variant.
 */
function isCompareType(filename: string): 'dagre' | 'sun' | null {
  const base = filename.replace('.svg', '');
  if (!base.startsWith('compare_')) return null;
  if (/_dagre$/.test(base)) return 'dagre';
  if (/_sun(?:_\d+)?$/.test(base)) return 'sun';
  return null;
}

/**
 * Generate an HTML index page that embeds all SVG files in a directory.
 * This creates a gallery view for easy browsing.
 * Compare files (compare_*) are displayed in a side-by-side two-column layout.
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

  // Threshold: SVG wider than this value gets full-width (single column)
  const WIDE_THRESHOLD = 600;

  // ── Separate compare files from normal files ──
  const normalFiles: string[] = [];
  const compareGroups = new Map<string, { dagre: string[]; sun: string[] }>();

  svgFiles.forEach((file: string) => {
    const group = extractCompareGroup(file);
    const type = isCompareType(file);
    if (group && type) {
      if (!compareGroups.has(group)) {
        compareGroups.set(group, { dagre: [], sun: [] });
      }
      compareGroups.get(group)![type].push(file);
    } else {
      normalFiles.push(file);
    }
  });

  // ── Build normal cards ──
  const normalCards = normalFiles
    .map((file: string) => {
      const name = file.replace('.svg', '').replace(/_/g, ' ');

      let isWide = false;
      try {
        const svgContent = fs.readFileSync(path.join(dir, file), 'utf-8');
        const widthMatch = svgContent.match(/width="(\d+(?:\.\d+)?)"/);
        if (widthMatch) {
          const svgWidth = parseFloat(widthMatch[1]);
          isWide = svgWidth > WIDE_THRESHOLD;
        }
      } catch {
        // Ignore read errors
      }

      const cardClass = isWide ? 'card card-wide' : 'card';
      return `    <div class="${cardClass}">
      <h3>${escapeXml(name)}</h3>
      <div class="svg-container">
        <object data="${file}" type="image/svg+xml" width="100%"></object>
      </div>
    </div>`;
    })
    .join('\n');

  // ── Build comparison section ──
  const compareCards: string[] = [];
  const sortedGroups = Array.from(compareGroups.keys()).sort();

  sortedGroups.forEach((group) => {
    const { dagre, sun } = compareGroups.get(group)!;
    const groupTitle = group.replace(/_/g, ' ');

    // Build left side (dagre)
    const dagreItems = dagre
      .map(
        (file) =>
          `          <div class="compare-item">
            <object data="${file}" type="image/svg+xml" width="100%"></object>
          </div>`,
      )
      .join('\n');

    // Build right side (sun-hierarchy) — may have multiple sub-graphs
    const sunItems = sun
      .map(
        (file) =>
          `          <div class="compare-item">
            <object data="${file}" type="image/svg+xml" width="100%"></object>
          </div>`,
      )
      .join('\n');

    compareCards.push(`    <div class="compare-group">
      <h3>\u2696\ufe0f ${escapeXml(groupTitle)}</h3>
      <div class="compare-row">
        <div class="compare-col">
          <div class="compare-label dagre-label">Dagre</div>
${dagreItems}
        </div>
        <div class="compare-col">
          <div class="compare-label sun-label">Sun-Hierarchy</div>
${sunItems}
        </div>
      </div>
    </div>`);
  });

  const compareSection =
    compareCards.length > 0
      ? `  <h2 class="section-title">\ud83d\udd0d Dagre vs Sun-Hierarchy Comparison</h2>
  <p class="section-subtitle">Same data, different layout algorithms — side by side</p>
  <div class="compare-grid">
${compareCards.join('\n')}
  </div>`
      : '';

  const normalSection =
    normalFiles.length > 0
      ? `  <h2 class="section-title">\ud83c\udf33 Layout Gallery</h2>
  <p class="section-subtitle">${normalFiles.length} layouts from test suite</p>
  <div class="grid">
${normalCards}
  </div>`
      : '';

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
    .section-title {
      font-size: 22px;
      color: #333;
      margin: 40px 0 4px;
      padding-left: 8px;
      max-width: 1600px;
      margin-left: auto;
      margin-right: auto;
    }
    .section-subtitle {
      color: #888;
      font-size: 13px;
      margin-bottom: 20px;
      padding-left: 8px;
      max-width: 1600px;
      margin-left: auto;
      margin-right: auto;
    }

    /* ── Normal gallery grid ── */
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(480px, 1fr));
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
    .card-wide {
      grid-column: 1 / -1;
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
      min-height: 150px;
    }
    .svg-container object {
      width: 100%;
      min-height: 150px;
    }

    /* ── Comparison layout ── */
    .compare-grid {
      display: flex;
      flex-direction: column;
      gap: 28px;
      max-width: 1600px;
      margin: 0 auto;
    }
    .compare-group {
      background: #fff;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
      overflow: hidden;
      transition: box-shadow 0.2s;
    }
    .compare-group:hover {
      box-shadow: 0 4px 16px rgba(0,0,0,0.15);
    }
    .compare-group > h3 {
      padding: 16px 20px 12px;
      font-size: 16px;
      color: #444;
      border-bottom: 1px solid #f0f0f0;
      text-transform: capitalize;
      background: #fafafa;
    }
    .compare-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0;
    }
    .compare-col {
      padding: 12px 16px 16px;
      overflow-x: auto;
      border-right: 1px solid #f0f0f0;
    }
    .compare-col:last-child {
      border-right: none;
    }
    .compare-label {
      text-align: center;
      font-size: 13px;
      font-weight: 600;
      padding: 6px 0 10px;
      border-radius: 6px;
      margin-bottom: 8px;
    }
    .dagre-label {
      color: #d94a4a;
      background: #fef2f2;
    }
    .sun-label {
      color: #4a90d9;
      background: #eff8ff;
    }
    .compare-item {
      margin-bottom: 8px;
    }
    .compare-item object {
      width: 100%;
      min-height: 120px;
    }

    @media (max-width: 900px) {
      .compare-row {
        grid-template-columns: 1fr;
      }
      .compare-col {
        border-right: none;
        border-bottom: 1px solid #f0f0f0;
      }
      .compare-col:last-child {
        border-bottom: none;
      }
    }
  </style>
</head>
<body>
  <h1>Sun-Hierarchy</h1>
  <p class="subtitle">Generated from test suite \u00b7 ${svgFiles.length} layouts</p>
${compareSection}
${normalSection}
</body>
</html>`;

  const indexPath = path.join(dir, 'index.html');
  fs.writeFileSync(indexPath, html, 'utf-8');
  return indexPath;
}
