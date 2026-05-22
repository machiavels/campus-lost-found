const request = require('supertest');
const { app, registerAndLogin } = require('./helpers');
const prisma = require('../src/config/prisma');

let claimant, admin, otherUser, itemId, claimId;
const ts = Date.now();

beforeAll(async () => {
  claimant  = await registerAndLogin(`claim-user-${ts}@student.edu`);
  otherUser = await registerAndLogin(`claim-other-${ts}@student.edu`);
  admin     = await registerAndLogin(`claim-admin-${ts}@student.edu`);

  // Elevate admin role
  if (admin.userId) {
    await prisma.user.update({ where: { id: admin.userId }, data: { role: 'ADMIN' } });
  }

  // Create category, location, item in VERIFIED status
  const cat = await prisma.category.create({ data: { name: `ClaimCat-${ts}` } });
  const loc = await prisma.location.create({ data: { name: `ClaimLoc-${ts}` } });
  const item = await prisma.item.create({
    data: {
      reportType: 'FOUND',
      name: `ClaimItem-${ts}`,
      description: 'Test item for claim tests',
      reporterId: otherUser.userId,
      locationId: loc.id,
      categoryId: cat.id,
      status: 'VERIFIED',
    },
  });
  itemId = item.id;
});

afterAll(async () => {
  await prisma.claimRequest.deleteMany({ where: { item: { name: { contains: `ClaimItem-${ts}` } } } });
  await prisma.notification.deleteMany({ where: { item: { name: { contains: `ClaimItem-${ts}` } } } });
  await prisma.item.deleteMany({ where: { name: { contains: `ClaimItem-${ts}` } } });
  await prisma.category.deleteMany({ where: { name: { contains: `ClaimCat-${ts}` } } });
  await prisma.location.deleteMany({ where: { name: { contains: `ClaimLoc-${ts}` } } });
  await prisma.user.deleteMany({ where: { email: { contains: `claim-` } } });
});

// ─── Auth guards ──────────────────────────────────────────────────────────────

describe('Claims — auth guards', () => {
  it('POST /api/claims returns 401 without token', async () => {
    const res = await request(app).post('/api/claims').send({});
    expect(res.status).toBe(401);
  });

  it('GET /api/claims returns 401 without token', async () => {
    const res = await request(app).get('/api/claims');
    expect(res.status).toBe(401);
  });

  it('PATCH /api/claims/:id/review returns 401 without token', async () => {
    const res = await request(app).patch('/api/claims/fake-id/review').send({ action: 'APPROVED' });
    expect(res.status).toBe(401);
  });

  it('PATCH /api/claims/:id/review returns 403 for non-admin', async () => {
    if (!claimant.token) return;
    const res = await request(app)
      .patch('/api/claims/fake-id/review')
      .set('Authorization', `Bearer ${claimant.token}`)
      .send({ action: 'APPROVED' });
    expect(res.status).toBe(403);
  });
});

// ─── POST /api/claims ─────────────────────────────────────────────────────────

describe('POST /api/claims', () => {
  it('submits a claim successfully (201)', async () => {
    if (!claimant.token || !itemId) return;
    const res = await request(app)
      .post('/api/claims')
      .set('Authorization', `Bearer ${claimant.token}`)
      .send({ itemId, requestMessage: 'Je pense que cet objet est à moi' });
    expect(res.status).toBe(201);
    expect(res.body.claim).toBeDefined();
    expect(res.body.claim.status).toBe('PENDING');
    expect(res.body.claim.item).toBeDefined();
    expect(res.body.claim.requester).toBeDefined();
    expect(res.body.claim.requester.email).toBeDefined(); // email is present in claim response
    claimId = res.body.claim.id;
  });

  it('returns 422 when fields are missing', async () => {
    if (!claimant.token) return;
    const res = await request(app)
      .post('/api/claims')
      .set('Authorization', `Bearer ${claimant.token}`)
      .send({ itemId });
    expect(res.status).toBe(422);
  });

  it('returns 409 on duplicate pending claim', async () => {
    if (!claimant.token || !itemId) return;
    const res = await request(app)
      .post('/api/claims')
      .set('Authorization', `Bearer ${claimant.token}`)
      .send({ itemId, requestMessage: 'Second claim attempt' });
    expect(res.status).toBe(409);
  });

  it('returns 409 when item is not VERIFIED', async () => {
    if (!claimant.token) return;
    // Create a PENDING item
    const cat = await prisma.category.findFirst({ where: { name: { contains: `ClaimCat-${ts}` } } });
    const loc = await prisma.location.findFirst({ where: { name: { contains: `ClaimLoc-${ts}` } } });
    const pendingItem = await prisma.item.create({
      data: {
        reportType: 'LOST',
        name: `ClaimPending-${ts}`,
        description: 'pending item',
        reporterId: otherUser.userId,
        locationId: loc.id,
        categoryId: cat.id,
        status: 'PENDING',
      },
    });
    const res = await request(app)
      .post('/api/claims')
      .set('Authorization', `Bearer ${claimant.token}`)
      .send({ itemId: pendingItem.id, requestMessage: 'Claim on pending item' });
    expect(res.status).toBe(409);
    await prisma.item.delete({ where: { id: pendingItem.id } });
  });

  it('returns 404 for unknown item', async () => {
    if (!claimant.token) return;
    const res = await request(app)
      .post('/api/claims')
      .set('Authorization', `Bearer ${claimant.token}`)
      .send({ itemId: '00000000-0000-0000-0000-000000000000', requestMessage: 'Ghost item claim' });
    expect(res.status).toBe(404);
  });
});

// ─── GET /api/claims ──────────────────────────────────────────────────────────

describe('GET /api/claims', () => {
  it('user sees only their own claims (200)', async () => {
    if (!claimant.token) return;
    const res = await request(app)
      .get('/api/claims')
      .set('Authorization', `Bearer ${claimant.token}`);
    expect(res.status).toBe(200);
    expect(res.body.claims).toBeDefined();
    expect(Array.isArray(res.body.claims)).toBe(true);
    expect(res.body.meta).toBeDefined();
    expect(res.body.meta).toHaveProperty('total');
    expect(res.body.meta).toHaveProperty('page');
    expect(res.body.meta).toHaveProperty('totalPages');
    res.body.claims.forEach(c => {
      expect(c.requester.id).toBe(claimant.userId);
    });
  });

  it('admin sees all claims (200)', async () => {
    if (!admin.token) return;
    const res = await request(app)
      .get('/api/claims')
      .set('Authorization', `Bearer ${admin.token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.claims)).toBe(true);
  });

  it('supports ?status=PENDING filter', async () => {
    if (!admin.token) return;
    const res = await request(app)
      .get('/api/claims?status=PENDING')
      .set('Authorization', `Bearer ${admin.token}`);
    expect(res.status).toBe(200);
    res.body.claims.forEach(c => expect(c.status).toBe('PENDING'));
  });
});

// ─── GET /api/claims/my ───────────────────────────────────────────────────────

describe('GET /api/claims/my', () => {
  it('returns current user claims (200)', async () => {
    if (!claimant.token) return;
    const res = await request(app)
      .get('/api/claims/my')
      .set('Authorization', `Bearer ${claimant.token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.claims)).toBe(true);
    res.body.claims.forEach(c => {
      expect(c.item).toBeDefined();
    });
  });
});

// ─── PATCH /api/claims/:id/review ─────────────────────────────────────────────

describe('PATCH /api/claims/:id/review', () => {
  it('returns 422 for invalid action', async () => {
    if (!admin.token || !claimId) return;
    const res = await request(app)
      .patch(`/api/claims/${claimId}/review`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ action: 'INVALID' });
    expect(res.status).toBe(422);
  });

  it('admin can reject a claim (200)', async () => {
    if (!admin.token || !claimId) return;
    const res = await request(app)
      .patch(`/api/claims/${claimId}/review`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ action: 'REJECTED' });
    expect(res.status).toBe(200);
    expect(res.body.claim.status).toBe('REJECTED');
  });

  it('returns 409 when claim already reviewed', async () => {
    if (!admin.token || !claimId) return;
    const res = await request(app)
      .patch(`/api/claims/${claimId}/review`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ action: 'APPROVED' });
    expect(res.status).toBe(409);
  });

  it('returns 404 for unknown claim id', async () => {
    if (!admin.token) return;
    const res = await request(app)
      .patch('/api/claims/00000000-0000-0000-0000-000000000000/review')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ action: 'APPROVED' });
    expect(res.status).toBe(404);
  });
});

// ─── APPROVE flow — auto-reject siblings ─────────────────────────────────────

describe('PATCH /api/claims/:id/approve — full approval flow', () => {
  let item2Id, claim2Id, claim3Id;

  beforeAll(async () => {
    if (!otherUser.userId) return;
    const cat = await prisma.category.findFirst({ where: { name: { contains: `ClaimCat-${ts}` } } });
    const loc = await prisma.location.findFirst({ where: { name: { contains: `ClaimLoc-${ts}` } } });
    const item2 = await prisma.item.create({
      data: {
        reportType: 'FOUND',
        name: `ClaimItem2-${ts}`,
        description: 'Second item for approval flow',
        reporterId: otherUser.userId,
        locationId: loc.id,
        categoryId: cat.id,
        status: 'VERIFIED',
      },
    });
    item2Id = item2.id;

    // claimant submits claim
    const r1 = await request(app)
      .post('/api/claims')
      .set('Authorization', `Bearer ${claimant.token}`)
      .send({ itemId: item2Id, requestMessage: 'Primary claimer' });
    claim2Id = r1.body.claim?.id;

    // otherUser submits a competing claim
    const r2 = await request(app)
      .post('/api/claims')
      .set('Authorization', `Bearer ${otherUser.token}`)
      .send({ itemId: item2Id, requestMessage: 'Competing claimer' });
    claim3Id = r2.body.claim?.id;
  });

  afterAll(async () => {
    await prisma.claimRequest.deleteMany({ where: { itemId: item2Id } });
    await prisma.notification.deleteMany({ where: { itemId: item2Id } });
    await prisma.item.delete({ where: { id: item2Id } }).catch(() => {});
  });

  it('approving a claim sets item to CLAIMED and auto-rejects siblings', async () => {
    if (!admin.token || !claim2Id || !claim3Id) return;
    const res = await request(app)
      .patch(`/api/claims/${claim2Id}/approve`)
      .set('Authorization', `Bearer ${admin.token}`);
    expect(res.status).toBe(200);
    expect(res.body.claim.status).toBe('APPROVED');

    // Sibling should be auto-rejected
    const sibling = await prisma.claimRequest.findUnique({ where: { id: claim3Id } });
    expect(sibling.status).toBe('REJECTED');

    // Item should be CLAIMED
    const item = await prisma.item.findUnique({ where: { id: item2Id } });
    expect(item.status).toBe('CLAIMED');
    expect(item.claimedById).toBe(claimant.userId);
  });
});
