const fs = require('fs');
const path = require('path');

function lintOpenApiSpec(specPath) {
  const errors = [];
  const warnings = [];

  if (!fs.existsSync(specPath)) {
    console.error(`FATAL: OpenAPI specification file not found at: ${specPath}`);
    process.exit(1);
  }

  let spec;
  try {
    spec = JSON.parse(fs.readFileSync(specPath, 'utf8'));
  } catch (err) {
    console.error(`FATAL: JSON parsing error in OpenAPI spec: ${err.message}`);
    process.exit(1);
  }

  // 1. Version check
  if (!spec.openapi || !spec.openapi.startsWith('3.')) {
    errors.push(`openapi version must be 3.x (found: ${spec.openapi})`);
  }

  // 2. Info check
  if (!spec.info) {
    errors.push('Missing required "info" object');
  } else {
    if (!spec.info.title) errors.push('info.title is required');
    if (!spec.info.version) errors.push('info.version is required');
  }

  // 3. Paths check
  if (!spec.paths || typeof spec.paths !== 'object' || Object.keys(spec.paths).length === 0) {
    errors.push('spec.paths must contain at least one endpoint');
  }

  const validMethods = ['get', 'post', 'put', 'patch', 'delete', 'options', 'head'];
  const allRefs = [];

  function collectRefs(obj) {
    if (!obj || typeof obj !== 'object') return;
    if (obj.$ref && typeof obj.$ref === 'string') {
      allRefs.push(obj.$ref);
    }
    for (const key of Object.keys(obj)) {
      collectRefs(obj[key]);
    }
  }

  collectRefs(spec);

  // 4. Validate paths & operations
  for (const [routePath, pathItem] of Object.entries(spec.paths || {})) {
    if (!routePath.startsWith('/')) {
      errors.push(`Path "${routePath}" must start with a slash`);
    }

    const operations = Object.keys(pathItem).filter(k => validMethods.includes(k.toLowerCase()));
    if (operations.length === 0) {
      warnings.push(`Path "${routePath}" has no HTTP operations`);
    }

    for (const op of operations) {
      const operation = pathItem[op];
      if (!operation.responses || Object.keys(operation.responses).length === 0) {
        errors.push(`Operation ${op.toUpperCase()} ${routePath} is missing required responses`);
      }
    }
  }

  // 5. Verify all $ref pointers resolve
  const schemas = spec.components?.schemas || {};
  for (const ref of allRefs) {
    if (ref.startsWith('#/components/schemas/')) {
      const schemaName = ref.replace('#/components/schemas/', '');
      if (!schemas[schemaName]) {
        errors.push(`Unresolved $ref: "${ref}" does not exist in components.schemas`);
      }
    }
  }

  // Print results
  if (warnings.length > 0) {
    console.warn('OpenAPI Warnings:\n' + warnings.map(w => `  - ${w}`).join('\n'));
  }

  if (errors.length > 0) {
    console.error('OpenAPI Lint Failed with errors:\n' + errors.map(e => `  ✖ ${e}`).join('\n'));
    process.exit(1);
  }

  console.log(`✅ OpenAPI 3.1 specification is valid: ${Object.keys(spec.paths).length} paths, ${Object.keys(schemas).length} schemas.`);
}

const specFile = path.join(__dirname, '../src/docs/openapi.json');
lintOpenApiSpec(specFile);
