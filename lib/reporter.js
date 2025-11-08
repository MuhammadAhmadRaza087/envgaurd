const fs = require('fs').promises;
const yaml = require('js-yaml');

/**
 * Generate a comprehensive report from scan results
 * @param {Object} data - Scan data
 * @param {Object} data.envKeys - Environment keys found
 * @param {Array} data.secrets - Secrets detected
 * @param {Object} data.envFiles - .env file analysis
 * @param {Object} data.gitHistory - Git history findings (optional)
 * @returns {Object} Structured report
 */
function generateReport(data) {
    const {
        envKeys = [],
        secrets = [],
        envFiles = {},
        gitHistory = null,
        filesScanned = 0
    } = data;

    // Calculate severity counts
    const severityCounts = {
        high: secrets.filter(s => s.confidence === 'high').length,
        medium: secrets.filter(s => s.confidence === 'medium').length,
        low: secrets.filter(s => s.confidence === 'low').length
    };

    // Build the report
    const report = {
        metadata: {
            generatedAt: new Date().toISOString(),
            tool: 'EnvInspect',
            version: '0.1.0'
        },
        summary: {
            filesScanned,
            envKeysFound: envKeys.length,
            secretsFound: secrets.length,
            envFilesFound: envFiles.totalFiles || 0,
            committedEnvFiles: envFiles.committedFiles || 0,
            severity: {
                high: severityCounts.high,
                medium: severityCounts.medium,
                low: severityCounts.low
            },
            overallRisk: calculateOverallRisk(severityCounts, envFiles)
        },
        envKeys: envKeys.map(key => ({
            name: key.name,
            usageCount: key.locations ? key.locations.length : 0,
            locations: key.locations || []
        })),
        secrets: secrets.map(secret => ({
            type: secret.type,
            file: secret.file,
            line: secret.line,
            snippet: secret.snippet,
            confidence: secret.confidence,
            remediation: secret.remediation
        })),
        envFiles: envFiles.envFiles || [],
        gitHistory: gitHistory || { checked: false, leaksFound: 0, findings: [] },
        recommendations: generateRecommendations({
            secrets,
            envFiles,
            envKeys
        })
    };

    return report;
}

/**
 * Calculate overall risk level
 * @param {Object} severityCounts - Counts by severity
 * @param {Object} envFiles - .env file data
 * @returns {string} Risk level (critical/high/medium/low/none)
 */
function calculateOverallRisk(severityCounts, envFiles) {
    if (severityCounts.high > 0 || (envFiles.committedFiles && envFiles.committedFiles > 0)) {
        return 'critical';
    }
    if (severityCounts.medium > 3) {
        return 'high';
    }
    if (severityCounts.medium > 0 || severityCounts.low > 5) {
        return 'medium';
    }
    if (severityCounts.low > 0) {
        return 'low';
    }
    return 'none';
}

/**
 * Generate actionable recommendations
 * @param {Object} data - Scan data
 * @returns {Array<string>} List of recommendations
 */
function generateRecommendations(data) {
    const recommendations = [];
    const { secrets, envFiles } = data;

    // High-priority secrets
    const highConfidenceSecrets = secrets.filter(s => s.confidence === 'high');
    if (highConfidenceSecrets.length > 0) {
        recommendations.push({
            priority: 'CRITICAL',
            action: `Rotate ${highConfidenceSecrets.length} high-confidence secret(s) immediately`,
            details: 'High-confidence secrets detected in code. See remediation for each finding.'
        });
    }

    // Committed .env files
    if (envFiles.committedFiles > 0) {
        recommendations.push({
            priority: 'CRITICAL',
            action: 'Remove .env files from git tracking',
            details: 'Add .env to .gitignore and use git filter-repo to remove from history. See docs/REMEDIATION.md'
        });
    }

    // Missing .env.example
    if (envFiles.envFiles && envFiles.envFiles.some(f => f.path === '.env')) {
        const hasExample = envFiles.envFiles.some(f => f.path === '.env.example');
        if (!hasExample) {
            recommendations.push({
                priority: 'HIGH',
                action: 'Generate .env.example file',
                details: 'Run `envinspect --fix` to create .env.example for team documentation'
            });
        }
    }

    // Many env vars without documentation
    if (data.envKeys && data.envKeys.length > 10) {
        recommendations.push({
            priority: 'MEDIUM',
            action: 'Document environment variables',
            details: `Found ${data.envKeys.length} environment variables. Document them in README.md or .env.example`
        });
    }

    // Medium-confidence secrets
    const mediumSecrets = secrets.filter(s => s.confidence === 'medium');
    if (mediumSecrets.length > 0) {
        recommendations.push({
            priority: 'MEDIUM',
            action: `Review ${mediumSecrets.length} medium-confidence finding(s)`,
            details: 'These may be false positives but should be verified'
        });
    }

    // General best practices
    recommendations.push({
        priority: 'INFO',
        action: 'Set up pre-commit hooks',
        details: 'Use `npx envinspect --check` in git pre-commit hook to prevent accidental commits'
    });

    return recommendations;
}

/**
 * Save report to file in JSON format
 * @param {Object} report - Report object
 * @param {string} outputPath - Output file path
 * @returns {Promise<void>}
 */
async function saveReportJSON(report, outputPath) {
    try {
        const content = JSON.stringify(report, null, 2);
        await fs.writeFile(outputPath, content, 'utf-8');
    } catch (error) {
        throw new Error(`Failed to save JSON report: ${error.message}`);
    }
}

/**
 * Save report to file in YAML format
 * @param {Object} report - Report object
 * @param {string} outputPath - Output file path
 * @returns {Promise<void>}
 */
async function saveReportYAML(report, outputPath) {
    try {
        const content = yaml.dump(report, {
            indent: 2,
            lineWidth: 120,
            noRefs: true
        });
        await fs.writeFile(outputPath, content, 'utf-8');
    } catch (error) {
        throw new Error(`Failed to save YAML report: ${error.message}`);
    }
}

/**
 * Format report for console output
 * @param {Object} report - Report object
 * @returns {string} Formatted console output
 */
function formatConsoleReport(report) {
    const lines = [];
    const { summary, secrets, envFiles, recommendations } = report;

    // Header
    lines.push('');
    lines.push('═══════════════════════════════════════════════════════════');
    lines.push('                    EnvInspect Report                        ');
    lines.push('═══════════════════════════════════════════════════════════');
    lines.push('');

    // Summary
    lines.push(`📊 Summary:`);
    lines.push(`   Files scanned:           ${summary.filesScanned}`);
    lines.push(`   Environment keys found:  ${summary.envKeysFound}`);
    lines.push(`   Secrets detected:        ${summary.secretsFound}`);
    lines.push(`   .env files found:        ${summary.envFilesFound}`);
    lines.push(`   Committed .env files:    ${summary.committedEnvFiles}`);
    lines.push(`   Overall risk:            ${getRiskEmoji(summary.overallRisk)} ${summary.overallRisk.toUpperCase()}`);
    lines.push('');

    // Severity breakdown
    if (summary.secretsFound > 0) {
        lines.push(`🔍 Secrets by confidence:`);
        lines.push(`   High:    ${summary.severity.high}`);
        lines.push(`   Medium:  ${summary.severity.medium}`);
        lines.push(`   Low:     ${summary.severity.low}`);
        lines.push('');
    }

    // Top secrets (first 5)
    if (secrets.length > 0) {
        lines.push(`🚨 Top secret findings (showing ${Math.min(5, secrets.length)} of ${secrets.length}):`);
        secrets.slice(0, 5).forEach((secret, idx) => {
            lines.push(`   ${idx + 1}. [${secret.confidence.toUpperCase()}] ${secret.type}`);
            lines.push(`      File: ${secret.file}:${secret.line}`);
            lines.push(`      Snippet: ${secret.snippet}`);
            lines.push(`      Action: ${secret.remediation}`);
            lines.push('');
        });
    }

    // .env files issues
    if (envFiles && envFiles.length > 0) {
        const committed = envFiles.filter(f => f.isCommitted);
        if (committed.length > 0) {
            lines.push(`⚠️  Committed .env files:`);
            committed.forEach(f => {
                lines.push(`   - ${f.path} (${f.keysFound} keys)`);
            });
            lines.push('');
        }
    }

    // Recommendations
    if (recommendations.length > 0) {
        lines.push(`💡 Recommendations:`);
        recommendations.slice(0, 5).forEach((rec, idx) => {
            const emoji = getPriorityEmoji(rec.priority);
            lines.push(`   ${idx + 1}. ${emoji} [${rec.priority}] ${rec.action}`);
            lines.push(`      ${rec.details}`);
            lines.push('');
        });
    }

    lines.push('═══════════════════════════════════════════════════════════');
    lines.push('');

    if (summary.overallRisk === 'critical' || summary.overallRisk === 'high') {
        lines.push('⚠️  Action required! Review findings and follow remediation steps.');
        lines.push('   See docs/REMEDIATION.md for detailed instructions.');
    } else if (summary.overallRisk === 'medium') {
        lines.push('⚡ Some issues found. Review and address when possible.');
    } else if (summary.overallRisk === 'low') {
        lines.push('✓ Minor findings only. Review at your convenience.');
    } else {
        lines.push('✅ No critical issues found. Good job!');
    }

    lines.push('');

    return lines.join('\n');
}

/**
 * Get emoji for risk level
 * @param {string} risk - Risk level
 * @returns {string} Emoji
 */
function getRiskEmoji(risk) {
    const emojis = {
        critical: '🔴',
        high: '🟠',
        medium: '🟡',
        low: '🟢',
        none: '✅'
    };
    return emojis[risk] || '⚪';
}

/**
 * Get emoji for priority
 * @param {string} priority - Priority level
 * @returns {string} Emoji
 */
function getPriorityEmoji(priority) {
    const emojis = {
        CRITICAL: '🚨',
        HIGH: '⚠️',
        MEDIUM: '⚡',
        LOW: 'ℹ️',
        INFO: '💡'
    };
    return emojis[priority] || '•';
}

module.exports = {
    generateReport,
    saveReportJSON,
    saveReportYAML,
    formatConsoleReport,
    calculateOverallRisk,
    generateRecommendations
};
