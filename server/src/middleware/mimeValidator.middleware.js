/**
 * mimeValidator.middleware.js
 *
 * After Multer has written uploaded files to disk, this middleware reads
 * the first 12 bytes of each file (the "magic bytes") to determine the
 * real MIME type, regardless of the file extension or the Content-Type
 * header declared by the client.
 *
 * Allowed real MIME types: image/jpeg, image/png, image/webp
 *
 * If any file fails the check:
 *   - All files in the current request are deleted from disk.
 *   - A 400 response is returned immediately.
 *
 * No external dependencies required — pure Node.js Buffer comparison.
 */

const fs = require('fs');

// Magic-byte signatures for allowed image types
const MAGIC_SIGNATURES = [
  {
    mime: 'image/jpeg',
    // FF D8 FF
    check: (buf) => buf[0] === 0xFF && buf[1] === 0xD8 && buf[2] === 0xFF,
  },
  {
    mime: 'image/png',
    // 89 50 4E 47 0D 0A 1A 0A
    check: (buf) =>
      buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47 &&
      buf[4] === 0x0D && buf[5] === 0x0A && buf[6] === 0x1A && buf[7] === 0x0A,
  },
  {
    mime: 'image/webp',
    // 52 49 46 46 ?? ?? ?? ?? 57 45 42 50  (RIFF....WEBP)
    check: (buf) =>
      buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
      buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50,
  },
];

/**
 * Detect the real MIME type of a file from its magic bytes.
 * @param {string} filePath  absolute path to the file on disk
 * @returns {string|null}   detected MIME type, or null if unknown
 */
function detectMime(filePath) {
  let buf;
  try {
    const fd = fs.openSync(filePath, 'r');
    buf = Buffer.alloc(12);
    fs.readSync(fd, buf, 0, 12, 0);
    fs.closeSync(fd);
  } catch {
    return null;
  }

  for (const sig of MAGIC_SIGNATURES) {
    if (sig.check(buf)) { return sig.mime; }
  }
  return null;
}

/**
 * Delete all files in req.files from disk (best-effort, non-blocking).
 * @param {Express.Multer.File[]} files
 */
function cleanupFiles(files) {
  if (!files || files.length === 0) { return; }
  for (const file of files) {
    fs.unlink(file.path, () => {});
  }
}

/**
 * Express middleware — must be placed AFTER upload.array() / upload.single().
 *
 * Validates each uploaded file by its real magic bytes.
 * Rejects with HTTP 400 if any file has an invalid or unrecognised MIME type.
 */
function validateMime(req, res, next) {
  const files = req.files || (req.file ? [req.file] : []);

  if (files.length === 0) { return next(); }

  const invalidFiles = [];

  for (const file of files) {
    const detectedMime = detectMime(file.path);
    if (!detectedMime) {
      invalidFiles.push(file.originalname);
    }
  }

  if (invalidFiles.length > 0) {
    cleanupFiles(files);
    return res.status(400).json({
      error: 'Invalid file type',
      detail: `The following files are not valid images (JPEG, PNG or WebP): ${invalidFiles.join(', ')}`,
      rejected: invalidFiles,
    });
  }

  next();
}

module.exports = { validateMime, detectMime };
