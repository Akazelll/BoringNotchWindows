import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function createBmp(width, height, drawFn) {
  const rowSize = Math.floor((24 * width + 31) / 32) * 4;
  const pixelArraySize = rowSize * height;
  const fileSize = 54 + pixelArraySize;
  const buf = Buffer.alloc(fileSize, 0);

  // Bitmap File Header (14 bytes)
  buf.write('BM', 0); // 0-1 Signature
  buf.writeUInt32LE(fileSize, 2); // 2-5 File Size
  buf.writeUInt32LE(0, 6); // 6-9 Reserved
  buf.writeUInt32LE(54, 10); // 10-13 Offset to pixel array

  // DIB Header / BITMAPINFOHEADER (40 bytes)
  buf.writeUInt32LE(40, 14); // Header size
  buf.writeInt32LE(width, 18); // Width
  buf.writeInt32LE(height, 22); // Height (positive = bottom-up)
  buf.writeUInt16LE(1, 26); // Planes
  buf.writeUInt16LE(24, 28); // Bits per pixel
  buf.writeUInt32LE(0, 30); // Compression (BI_RGB)
  buf.writeUInt32LE(pixelArraySize, 34); // Image size
  buf.writeInt32LE(2835, 38); // X pixels per meter (~72 DPI)
  buf.writeInt32LE(2835, 42); // Y pixels per meter
  buf.writeUInt32LE(0, 46); // Total colors
  buf.writeUInt32LE(0, 50); // Important colors

  // Pixel Grid (width x height) in [R, G, B]
  const grid = [];
  for (let y = 0; y < height; y++) {
    const row = [];
    for (let x = 0; x < width; x++) {
      row.push([0, 0, 0]);
    }
    grid.push(row);
  }

  drawFn(grid, width, height);

  // Write pixel array (bottom-up: row 0 is bottom, row height-1 is top)
  let offset = 54;
  for (let y = height - 1; y >= 0; y--) {
    for (let x = 0; x < width; x++) {
      const [r, g, b] = grid[y][x];
      buf[offset] = b; // Blue
      buf[offset + 1] = g; // Green
      buf[offset + 2] = r; // Red
      offset += 3;
    }
    // Row padding
    const padding = rowSize - (width * 3);
    for (let p = 0; p < padding; p++) {
      buf[offset++] = 0;
    }
  }

  return buf;
}

// Simple 5x7 bitmap font for rendering crisp clean text on BMP
const FONT_5X7 = {
  ' ': [0,0,0,0,0],
  'A': [0x7C, 0x12, 0x11, 0x12, 0x7C],
  'B': [0x7F, 0x49, 0x49, 0x49, 0x36],
  'C': [0x3E, 0x41, 0x41, 0x41, 0x22],
  'D': [0x7F, 0x41, 0x41, 0x22, 0x1C],
  'E': [0x7F, 0x49, 0x49, 0x49, 0x41],
  'F': [0x7F, 0x09, 0x09, 0x09, 0x01],
  'G': [0x3E, 0x41, 0x49, 0x49, 0x7A],
  'H': [0x7F, 0x08, 0x08, 0x08, 0x7F],
  'I': [0x00, 0x41, 0x7F, 0x41, 0x00],
  'J': [0x20, 0x40, 0x41, 0x3F, 0x01],
  'K': [0x7F, 0x08, 0x14, 0x22, 0x41],
  'L': [0x7F, 0x40, 0x40, 0x40, 0x40],
  'M': [0x7F, 0x02, 0x0C, 0x02, 0x7F],
  'N': [0x7F, 0x04, 0x08, 0x10, 0x7F],
  'O': [0x3E, 0x41, 0x41, 0x41, 0x3E],
  'P': [0x7F, 0x09, 0x09, 0x09, 0x06],
  'Q': [0x3E, 0x41, 0x51, 0x21, 0x5E],
  'R': [0x7F, 0x09, 0x19, 0x29, 0x46],
  'S': [0x46, 0x49, 0x49, 0x49, 0x31],
  'T': [0x01, 0x01, 0x7F, 0x01, 0x01],
  'U': [0x3F, 0x40, 0x40, 0x40, 0x3F],
  'V': [0x1F, 0x20, 0x40, 0x20, 0x1F],
  'W': [0x7F, 0x20, 0x18, 0x20, 0x7F],
  'X': [0x63, 0x14, 0x08, 0x14, 0x63],
  'Y': [0x07, 0x08, 0x70, 0x08, 0x07],
  'Z': [0x61, 0x51, 0x49, 0x45, 0x43],
  '-': [0x08, 0x08, 0x08, 0x08, 0x08],
  '.': [0x00, 0x60, 0x60, 0x00, 0x00],
  ':': [0x00, 0x36, 0x36, 0x00, 0x00],
  '(': [0x00, 0x1C, 0x22, 0x41, 0x00],
  ')': [0x00, 0x41, 0x22, 0x1C, 0x00],
  '/': [0x20, 0x10, 0x08, 0x04, 0x02],
  '0': [0x3E, 0x51, 0x49, 0x45, 0x3E],
  '1': [0x00, 0x42, 0x7F, 0x40, 0x00],
  '2': [0x42, 0x61, 0x51, 0x49, 0x46],
  '3': [0x21, 0x41, 0x45, 0x4B, 0x31],
  '4': [0x18, 0x14, 0x12, 0x7F, 0x10],
  '5': [0x27, 0x45, 0x45, 0x45, 0x39],
  '6': [0x3C, 0x4A, 0x49, 0x49, 0x30],
  '7': [0x01, 0x71, 0x09, 0x05, 0x03],
  '8': [0x36, 0x49, 0x49, 0x49, 0x36],
  '9': [0x06, 0x49, 0x49, 0x29, 0x1E]
};

function drawText(grid, text, startX, startY, color, scale = 1) {
  const upper = text.toUpperCase();
  let cx = startX;
  for (let i = 0; i < upper.length; i++) {
    const ch = upper[i];
    const glyph = FONT_5X7[ch] || FONT_5X7[' '];
    for (let col = 0; col < 5; col++) {
      const colBits = glyph[col];
      for (let row = 0; row < 7; row++) {
        if ((colBits & (1 << row)) !== 0) {
          for (let sy = 0; sy < scale; sy++) {
            for (let sx = 0; sx < scale; sx++) {
              const px = cx + col * scale + sx;
              const py = startY + row * scale + sy;
              if (py >= 0 && py < grid.length && px >= 0 && px < grid[0].length) {
                grid[py][px] = color;
              }
            }
          }
        }
      }
    }
    cx += (5 + 1) * scale;
  }
}

function drawRoundedRect(grid, x0, y0, w, h, r, fillColor, borderColor = null) {
  for (let y = y0; y < y0 + h; y++) {
    for (let x = x0; x < x0 + w; x++) {
      if (y < 0 || y >= grid.length || x < 0 || x >= grid[0].length) continue;

      // Check corner rounding
      let inside = true;
      let onBorder = false;

      // Distance to corner centers
      const cx = x < x0 + r ? x0 + r : (x >= x0 + w - r ? x0 + w - r - 1 : x);
      const cy = y < y0 + r ? y0 + r : (y >= y0 + h - r ? y0 + h - r - 1 : y);
      const dx = x - cx;
      const dy = y - cy;
      const distSq = dx * dx + dy * dy;

      if (distSq > r * r) {
        inside = false;
      } else if (distSq >= (r - 1) * (r - 1)) {
        onBorder = true;
      }

      if (inside) {
        if (borderColor && (onBorder || x === x0 || x === x0 + w - 1 || y === y0 || y === y0 + h - 1)) {
          grid[y][x] = borderColor;
        } else {
          grid[y][x] = fillColor;
        }
      }
    }
  }
}

// 1. Generate Sidebar BMP (164 x 314 px)
const sidebarBmp = createBmp(164, 314, (grid, w, h) => {
  // Background: Deep modern dark gradient (#0a0a0c to #18181b)
  for (let y = 0; y < h; y++) {
    const factor = y / h;
    const r = Math.round(10 + factor * 14);
    const g = Math.round(10 + factor * 14);
    const b = Math.round(14 + factor * 16);
    for (let x = 0; x < w; x++) {
      grid[y][x] = [r, g, b];
    }
  }

  // Draw Top Accent / Border line
  for (let x = 0; x < w; x++) {
    grid[0][x] = [30, 30, 35];
    grid[h - 1][x] = [20, 20, 24];
  }

  // Draw Dynamic Island / Notch Illustration (centered at y = 50)
  // Notch frame
  drawRoundedRect(grid, 22, 42, 120, 34, 16, [0, 0, 0], [45, 45, 52]);

  // Camera lens dot (dark grey circle)
  drawRoundedRect(grid, 40, 54, 10, 10, 5, [20, 20, 25], [60, 60, 70]);

  // Microphone / Sensor dot
  drawRoundedRect(grid, 54, 57, 4, 4, 2, [15, 15, 20]);

  // Glowing status indicator (green dot on right)
  drawRoundedRect(grid, 114, 55, 8, 8, 4, [34, 197, 94], [74, 222, 128]);

  // Subtle sound wave bars in the notch
  const barHeights = [6, 12, 18, 14, 8, 16, 10];
  barHeights.forEach((bh, idx) => {
    const bx = 74 + idx * 4;
    const by = 59 - Math.floor(bh / 2);
    for (let py = by; py < by + bh; py++) {
      if (py >= 45 && py < 73) {
        grid[py][bx] = [160, 160, 175];
      }
    }
  });

  // App Title: "BENTO"
  drawText(grid, 'BENTO', 26, 125, [255, 255, 255], 2);

  // Subtitle: "WINDOWS EDITION"
  drawText(grid, 'WINDOWS EDITION', 26, 165, [140, 140, 155], 1);

  // Divider line
  for (let x = 26; x < 138; x++) {
    grid[185][x] = [40, 40, 48];
  }

  // Feature bullets
  drawText(grid, '* DYNAMIC ISLAND', 26, 200, [180, 180, 195], 1);
  drawText(grid, '* MEDIA CONTROLS', 26, 218, [180, 180, 195], 1);
  drawText(grid, '* SYSTEM MONITOR', 26, 236, [180, 180, 195], 1);

  // Publisher attribution
  drawText(grid, 'DEVELOPER', 26, 272, [110, 110, 125], 1);
  drawText(grid, 'ADAM RAGA', 26, 285, [59, 130, 246], 1); // Accent blue
});

// 2. Generate Header BMP (150 x 57 px)
const headerBmp = createBmp(150, 57, (grid, w, h) => {
  // Background: Deep dark #111114
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      grid[y][x] = [17, 17, 20];
    }
  }

  // Mini Notch Pill on the left (x = 10, y = 14)
  drawRoundedRect(grid, 10, 14, 46, 28, 13, [0, 0, 0], [45, 45, 52]);

  // Camera lens dot
  drawRoundedRect(grid, 18, 24, 6, 6, 3, [20, 20, 25], [60, 60, 70]);

  // Green active dot
  drawRoundedRect(grid, 42, 25, 5, 5, 2, [34, 197, 94]);

  // Wave bar
  for (let y = 23; y <= 29; y++) {
    grid[y][30] = [180, 180, 195];
    grid[y][34] = [180, 180, 195];
  }

  // Text on the right
  drawText(grid, 'BENTO', 64, 16, [255, 255, 255], 1);
  drawText(grid, 'BY ADAM RAGA', 64, 30, [130, 130, 145], 1);
});

// Write to src-tauri/installer
const outDir = path.resolve(__dirname, '../src-tauri/installer');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

fs.writeFileSync(path.join(outDir, 'sidebar.bmp'), sidebarBmp);
fs.writeFileSync(path.join(outDir, 'header.bmp'), headerBmp);

console.log('Successfully generated:');
console.log(' - ' + path.join(outDir, 'sidebar.bmp') + ' (' + sidebarBmp.length + ' bytes)');
console.log(' - ' + path.join(outDir, 'header.bmp') + ' (' + headerBmp.length + ' bytes)');
