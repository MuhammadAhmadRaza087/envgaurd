const fs = require('fs').promises;
const path = require('path');
const fg = require('fast-glob');

/**
 * Secret detection patterns with confidence levels
 * Each pattern includes: regex, name, confidence (high/medium/low), and remediation advice
 */
const SECRET_PATTERNS = [
    {
        name: 'AWS Access Key ID',
        pattern: /AKIA[0-9A-Z]{16}/gi,
        confidence: 'high',
        remediation: 'Rotate AWS credentials immediately via AWS IAM console. Use AWS Secrets Manager or environment variables.'
    },
    {
        name: 'AWS Secret Access Key',
        pattern: /aws_secret_access_key\s*=\s*['"]?([A-Za-z0-9/+=]{40})['"]?/gi,
        confidence: 'high',
        remediation: 'Rotate AWS credentials immediately via AWS IAM console.'
    },
    {
        name: 'Google API Key',
        pattern: /AIza[0-9A-Za-z_-]{35}/gi,
        confidence: 'high',
        remediation: 'Regenerate API key in Google Cloud Console and restrict by IP/domain.'
    },
    {
        name: 'Slack Token',
        pattern: /xox[pboa]-[0-9]{12}-[0-9]{12}-[0-9]{12}-[a-z0-9]{32}/gi,
        confidence: 'high',
        remediation: 'Revoke token in Slack App settings and regenerate.'
    },
    {
        name: 'Stripe API Key',
        pattern: /sk_live_[0-9a-zA-Z]{24,}/gi,
        confidence: 'high',
        remediation: 'Roll the API key in Stripe Dashboard immediately.'
    },
    {
        name: 'Stripe Restricted API Key',
        pattern: /rk_live_[0-9a-zA-Z]{24,}/gi,
        confidence: 'high',
        remediation: 'Roll the API key in Stripe Dashboard immediately.'
    },
    {
        name: 'GitHub Token',
        pattern: /gh[pousr]_[A-Za-z0-9_]{36,}/gi,
        confidence: 'high',
        remediation: 'Revoke token at github.com/settings/tokens and regenerate.'
    },
    {
        name: 'Generic API Key',
        pattern: /(?:api[_-]?key|apikey|api[_-]?secret)\s*[:=]\s*['"]?([A-Za-z0-9_\-]{20,})['"]?/gi,
        confidence: 'medium',
        remediation: 'Verify if this is a real API key. If so, rotate it with your provider.'
    },
    {
        name: 'Generic Secret',
        pattern: /(?:secret|password|passwd|pwd)\s*[:=]\s*['"]?([A-Za-z0-9!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]{8,})['"]?/gi,
        confidence: 'medium',
        remediation: 'Verify if this is a real secret. If so, rotate it immediately.'
    },
    {
        name: 'Private Key (RSA)',
        pattern: /-----BEGIN (?:RSA )?PRIVATE KEY-----/gi,
        confidence: 'high',
        remediation: 'Regenerate the private key and update everywhere it is used. Never commit private keys.'
    },
    {
        name: 'JWT Token',
        pattern: /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/gi,
        confidence: 'medium',
        remediation: 'If this is a real token, invalidate it and investigate how it was exposed.'
    },
    {
        name: 'Base64 High Entropy String',
        pattern: /(?:^|[^A-Za-z0-9+/])([A-Za-z0-9+/]{40,}={0,2})(?:[^A-Za-z0-9+/]|$)/g,
        confidence: 'low',
        remediation: 'Review this string - it may be encoded credentials or a token.'
    },
    {
        name: 'Heroku API Key',
        pattern: /[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/gi,
        confidence: 'medium',
        remediation: 'Regenerate Heroku API key if this is legitimate.'
    },
    {
        name: 'Generic Bearer Token',
        pattern: /bearer\s+[A-Za-z0-9_\-\.]{20,}/gi,
        confidence: 'medium',
        remediation: 'Verify and rotate this bearer token with your auth provider.'
    },
    {
        name: 'Database Connection String',
        pattern: /(?:mongodb|mysql|postgresql|postgres):\/\/[^\s'"]+/gi,
        confidence: 'high',
        remediation: 'Move connection string to environment variables. Rotate credentials if exposed.'
    }
];

/**
 * Redact a secret value for display
 * Shows first 4 and last 2 characters
 * @param {string} secret - The secret to redact
 * @returns {string} Redacted version
 */
function redactSecret(secret) {
    if (!secret || secret.length <= 8) {
        return '***REDACTED***';
    }
    const first = secret.substring(0, 4);
    const last = secret.substring(secret.length - 2);
    const middleLength = secret.length - 6;
    return `${first}${'*'.repeat(middleLength)}${last}`;
}

/**
 * Detect secrets in file content
 * @param {string} content - File content
 * @param {string} filePath - Path to file (for reporting)
 * @param {string} repoPath - Repository root path
 * @returns {Array<Object>} Array of detected secrets
 */
function detectSecretsInContent(content, filePath, repoPath = '') {
    const secrets = [];
    const lines = content.split('\n');

    SECRET_PATTERNS.forEach(({ name, pattern, confidence, remediation }) => {
        lines.forEach((line, lineIndex) => {
            // Reset regex state
            pattern.lastIndex = 0;
            const matches = line.matchAll(new RegExp(pattern.source, pattern.flags));

            for (const match of matches) {
                const matched = match[0];
                const snippet = redactSecret(matched);

                secrets.push({
                    type: name,
                    file: repoPath ? path.relative(repoPath, filePath) : filePath,
                    line: lineIndex + 1,
                    snippet,
                    confidence,
                    remediation,
                    context: line.trim().substring(0, 80)
                });
            }
        });
    });

    return secrets;
}

/**
 * Scan repository for secrets
 * @param {string} repoPath - Path to repository
 * @param {Object} options - Scan options
 * @param {Array<string>} options.exclude - Patterns to exclude
 * @param {Array<string>} options.include - Patterns to include
 * @param {number} options.maxFiles - Max files to scan
 * @returns {Promise<Object>} Secrets found
 */
async function scanForSecrets(repoPath, options = {}) {
    const {
        exclude = [],
        include = ['**/*'],
        maxFiles = Infinity
    } = options;

    const excludePatterns = [
        '**/node_modules/**',
        '**/.git/**',
        '**/dist/**',
        '**/build/**',
        '**/coverage/**',
        '**/*.min.js',
        '**/*.bundle.js',
        '**/vendor/**',
        '**/.next/**',
        '**/out/**',
        '**/*.{png,jpg,jpeg,gif,svg,ico,woff,woff2,ttf,eot,pdf,zip,tar,gz,mp4,mp3,avi}',
        ...exclude
    ];

    try {
        const files = await fg(include, {
            cwd: repoPath,
            absolute: true,
            ignore: excludePatterns,
            onlyFiles: true,
            dot: true  // Include dotfiles like .env
        });

        const filesToScan = files.slice(0, maxFiles);
        const allSecrets = [];

        for (const filePath of filesToScan) {
            try {
                const stats = await fs.stat(filePath);
                // Skip very large files (>1MB)
                if (stats.size > 1024 * 1024) continue;

                const content = await fs.readFile(filePath, 'utf-8');
                const secrets = detectSecretsInContent(content, filePath, repoPath);
                allSecrets.push(...secrets);
            } catch {
                // Skip binary files or files that can't be read as text
                continue;
            }
        }

        return {
            secrets: allSecrets,
            filesScanned: filesToScan.length
        };
    } catch (error) {
        throw new Error(`Failed to scan for secrets: ${error.message}`);
    }
}

/**
 * Scan a single file for secrets
 * @param {string} filePath - Path to file
 * @returns {Promise<Array>} Array of secrets found
 */
async function scanFileForSecrets(filePath) {
    try {
        const content = await fs.readFile(filePath, 'utf-8');
        return detectSecretsInContent(content, filePath);
    } catch (error) {
        throw new Error(`Failed to scan file for secrets: ${error.message}`);
    }
}

module.exports = {
    scanForSecrets,
    scanFileForSecrets,
    detectSecretsInContent,
    redactSecret,
    SECRET_PATTERNS
};
