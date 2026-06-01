import Jimp from 'jimp';

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
    return Math.round(255 * (l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)))
      .toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

function dominantHue(pixels: { h: number; s: number; l: number }[]): { h: number; s: number; l: number } | null {
  if (pixels.length === 0) return null;
  const bins = Array.from({ length: 36 }, () => ({ count: 0, hSum: 0, sSum: 0, lSum: 0 }));
  for (const { h, s, l } of pixels) {
    const bin = Math.floor(h / 10) % 36;
    bins[bin].count++;
    bins[bin].hSum += h;
    bins[bin].sSum += s;
    bins[bin].lSum += l;
  }
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
    s: Math.min(b.sSum / b.count, 0.85),
    l: Math.min(Math.max(b.lSum / b.count, 0.35), 0.55),
  };
}

export async function extractLogoColor(logoUrl: string): Promise<string | null> {
  try {
    const res = await fetch(logoUrl, { next: { revalidate: 86400 } });
    if (!res.ok) return null;
    const buffer = Buffer.from(await res.arrayBuffer());

    const image = await Jimp.read(buffer);
    image.resize(80, 80);

    const colorPixels: { h: number; s: number; l: number }[] = [];
    image.scan(0, 0, image.bitmap.width, image.bitmap.height, (_x, _y, idx) => {
      const r = image.bitmap.data[idx];
      const g = image.bitmap.data[idx + 1];
      const b = image.bitmap.data[idx + 2];
      const a = image.bitmap.data[idx + 3];
      if (a < 80) return;
      if (r > 230 && g > 230 && b > 230) return;
      if (r < 25 && g < 25 && b < 25) return;
      const [h, s, l] = rgbToHsl(r, g, b);
      if (s < 0.15) return;
      colorPixels.push({ h, s, l });
    });

    const dominant = dominantHue(colorPixels);
    if (!dominant) return null;
    return hslToHex(dominant.h, dominant.s, dominant.l);
  } catch {
    return null;
  }
}
