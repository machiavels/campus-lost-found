const prisma  = require('../config/prisma');
const { catchAsync } = require('../middleware/error.middleware');
const notify  = require('../services/notify');

/** POST /api/claims */
exports.submitClaim = catchAsync(async (req, res) => {
  const { itemId, requestMessage } = req.body;
  if (!itemId || !requestMessage) {
    return res.status(422).json({ error: 'itemId and requestMessage are required' });
  }

  // Prevent duplicate pending claims
  const existing = await prisma.claimRequest.findFirst({
    where: { itemId, requesterId: req.user.id, status: 'PENDING' },
  });
  if (existing) return res.status(409).json({ error: 'You already have a pending claim for this item' });

  const claim = await prisma.claimRequest.create({
    data: { itemId, requesterId: req.user.id, requestMessage },
    include: { item: { select: { id: true, name: true } } },
  });
  res.status(201).json({ claim });
});

/** GET /api/claims/my */
exports.myClaims = catchAsync(async (req, res) => {
  const claims = await prisma.claimRequest.findMany({
    where:   { requesterId: req.user.id },
    include: { item: { select: { id: true, name: true, status: true } } },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ claims });
});

/** PATCH /api/claims/:id/approve — ADMIN */
exports.approveClaim = catchAsync(async (req, res) => {
  await _setClaimStatus(req.params.id, 'APPROVED', res);
});

/** PATCH /api/claims/:id/reject — ADMIN */
exports.rejectClaim = catchAsync(async (req, res) => {
  await _setClaimStatus(req.params.id, 'REJECTED', res);
});

async function _setClaimStatus(id, status, res) {
  const claim = await prisma.claimRequest.findUnique({
    where:   { id },
    include: { item: { select: { id: true, name: true } } },
  });
  if (!claim) return res.status(404).json({ error: 'Claim not found' });

  const updated = await prisma.claimRequest.update({
    where:   { id },
    data:    { status },
    include: { item: { select: { id: true, name: true } } },
  });

  // If approved, mark the item as CLAIMED
  if (status === 'APPROVED') {
    await prisma.item.update({
      where: { id: claim.itemId },
      data:  { status: 'CLAIMED', claimedById: claim.requesterId, claimedAt: new Date() },
    });
  }

  // Notify the requester of the decision
  await notify({
    userId:  claim.requesterId,
    type:    status === 'APPROVED' ? 'CLAIM_APPROVED' : 'CLAIM_REJECTED',
    message: status === 'APPROVED'
      ? `Your claim for "${claim.item.name}" has been approved. You can now pick it up.`
      : `Your claim for "${claim.item.name}" has been rejected.`,
    itemId:  claim.itemId,
  });

  res.json({ claim: updated });
}
