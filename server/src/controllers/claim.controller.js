const prisma  = require('../config/prisma');
const { catchAsync } = require('../middleware/error.middleware');
const notify  = require('../services/notify');

/** POST /api/claims
 *  Body: { itemId, message? }
 */
exports.createClaim = catchAsync(async (req, res) => {
  const { itemId, message } = req.body;

  // 1. L'objet doit exister et être VERIFIED
  const item = await prisma.item.findUnique({ where: { id: itemId } });
  if (!item || item.status !== 'VERIFIED') {
    return res.status(404).json({ error: 'Item not found or not available for claiming' });
  }

  // 2. L'utilisateur ne peut pas réclamer son propre objet
  if (item.reporterId === req.user.id) {
    return res.status(403).json({ error: 'You cannot claim your own item' });
  }

  // 3. Évite les doublons
  const existing = await prisma.claimRequest.findFirst({
    where: { itemId, claimantId: req.user.id },
  });
  if (existing) {
    return res.status(409).json({ error: 'You already have a pending claim for this item' });
  }

  const claim = await prisma.claimRequest.create({
    data: {
      itemId,
      claimantId: req.user.id,
      message:    message ?? null,
    },
    include: {
      item:     { select: { id: true, name: true, status: true } },
      claimant: { select: { id: true, username: true, email: true } },
    },
  });

  // Notifie le déclarant
  await notify.create({
    userId:  item.reporterId,
    type:    'CLAIM_RECEIVED',
    message: `${req.user.username} has submitted a claim for your item "${item.name}".`,
    itemId,
    claimId: claim.id,
  });

  res.status(201).json({ claim });
});

/** GET /api/claims — liste des claims de l'utilisateur connecté */
exports.listMyClaims = catchAsync(async (req, res) => {
  const claims = await prisma.claimRequest.findMany({
    where:   { claimantId: req.user.id },
    include: { item: { select: { id: true, name: true, status: true, reportType: true } } },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ claims });
});

/** GET /api/items/:id/claims — claims sur un item (reporter uniquement) */
exports.listItemClaims = catchAsync(async (req, res) => {
  const item = await prisma.item.findUnique({ where: { id: req.params.id } });
  if (!item || item.reporterId !== req.user.id) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const claims = await prisma.claimRequest.findMany({
    where:   { itemId: req.params.id },
    include: { claimant: { select: { id: true, username: true, email: true } } },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ claims });
});

/** PATCH /api/claims/:id — accepte ou refuse un claim */
exports.updateClaimStatus = catchAsync(async (req, res) => {
  const { status } = req.body; // ACCEPTED | REJECTED

  const claim = await prisma.claimRequest.findUnique({
    where:   { id: req.params.id },
    include: { item: true },
  });

  if (!claim) {
    return res.status(404).json({ error: 'Claim not found' });
  }

  // Seul le reporter de l'objet peut mettre à jour le statut
  if (claim.item.reporterId !== req.user.id) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  if (!['ACCEPTED', 'REJECTED'].includes(status)) {
    return res.status(422).json({ error: 'status must be ACCEPTED or REJECTED' });
  }

  const updated = await prisma.claimRequest.update({
    where: { id: req.params.id },
    data:  { status },
    include: {
      item:     { select: { id: true, name: true } },
      claimant: { select: { id: true, username: true, email: true } },
    },
  });

  // Notifie le claimant
  await notify.create({
    userId:  claim.claimantId,
    type:    status === 'ACCEPTED' ? 'CLAIM_ACCEPTED' : 'CLAIM_REJECTED',
    message: status === 'ACCEPTED'
      ? `Your claim for "${claim.item.name}" has been accepted! Please contact the reporter.`
      : `Your claim for "${claim.item.name}" was not accepted.`,
    itemId:  claim.itemId,
    claimId: claim.id,
  });

  res.json({ claim: updated });
});

/** DELETE /api/claims/:id — retrait d'un claim par son auteur */
exports.deleteClaim = catchAsync(async (req, res) => {
  const claim = await prisma.claimRequest.findUnique({ where: { id: req.params.id } });

  if (!claim || claim.claimantId !== req.user.id) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  await prisma.claimRequest.delete({ where: { id: req.params.id } });
  res.status(204).send();
});
