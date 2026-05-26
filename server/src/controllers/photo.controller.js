const fs     = require('fs');
const path   = require('path');
const prisma = require('../config/prisma');
const { catchAsync } = require('../middleware/error.middleware');

/**
 * POST /api/items/:id/photos
 * Upload one or more photos for an item.
 */
exports.uploadPhotos = catchAsync(async (req, res) => {
  const item = await prisma.item.findUnique({ where: { id: req.params.id } });
  if (!item || (item.reporterId !== req.user.id && req.user.role !== 'ADMIN')) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const files = req.files || [];
  if (files.length === 0) {
    return res.status(400).json({ error: 'No files uploaded' });
  }

  const photos = await Promise.all(
    files.map((file) =>
      prisma.photo.create({
        data: {
          itemId: item.id,
          url:    `/uploads/${file.filename}`,
        },
      })
    )
  );

  res.status(201).json({ photos });
});

/**
 * DELETE /api/photos/:id
 * Delete a photo from an item.
 */
exports.deletePhoto = catchAsync(async (req, res) => {
  const photo = await prisma.photo.findUnique({
    where:   { id: req.params.id },
    include: { item: true },
  });

  if (!photo || (photo.item.reporterId !== req.user.id && req.user.role !== 'ADMIN')) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  // Delete from disk
  const filePath = path.join(__dirname, '..', '..', photo.url);
  fs.unlink(filePath, () => {});

  await prisma.photo.delete({ where: { id: req.params.id } });
  res.status(204).send();
});
