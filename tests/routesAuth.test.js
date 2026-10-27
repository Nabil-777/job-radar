const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const app = require('../server');
const { db } = require('../src/db/database');

describe('Integration: /api/auth routes', () => {
  const testEmail = `test_auth_${Date.now()}@example.com`;
  const testPassword = 'Password123!';
  let authToken = '';

  it('POST /api/auth/signup - creates new user and returns JWT token', async () => {
    const res = await request(app)
      .post('/api/auth/signup')
      .send({
        email: testEmail,
        password: testPassword,
        fullName: 'Test Automation User'
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.ok(res.body.token);
    assert.equal(res.body.user.email, testEmail);
    authToken = res.body.token;
  });

  it('POST /api/auth/signup - rejects duplicate email with 409', async () => {
    const res = await request(app)
      .post('/api/auth/signup')
      .send({
        email: testEmail,
        password: testPassword,
        fullName: 'Another Name'
      });

    assert.equal(res.status, 409);
    assert.equal(res.body.success, false);
  });

  it('POST /api/auth/signup - rejects invalid email with 400', async () => {
    const res = await request(app)
      .post('/api/auth/signup')
      .send({
        email: 'invalid-email',
        password: 'short',
        fullName: ''
      });

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
  });

  it('POST /api/auth/login - authenticates valid user', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: testEmail,
        password: testPassword
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.token);
  });

  it('POST /api/auth/login - rejects wrong password with 401', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: testEmail,
        password: 'wrongpassword'
      });

    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
  });

  it('GET /api/auth/me - returns user profile with valid Bearer token', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${authToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.user.email, testEmail);
  });

  it('GET /api/auth/me - rejects request without token with 401', async () => {
    const res = await request(app)
      .get('/api/auth/me');

    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
  });

  it('GET /api/auth/me - rejects malformed or invalid token with 401', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer invalid.token.payload');

    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
  });

  it('POST /api/auth/demo - returns instant guest demo credentials', async () => {
    const res = await request(app)
      .post('/api/auth/demo');

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.token);
  });

  it('POST /api/auth/logout - clears session successfully', async () => {
    const res = await request(app)
      .post('/api/auth/logout');

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
  });
});
