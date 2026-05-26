const prisma  = require('../config/prisma');
const { catchAsync } = require('../middleware/error.middleware');
const notify  = require('../services/notify');

const CLAIM_INCLUDE = {
  item:     { select: { id: true, name: true, status: true, reportType: true } },
  claimant: { select: { id: true, username: true, email: true } },
};

// ── Submit / create a claim ──────────────────────────────────────────────────
const submitClaim = catchAsync(async (req, res) => {
  const { itemId, message } = req.body;

  const item = await prisma.item.findUnique({ where: { id: itemId } });
  if (!item || item.status !== 'VERIFIED') {
    return res.status(404).json({ error: 'Item not found or not available for claiming' });
  }

  if (item.reporterId === req.user.id) {
    return res.status(403).json({ error: 'You cannot claim your own item' });
  }

  const existing = await prisma.claimRequest.findFirst({
    where: { itemId, claimantId: req.user.id },
  });
  if (existing) {
    return res.status(409).json({ error: 'You already have a pending claim for this item' });
  }

  const claim = await prisma.claimRequest.create({
    data: { itemId, claimantId: req.user.id, message: message ?? null },
    include: CLAIM_INCLUDE,
  });

  await notify.create({
    userId:  item.reporterId,
    type:    'CLAIM_RECEIVED',
    message: `${req.user.username} has submitted a claim for your item "${item.name}".`,
    itemId,
    claimId: claim.id,
  });

  res.status(201).json({ claim });
});

exports.submitClaim  = submitClaim;
exports.createClaim  = submitClaim; // legacy alias

// ── List claims ──────────────────────────────────────────────────────────────
// Admin sees all; regular user sees only their own
const listClaims = catchAsync(async (req, res) => {
  const where = req.user.role === 'ADMIN' ? {} : { claimantId: req.user.id };
  const claims = await prisma.claimRequest.findMany({
    where,
    include: CLAIM_INCLUDE,
    orderBy: { createdAt: 'desc' },
  });
  res.json({ claims });
});

exports.listClaims = listClaims;

// ── My claims ────────────────────────────────────────────────────────────────
const myClaims = catchAsync(async (req, res) => {
  const claims = await prisma.claimRequest.findMany({
    where:   { claimantId: req.user.id },
    include: CLAIM_INCLUDE,
    orderBy: { createdAt: 'desc' },
  });
  res.json({ claims });
});

exports.myClaims     = myClaims;
exports.listMyClaims = myClaims; // legacy alias

// ── Review a claim (admin) ───────────────────────────────────────────────────
// action: APPROVED | REJECTED
const reviewClaim = catchAsync(async (req, res) => {
  const { action } = req.body;
  if (!['APPROVED', 'REJECTED'].includes(action)) {
    return res.status(422).json({ error: 'action must be APPROVED or REJECTED' });
  }

  const claim = await prisma.claimRequest.findUnique({
    where:   { id: req.params.id },
    include: { item: true },
  });
  if (!claim) {
    return res.status(404).json({ error: 'Claim not found' });
  }

  const updated = await prisma.claimRequest.update({
    where:   { id: req.params.id },
    data:    { status: action },
    include: CLAIM_INCLUDE,
  });

  await notify.create({
    userId:  claim.claimantId,
    type:    action === 'APPROVED' ? 'CLAIM_ACCEPTED' : 'CLAIM_REJECTED',
    message: action === 'APPROVED'
      ? `Your claim for "${claim.item.name}" has been approved.`
      : `Your claim for "${claim.item.name}" was rejected.`,
    itemId:  claim.itemId,
    claimId: claim.id,
  });

  res.json({ claim: updated });
});

exports.reviewClaim = reviewClaim;

// ── Approve / Reject shortcuts (legacy routes) ───────────────────────────────
exports.approveClaim = catchAsync(async (req, res) => {
  req.body.action = 'APPROVED';
  return reviewClaim(req, res, () => {});
});

exports.rejectClaim = catchAsync(async (req, res) => {
  req.body.action = 'REJECTED';
  return reviewClaim(req, res, () => {});
});

// ── List claims on a specific item (reporter only) ───────────────────────────
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

// ── Update claim status (reporter) ──────────────────────────────────────────
exports.updateClaimStatus = catchAsync(async (req, res) => {
  const { status } = req.body;

  const claim = await prisma.claimRequest.findUnique({
    where:   { id: req.params.id },
    include: { item: true },
  });

  if (!claim) {
    return res.status(404).json({ error: 'Claim not found' });
  }

  if (claim.item.reporterId !== req.user.id) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  if (!['ACCEPTED', 'REJECTED'].includes(status)) {
    return res.status(422).json({ error: 'status must be ACCEPTED or REJECTED' });
  }

  const updated = await prisma.claimRequest.update({
    where:   { id: req.params.id },
    data:    { status },
    include: CLAIM_INCLUDE,
  });

  await notify.create({
    userId:  claim.claimantId,
    type:    status === 'ACCEPTED' ? 'CLAIM_ACCEPTED' : 'CLAIM_REJECTED',
    message: status === 'ACCEPTED'
      ? `Your claim for "${claim.item.name}" has been accepted!`
      : `Your claim for "${claim.item.name}" was not accepted.`,
    itemId:  claim.itemId,
    claimId: claim.id,
  });

  res.json({ claim: updated });
});

// ── Delete a claim (claimant only) ───────────────────────────────────────────
exports.deleteClaim = catchAsync(async (req, res) => {
  const claim = await prisma.claimRequest.findUnique({ where: { id: req.params.id } });

  if (!claim || claim.claimantId !== req.user.id) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  await prisma.claimRequest.delete({ where: { id: req.params.id } });
  res.status(204).send();
});
