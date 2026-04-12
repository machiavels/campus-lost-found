const prisma  = require('../config/prisma');
const { catchAsync } = require('../middleware/error.middleware');
const notify  = require('../services/notify');

/** POST /api/claims
 *  Body: { itemId, requestMessage }
 */
exports.submitClaim = catchAsync(async (req, res) => {
  const { itemId, requestMessage } = req.body;
  if (!itemId || !requestMessage) {
    return res.status(422).json({ error: 'itemId and requestMessage are required' });
  }

  // Only allow claims on VERIFIED items
  const item = await prisma.item.findUnique({ where: { id: itemId } });
  if (!item) return res.status(404).json({ error: 'Item not found' });
  if (item.status !== 'VERIFIED') {
    return res.status(409).json({ error: 'Claims can only be submitted on verified items' });
  }

  // Prevent duplicate pending claims from the same user
  const existing = await prisma.claimRequest.findFirst({
    where: { itemId, requesterId: req.user.id, status: 'PENDING' },
  });
  if (existing) {
    return res.status(409).json({ error: 'You already have a pending claim for this item' });
  }

  const claim = await prisma.claimRequest.create({
    data: { itemId, requesterId: req.user.id, requestMessage },
    include: {
      item:      { select: { id: true, name: true, status: true } },
      requester: { select: { id: true, username: true, email: true } },
    },
  });

  res.status(201).json({ claim });
});

/** GET /api/claims
 *  - ADMIN: returns all claims (filterable by ?status=PENDING|APPROVED|REJECTED)
 *  - User : returns only their own claims
 */
exports.listClaims = catchAsync(async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const where = {};
  if (req.user.role !== 'ADMIN') {
    where.requesterId = req.user.id;
  }
  if (status) {
    where.status = status.toUpperCase();
  }

  const [claims, total] = await prisma.$transaction([
    prisma.claimRequest.findMany({
      where,
      include: {
        item:      { select: { id: true, name: true, status: true, reportType: true } },
        requester: { select: { id: true, username: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: parseInt(limit),
    }),
    prisma.claimRequest.count({ where }),
  ]);

  res.json({
    claims,
    meta: {
      total,
      page:       parseInt(page),
      limit:      parseInt(limit),
      totalPages: Math.ceil(total / parseInt(limit)),
    },
  });
});

/** GET /api/claims/my — alias: current user's claims only */
exports.myClaims = catchAsync(async (req, res) => {
  const claims = await prisma.claimRequest.findMany({
    where:   { requesterId: req.user.id },
    include: { item: { select: { id: true, name: true, status: true } } },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ claims });
});

/** PATCH /api/claims/:id/review — ADMIN
 *  Body: { action: 'APPROVED' | 'REJECTED' }
 */
exports.reviewClaim = catchAsync(async (req, res) => {
  const { action } = req.body;
  if (!['APPROVED', 'REJECTED'].includes(action)) {
    return res.status(422).json({ error: 'action must be APPROVED or REJECTED' });
  }
  await _setClaimStatus(req.params.id, action, res);
});

/** PATCH /api/claims/:id/approve — ADMIN (legacy) */
exports.approveClaim = catchAsync(async (req, res) => {
  await _setClaimStatus(req.params.id, 'APPROVED', res);
});

/** PATCH /api/claims/:id/reject — ADMIN (legacy) */
exports.rejectClaim = catchAsync(async (req, res) => {
  await _setClaimStatus(req.params.id, 'REJECTED', res);
});

// ─── Internal helper ─────────────────────────────────────────────────────────

async function _setClaimStatus(id, status, res) {
  const claim = await prisma.claimRequest.findUnique({
    where:   { id },
    include: {
      item:      { select: { id: true, name: true, status: true } },
      requester: { select: { id: true, username: true, email: true } },
    },
  });
  if (!claim) return res.status(404).json({ error: 'Claim not found' });
  if (claim.status !== 'PENDING') {
    return res.status(409).json({ error: `Claim has already been ${claim.status.toLowerCase()}` });
  }

  const updated = await prisma.claimRequest.update({
    where:   { id },
    data:    { status },
    include: {
      item:      { select: { id: true, name: true, status: true } },
      requester: { select: { id: true, username: true, email: true } },
    },
  });

  // If approved → mark item as CLAIMED and reject all other pending claims for it
  if (status === 'APPROVED') {
    await prisma.$transaction([
      prisma.item.update({
        where: { id: claim.itemId },
        data:  { status: 'CLAIMED', claimedById: claim.requesterId, claimedAt: new Date() },
      }),
      // Auto-reject sibling pending claims
      prisma.claimRequest.updateMany({
        where: { itemId: claim.itemId, status: 'PENDING', id: { not: id } },
        data:  { status: 'REJECTED' },
      }),
    ]);
  }

  // Notify the requester
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
