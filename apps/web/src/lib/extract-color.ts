import sharp from 'sharp';

// Convert RGB to HSL
function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6;
  else if (max === gn) h = ((bn - rn) / d + 2) / 6;
  else h = ((rn - gn) / d + 4) / 6;
  return [h * 360, s, l];
}

function hslToHex(h: number, s: number, l: number): string {
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

// Bucket hue into 36 bins (10° each) and return the most saturated bin's centroid
function dominantHue(pixels: { h: number; s: number; l: number }[]): { h: number; s: number; l: number } | null {
  if (pixels.length === 0) return null;

  const bins = new Array(36).fill(null).map(() => ({ count: 0, hSum: 0, sSum: 0, lSum: 0 }));
  for (const { h, s, l } of pixels) {
    const bin = Math.floor(h / 10) % 36;
    bins[bin].count++;
    bins[bin].hSum += h;
    bins[bin].sSum += s;
    bins[bin].lSum += l;
  }

  // Score = count * avg_saturation (prefer vivid, common colors)
  let best = -1, bestScore = -1;
  for (let i = 0; i < 36; i++) {
    if (bins[i].count === 0) continue;
    const score = bins[i].count * (bins[i].sSum / bins[i].count);
    if (score > bestScore) { bestScore = score; best = i; }
  }
  if (best === -1) return null;

  const b = bins[best];
  return {
    h: b.hSum / b.count,
    s: Math.min(b.sSum / b.count, 0.85), // cap saturation slightly for readability
    l: Math.min(Math.max(b.lSum / b.count, 0.35), 0.55), // clamp lightness to readable range
  };
}

export async function extractLogoColor(logoUrl: string): Promise<string | null> {
  try {
    const res = await fetch(logoUrl, { next: { revalidate: 86400 } });
    if (!res.ok) return null;
    const buffer = Buffer.from(await res.arrayBuffer());

    const { data, info } = await sharp(buffer)
      .resize(80, 80, { fit: 'contain', background: { r: 255, g: 255, b: 255 } })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const colorPixels: { h: number; s: number; l: number }[] = [];
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
      if (a < 80) continue; // skip transparent
      if (r > 230 && g > 230 && b > 230) continue; // skip near-white
      if (r < 25 && g < 25 && b < 25) continue; // skip near-black (often outlines)

      const [h, s, l] = rgbToHsl(r, g, b);
      if (s < 0.15) continue; // skip near-gray (no hue info)
      colorPixels.push({ h, s, l });
    }

    const dominant = dominantHue(colorPixels);
    if (!dominant) return null;
    return hslToHex(dominant.h, dominant.s, dominant.l);
  } catch {
    return null;
  }
}
