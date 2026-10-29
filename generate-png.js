import fs from 'fs';
import zlib from 'zlib';

function createPNG(width, height, r, g, b) {
  // Construct a solid color PNG with an emerald center
  const widthBuf = Buffer.alloc(4);
  widthBuf.writeUInt32BE(width, 0);
  const heightBuf = Buffer.alloc(4);
  heightBuf.writeUInt32BE(height, 0);

  // IHDR chunk: width(4), height(4), bit depth 8, color type 2 (RGB), compression 0, filter 0, interlace 0
  const ihdrData = Buffer.concat([
    widthBuf,
    heightBuf,
    Buffer.from([8, 2, 0, 0, 0]),
  ]);
  const ihdrChunk = makeChunk('IHDR', ihdrData);

  // Raw image data: height rows, each row starts with filter byte 0 followed by width * 3 bytes
  const rowSize = 1 + width * 3;
  const rawData = Buffer.alloc(rowSize * height);

  const cx = width / 2;
  const cy = height / 2;
  const radius = width * 0.35;

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0; // Filter byte: None

    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 3;
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Ring or center icon pattern
      if (Math.abs(dist - radius) < width * 0.04 || dist < width * 0.1) {
        // White
        rawData[pxOffset] = 255;
        rawData[pxOffset + 1] = 255;
        rawData[pxOffset + 2] = 255;
      } else {
        // Emerald (#047857 -> 4, 120, 87)
        rawData[pxOffset] = r;
        rawData[pxOffset + 1] = g;
        rawData[pxOffset + 2] = b;
      }
    }
  }

  const deflated = zlib.deflateSync(rawData);
  const idatChunk = makeChunk('IDAT', deflated);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([pngSignature, ihdrChunk, idatChunk, iendChunk]);
}

function makeChunk(type, data) {
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);

  const typeBuf = Buffer.from(type, 'ascii');
  const typeAndData = Buffer.concat([typeBuf, data]);

  const crc = crc32(typeAndData);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc, 0);

  return Buffer.concat([lenBuf, typeAndData, crcBuf]);
}

// Standard CRC32 implementation for PNG
function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c = (c ^ buf[i]);
    for (let j = 0; j < 8; j++) {
      c = (c >>> 1) ^ (-(c & 1) & 0xedb88320);
    }
  }
  return (c ^ ~0) >>> 0;
}

if (!fs.existsSync('public/icons')) fs.mkdirSync('public/icons', { recursive: true });

fs.writeFileSync('public/icons/icon-192.png', createPNG(192, 192, 4, 120, 87));
fs.writeFileSync('public/icons/icon-512.png', createPNG(512, 512, 4, 120, 87));
console.log('Valid PNG icons (192 and 512) generated.');
