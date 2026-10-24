const test = require("node:test");
const assert = require("node:assert/strict");
const { detectImageExtension } = require("../src/utils/image-type");

test("image signature detection accepts JPEG, PNG, and WebP headers", () => {
  assert.equal(
    detectImageExtension(Buffer.from([0xff, 0xd8, 0xff, 0x00])),
    "jpg",
  );
  assert.equal(
    detectImageExtension(
      Buffer.from([
        0x89,
        0x50,
        0x4e,
        0x47,
        0x0d,
        0x0a,
        0x1a,
        0x0a,
        ...new Array(16).fill(0),
      ]),
    ),
    "png",
  );
  assert.equal(
    detectImageExtension(Buffer.from("RIFF\x04\x00\x00\x00WEBP", "binary")),
    "webp",
  );
});

test("image signature detection rejects mismatched or unsupported file bytes", () => {
  assert.equal(detectImageExtension(Buffer.from("not an image")), null);
  assert.equal(detectImageExtension(null), null);
});
