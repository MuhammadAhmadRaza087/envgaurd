const test = require('ava');
const { parseEnvFile, generateEnvExample, createEnvExample } = require('../lib/envHandler');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');

test('parseEnvFile should parse simple env file', t => {
    const content = `
# Database config
DATABASE_URL=postgresql://localhost:5432/mydb
PORT=3000

# API Keys
API_KEY=secret123
`;

    const parsed = parseEnvFile(content);

    const variables = parsed.filter(p => p.type === 'variable');
    const comments = parsed.filter(p => p.type === 'comment');

    t.is(variables.length, 3);
    t.true(comments.length >= 2);

    const dbUrl = variables.find(v => v.key === 'DATABASE_URL');
    t.is(dbUrl.value, 'postgresql://localhost:5432/mydb');
});

test('parseEnvFile should handle empty lines', t => {
    const content = `KEY1=value1\n\nKEY2=value2`;
    const parsed = parseEnvFile(content);

    const empty = parsed.filter(p => p.type === 'empty');
    t.true(empty.length >= 1);
});

test('parseEnvFile should handle comments', t => {
    const content = `# This is a comment\nKEY=value`;
    const parsed = parseEnvFile(content);

    const comments = parsed.filter(p => p.type === 'comment');
    t.is(comments.length, 1);
});

test('generateEnvExample should replace values with placeholders', t => {
    const content = `
DATABASE_URL=postgresql://localhost:5432/mydb
PORT=3000
API_KEY=secret123
EMAIL=user@example.com
`;

    const parsed = parseEnvFile(content);
    const example = generateEnvExample(parsed);

    t.true(example.includes('DATABASE_URL='));
    t.false(example.includes('postgresql://localhost:5432/mydb'));
    t.true(example.includes('PORT=3000') || example.includes('PORT='));
    t.false(example.includes('secret123'));
    t.false(example.includes('user@example.com'));
});

test('generateEnvExample should preserve comments', t => {
    const content = `# Database config\nDATABASE_URL=postgresql://localhost:5432/mydb`;
    const parsed = parseEnvFile(content);
    const example = generateEnvExample(parsed);

    t.true(example.includes('# Database config'));
});

test('generateEnvExample should use smart placeholders', t => {
    const content = `
DATABASE_URL=postgresql://localhost:5432/mydb
PORT=3000
API_KEY=secret123
SECRET_TOKEN=xyz
HOST=localhost
EMAIL_FROM=test@example.com
`;

    const parsed = parseEnvFile(content);
    const example = generateEnvExample(parsed);

    // Check smart placeholders
    t.true(example.includes('DATABASE_URL=') &&
        (example.includes('https://example.com') || example.includes('database_name')));
    t.true(example.includes('API_KEY=') && example.includes('your_secret_key_here'));
    t.true(example.includes('SECRET_TOKEN=') && example.includes('your_secret_key_here'));
});

test('createEnvExample should create .env.example file', async t => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'envguard-test-'));
    const envPath = path.join(tempDir, '.env');
    const examplePath = path.join(tempDir, '.env.example');

    await fs.writeFile(envPath, `
# Config
API_KEY=secret123
DATABASE_URL=postgresql://localhost/db
`);

    const result = await createEnvExample(envPath);

    t.true(result.success);
    t.is(result.keysFound, 2);

    const exampleContent = await fs.readFile(examplePath, 'utf-8');
    t.true(exampleContent.includes('# Config'));
    t.true(exampleContent.includes('API_KEY='));
    t.false(exampleContent.includes('secret123'));

    // Cleanup
    await fs.rm(tempDir, { recursive: true, force: true });
});

test('createEnvExample should not overwrite without force', async t => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'envguard-test-'));
    const envPath = path.join(tempDir, '.env');
    const examplePath = path.join(tempDir, '.env.example');

    await fs.writeFile(envPath, 'KEY=value');
    await fs.writeFile(examplePath, 'existing content');

    const result = await createEnvExample(envPath, { force: false });

    t.false(result.success);
    t.true(result.existed);

    // Existing content should be unchanged
    const content = await fs.readFile(examplePath, 'utf-8');
    t.is(content, 'existing content');

    // Cleanup
    await fs.rm(tempDir, { recursive: true, force: true });
});

test('createEnvExample should overwrite with force option', async t => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'envguard-test-'));
    const envPath = path.join(tempDir, '.env');
    const examplePath = path.join(tempDir, '.env.example');

    await fs.writeFile(envPath, 'KEY=value');
    await fs.writeFile(examplePath, 'old content');

    const result = await createEnvExample(envPath, { force: true });

    t.true(result.success);

    const content = await fs.readFile(examplePath, 'utf-8');
    t.not(content, 'old content');
    t.true(content.includes('KEY='));

    // Cleanup
    await fs.rm(tempDir, { recursive: true, force: true });
});
