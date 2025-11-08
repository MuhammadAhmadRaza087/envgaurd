const test = require('ava');
const { generateReport, formatConsoleReport, calculateOverallRisk } = require('../lib/reporter');

test('generateReport should create valid report structure', t => {
    const data = {
        envKeys: [
            { name: 'API_KEY', locations: [{ file: 'index.js', line: 10 }] }
        ],
        secrets: [
            {
                type: 'AWS Access Key ID',
                file: '.env',
                line: 1,
                snippet: 'AKIA****',
                confidence: 'high',
                remediation: 'Rotate key'
            }
        ],
        envFiles: {
            totalFiles: 1,
            committedFiles: 1,
            envFiles: [{ path: '.env', isCommitted: true }]
        },
        filesScanned: 50
    };

    const report = generateReport(data);

    t.truthy(report.metadata);
    t.is(report.metadata.tool, 'EnvInspect');
    t.truthy(report.summary);
    t.is(report.summary.filesScanned, 50);
    t.is(report.summary.envKeysFound, 1);
    t.is(report.summary.secretsFound, 1);
    t.is(report.summary.severity.high, 1);
    t.truthy(report.recommendations);
    t.true(Array.isArray(report.recommendations));
});

test('calculateOverallRisk should return critical for high secrets', t => {
    const risk = calculateOverallRisk({ high: 1, medium: 0, low: 0 }, {});
    t.is(risk, 'critical');
});

test('calculateOverallRisk should return critical for committed .env', t => {
    const risk = calculateOverallRisk({ high: 0, medium: 0, low: 0 }, { committedFiles: 1 });
    t.is(risk, 'critical');
});

test('calculateOverallRisk should return high for many medium secrets', t => {
    const risk = calculateOverallRisk({ high: 0, medium: 5, low: 0 }, {});
    t.is(risk, 'high');
});

test('calculateOverallRisk should return medium for few medium secrets', t => {
    const risk = calculateOverallRisk({ high: 0, medium: 2, low: 0 }, {});
    t.is(risk, 'medium');
});

test('calculateOverallRisk should return low for only low secrets', t => {
    const risk = calculateOverallRisk({ high: 0, medium: 0, low: 3 }, {});
    t.is(risk, 'low');
});

test('calculateOverallRisk should return none for no secrets', t => {
    const risk = calculateOverallRisk({ high: 0, medium: 0, low: 0 }, {});
    t.is(risk, 'none');
});

test('formatConsoleReport should produce readable output', t => {
    const report = {
        metadata: { generatedAt: new Date().toISOString(), tool: 'EnvInspect', version: '0.1.0' },
        summary: {
            filesScanned: 50,
            envKeysFound: 5,
            secretsFound: 2,
            envFilesFound: 1,
            committedEnvFiles: 1,
            severity: { high: 1, medium: 1, low: 0 },
            overallRisk: 'critical'
        },
        envKeys: [],
        secrets: [
            {
                type: 'AWS Key',
                file: '.env',
                line: 1,
                snippet: 'AKIA****',
                confidence: 'high',
                remediation: 'Rotate immediately'
            }
        ],
        envFiles: [{ path: '.env', isCommitted: true }],
        gitHistory: { checked: false },
        recommendations: [
            { priority: 'CRITICAL', action: 'Rotate secrets', details: 'High-risk secrets found' }
        ]
    };

    const output = formatConsoleReport(report);

    t.true(output.includes('EnvInspect Report'));
    t.true(output.includes('50'));  // files scanned
    t.true(output.includes('CRITICAL'));
    t.true(output.includes('AWS Key'));
});

test('generateReport should include recommendations for high secrets', t => {
    const data = {
        envKeys: [],
        secrets: [
            { type: 'AWS Key', confidence: 'high', remediation: 'Rotate' }
        ],
        envFiles: { totalFiles: 0, committedFiles: 0 },
        filesScanned: 10
    };

    const report = generateReport(data);
    const criticalRecs = report.recommendations.filter(r => r.priority === 'CRITICAL');

    t.true(criticalRecs.length > 0);
    t.true(criticalRecs.some(r => r.action.toLowerCase().includes('secret')));
});

test('generateReport should recommend .env.example creation', t => {
    const data = {
        envKeys: [],
        secrets: [],
        envFiles: {
            totalFiles: 1,
            committedFiles: 0,
            envFiles: [{ path: '.env', isCommitted: false }]
        },
        filesScanned: 10
    };

    const report = generateReport(data);
    const recommendation = report.recommendations.find(r =>
        r.action.toLowerCase().includes('.env.example')
    );

    t.truthy(recommendation);
});

test('generateReport should handle empty data gracefully', t => {
    const data = {
        envKeys: [],
        secrets: [],
        envFiles: { totalFiles: 0, committedFiles: 0 },
        filesScanned: 0
    };

    const report = generateReport(data);

    t.is(report.summary.envKeysFound, 0);
    t.is(report.summary.secretsFound, 0);
    t.is(report.summary.overallRisk, 'none');
});
