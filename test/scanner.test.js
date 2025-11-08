const test = require('ava');
const { scanFile, ENV_PATTERNS } = require('../lib/scanner');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');

test('ENV_PATTERNS should detect process.env.VAR_NAME', t => {
    const code = 'const key = process.env.API_KEY;';
    const pattern = ENV_PATTERNS[0];
    const matches = [...code.matchAll(pattern)];

    t.is(matches.length, 1);
    t.is(matches[0][1], 'API_KEY');
});

test('ENV_PATTERNS should detect process.env["VAR_NAME"]', t => {
    const code = 'const key = process.env["API_KEY"];';
    const pattern = ENV_PATTERNS[1];
    const matches = [...code.matchAll(pattern)];

    t.is(matches.length, 1);
    t.is(matches[0][1], 'API_KEY');
});

test('ENV_PATTERNS should detect process.env?.VAR_NAME', t => {
    const code = 'const key = process.env?.API_KEY;';
    const pattern = ENV_PATTERNS[2];
    const matches = [...code.matchAll(pattern)];

    t.is(matches.length, 1);
    t.is(matches[0][1], 'API_KEY');
});

test('ENV_PATTERNS should detect import.meta.env.VAR_NAME', t => {
    const code = 'const key = import.meta.env.VITE_API_KEY;';
    const pattern = ENV_PATTERNS[3];
    const matches = [...code.matchAll(pattern)];

    t.is(matches.length, 1);
    t.is(matches[0][1], 'VITE_API_KEY');
});

test('ENV_PATTERNS should detect process.env.VAR ?? default', t => {
    const code = 'const port = process.env.PORT ?? 3000;';
    const pattern = ENV_PATTERNS[5];
    const matches = [...code.matchAll(pattern)];

    t.is(matches.length, 1);
    t.is(matches[0][1], 'PORT');
});

test('scanFile should find multiple env vars', async t => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'envguard-test-'));
    const testFile = path.join(tempDir, 'test.js');

    await fs.writeFile(testFile, `
    const apiKey = process.env.API_KEY;
    const dbUrl = process.env.DATABASE_URL;
    const port = process.env.PORT ?? 3000;
  `);

    const vars = await scanFile(testFile);

    t.true(vars.includes('API_KEY'));
    t.true(vars.includes('DATABASE_URL'));
    t.true(vars.includes('PORT'));
    t.is(vars.length, 3);

    // Cleanup
    await fs.rm(tempDir, { recursive: true, force: true });
});

test('scanFile should handle file with no env vars', async t => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'envguard-test-'));
    const testFile = path.join(tempDir, 'test.js');

    await fs.writeFile(testFile, `
    const x = 5;
    console.log('hello');
  `);

    const vars = await scanFile(testFile);

    t.is(vars.length, 0);

    // Cleanup
    await fs.rm(tempDir, { recursive: true, force: true });
});
