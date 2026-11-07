import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { processPhoto, variantKey } from "./pipeline";

// A "phone photo": 4032x3024 JPEG with camera EXIF including GPS coordinates.
async function phonePhoto(orientation = 1) {
  const raw = await sharp({ create: { width: 4032, height: 3024, channels: 3, background: { r: 180, g: 120, b: 80 } } })
    .composite([{ input: Buffer.from('<svg width="4032" height="3024"><rect x="200" y="200" width="1200" height="800" fill="#123"/></svg>') }])
    .jpeg({ quality: 92 })
    .withExif({
      IFD0: { Make: "Apple", Model: "iPhone 15 Pro", Orientation: String(orientation) },
      IFD3: { GPSLatitudeRef: "N", GPSLatitude: "6/1 54/1 3000/100", GPSLongitudeRef: "E", GPSLongitude: "79/1 51/1 1200/100" },
    })
    .toBuffer();
  return raw;
}

describe("photo pipeline", () => {
  it("strips GPS and every other metadata field from every stored file", async () => {
    const input = await phonePhoto();
    const before = await sharp(input).metadata();
    expect(before.exif).toBeTruthy(); // the test photo really carries EXIF

    const out = await processPhoto(input);
    for (const v of out.variants) {
      const m = await sharp(v.data).metadata();
      expect(m.exif, `${v.name} has EXIF`).toBeUndefined();
      expect(m.xmp, `${v.name} has XMP`).toBeUndefined();
      expect(v.data.includes(Buffer.from("iPhone"))).toBe(false);
      expect(v.data.includes(Buffer.from("GPS"))).toBe(false);
    }
  });

  it("makes WebP web sizes plus a JPEG share image, far smaller than the original", async () => {
    const input = await phonePhoto();
    const out = await processPhoto(input);
    expect(out.variants.map((v) => v.name)).toEqual(["400", "800", "1600", "2048", "share"]);
    expect(out.variants.find((v) => v.name === "2048")).toMatchObject({ width: 2048, height: 1536, contentType: "image/webp" });
    expect(out.variants.find((v) => v.name === "share")).toMatchObject({ width: 1200, contentType: "image/jpeg" });
    expect(out.totalBytes).toBeLessThan(input.length);
    expect(out.hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("turns sideways phone photos upright", async () => {
    // Landscape pixels tagged orientation 6 (= display rotated 90° clockwise), as phones save portrait shots.
    const sideways = await sharp({ create: { width: 4032, height: 3024, channels: 3, background: "#777" } })
      .jpeg()
      .withMetadata({ orientation: 6 })
      .toBuffer();
    expect((await sharp(sideways).metadata()).orientation).toBe(6);
    const out = await processPhoto(sideways);
    const big = out.variants.find((v) => v.name === "1600")!;
    expect(big.height).toBeGreaterThan(big.width);
  });

  it("never enlarges a small photo", async () => {
    const small = await sharp({ create: { width: 900, height: 600, channels: 3, background: "#888" } }).jpeg().toBuffer();
    const out = await processPhoto(small);
    expect(Math.max(...out.variants.map((v) => v.width))).toBeLessThanOrEqual(900);
  });

  it("gives the same photo the same fingerprint (duplicates are caught)", async () => {
    const input = await phonePhoto();
    const [a, b] = await Promise.all([processPhoto(input), processPhoto(Buffer.from(input))]);
    expect(a.hash).toBe(b.hash);
    expect(variantKey("p1", a.hash, { name: "800", ext: "webp" })).toBe(`properties/p1/${a.hash.slice(0, 20)}/800.webp`);
  });

  it("rejects files that are not images", async () => {
    await expect(processPhoto(Buffer.from("not an image"))).rejects.toThrow();
  });
});
