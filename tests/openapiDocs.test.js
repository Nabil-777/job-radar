const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const app = require('../server');
const openapiSpec = require('../src/docs/openapi.json');

describe('Task 13: OpenAPI 3.1 & Interactive Swagger UI', () => {
  it('GET /api/docs/ - serves interactive Swagger UI HTML', async () => {
    const res = await request(app).get('/api/docs/');
    assert.equal(res.status, 200);
    assert.ok(res.text.includes('Swagger UI'), 'Must contain Swagger UI title');
    assert.ok(res.text.includes('swagger-ui.css'), 'Must link swagger-ui stylesheet');
    assert.ok(res.text.includes('swagger-ui'), 'Must contain swagger-ui container');
  });

  it('GET /api/docs/openapi.json - serves valid OpenAPI 3.1 spec JSON', async () => {
    const res = await request(app).get('/api/docs/openapi.json');
    assert.equal(res.status, 200);
    assert.equal(res.body.openapi, '3.1.0');
    assert.equal(res.body.info.title, 'JobRadar v2.0 API');
    assert.ok(Object.keys(res.body.paths).length >= 15);
  });

  it('OpenAPI spec document contains all core documented routes and schemas', () => {
    assert.ok(openapiSpec.paths['/api/health']);
    assert.ok(openapiSpec.paths['/api/jobs']);
    assert.ok(openapiSpec.paths['/api/applications']);
    assert.ok(openapiSpec.paths['/api/profile']);
    assert.ok(openapiSpec.paths['/api/providers']);
    assert.ok(openapiSpec.paths['/api/ai/pitch']);
    assert.ok(openapiSpec.paths['/api/ai/tailored-cv']);

    assert.ok(openapiSpec.components.schemas.JobItem);
    assert.ok(openapiSpec.components.schemas.ApplicationItem);
    assert.ok(openapiSpec.components.schemas.AuthSuccessResponse);
  });
});
