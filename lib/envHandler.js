const fs = require('fs').promises;
const path = require('path');
const fg = require('fast-glob');

/**
 * Parse a .env file while preserving comments and structure
 * @param {string} content - .env file content
 * @returns {Array<Object>} Parsed lines with type (comment, empty, variable)
 */
function parseEnvFile(content) {
    const lines = content.split('\n');
    const parsed = [];

    lines.forEach((line, index) => {
        const trimmed = line.trim();

        if (!trimmed || trimmed.startsWith('#')) {
            // Comment or empty line
            parsed.push({
                type: trimmed.startsWith('#') ? 'comment' : 'empty',
                raw: line,
                lineNumber: index + 1
            });
        } else {
            // Try to parse as key=value
            const match = line.match(/^([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/i);
            if (match) {
                const [, key, value] = match;
                parsed.push({
                    type: 'variable',
                    key,
                    value: value.trim(),
                    raw: line,
                    lineNumber: index + 1
                });
            } else {
                // Malformed line, treat as comment
                parsed.push({
                    type: 'comment',
                    raw: line,
                    lineNumber: index + 1
                });
            }
        }
    });

    return parsed;
}

/**
 * Generate .env.example from parsed .env content
 * Replaces values with placeholders while preserving structure
 * @param {Array<Object>} parsed - Parsed .env lines
 * @returns {string} .env.example content
 */
function generateEnvExample(parsed) {
    const lines = parsed.map(entry => {
        if (entry.type === 'variable') {
            // Determine appropriate placeholder based on key name
            let placeholder = 'your_value_here';

            const keyLower = entry.key.toLowerCase();
            if (keyLower.includes('url') || keyLower.includes('uri')) {
                placeholder = 'https://example.com';
            } else if (keyLower.includes('port')) {
                placeholder = '3000';
            } else if (keyLower.includes('email')) {
                placeholder = 'your_email_here';
            } else if (keyLower.includes('host')) {
                placeholder = 'localhost';
            } else if (keyLower.includes('key') || keyLower.includes('secret') || keyLower.includes('token')) {
                placeholder = 'your_secret_key_here';
            } else if (keyLower.includes('database') || keyLower.includes('db')) {
                placeholder = 'database_name';
            } else if (keyLower.includes('user')) {
                placeholder = 'username';
            } else if (keyLower.includes('pass')) {
                placeholder = 'password';
            } else if (keyLower.includes('env') || keyLower.includes('environment')) {
                placeholder = 'development';
            }

            return `${entry.key}=${placeholder}`;
        }
        return entry.raw;
    });

    return lines.join('\n');
}

/**
 * Find all .env files in repository
 * @param {string} repoPath - Repository path
 * @param {Object} options - Search options
 * @returns {Promise<Array<string>>} Array of .env file paths
 */
async function findEnvFiles(repoPath, options = {}) {
    const { exclude = [] } = options;

    const excludePatterns = [
        '**/node_modules/**',
        '**/.git/**',
        '**/dist/**',
        '**/build/**',
        '**/coverage/**',
        ...exclude
    ];

    try {
        const files = await fg(['.env*', '**/.env*'], {
            cwd: repoPath,
            absolute: true,
            ignore: excludePatterns,
            onlyFiles: true,
            dot: true
        });

        return files;
    } catch (error) {
        throw new Error(`Failed to find .env files: ${error.message}`);
    }
}

/**
 * Check if .env file is committed to git
 * @param {string} repoPath - Repository path
 * @param {string} envFilePath - Path to .env file
 * @returns {Promise<boolean>} True if committed
 */
async function isEnvCommitted(repoPath, envFilePath) {
    const { execSync } = require('child_process');

    try {
        const relativePath = path.relative(repoPath, envFilePath);
        const result = execSync(`git ls-files --error-unmatch "${relativePath}"`, {
            cwd: repoPath,
            encoding: 'utf-8',
            stdio: ['pipe', 'pipe', 'ignore']
        });
        return result.trim().length > 0;
    } catch {
        // File not tracked by git
        return false;
    }
}

/**
 * Generate .env.example from .env file
 * @param {string} envPath - Path to .env file
 * @param {Object} options - Generation options
 * @param {string} options.output - Output path (defaults to .env.example)
 * @param {boolean} options.force - Overwrite existing .env.example
 * @returns {Promise<Object>} Result with paths and content
 */
async function createEnvExample(envPath, options = {}) {
    const {
        output = path.join(path.dirname(envPath), '.env.example'),
        force = false
    } = options;

    try {
        // Check if .env.example already exists
        try {
            await fs.access(output);
            if (!force) {
                return {
                    success: false,
                    message: '.env.example already exists. Use --force to overwrite.',
                    existed: true
                };
            }
        } catch {
            // File doesn't exist, continue
        }

        // Read and parse .env
        const content = await fs.readFile(envPath, 'utf-8');
        const parsed = parseEnvFile(content);
        const exampleContent = generateEnvExample(parsed);

        // Write .env.example
        await fs.writeFile(output, exampleContent, 'utf-8');

        return {
            success: true,
            envPath,
            examplePath: output,
            keysFound: parsed.filter(p => p.type === 'variable').length,
            content: exampleContent
        };
    } catch (error) {
        throw new Error(`Failed to create .env.example: ${error.message}`);
    }
}

/**
 * Scan repository for .env issues
 * @param {string} repoPath - Repository path
 * @returns {Promise<Object>} Analysis results
 */
async function analyzeEnvFiles(repoPath) {
    try {
        const envFiles = await findEnvFiles(repoPath);
        const results = [];

        for (const envFile of envFiles) {
            const relativePath = path.relative(repoPath, envFile);
            const isCommitted = await isEnvCommitted(repoPath, envFile);
            const content = await fs.readFile(envFile, 'utf-8');
            const parsed = parseEnvFile(content);
            const keys = parsed.filter(p => p.type === 'variable').map(p => p.key);

            results.push({
                path: relativePath,
                absolutePath: envFile,
                isCommitted,
                keysFound: keys.length,
                keys,
                severity: isCommitted ? 'high' : 'low',
                issue: isCommitted ? 'Committed to git - should be in .gitignore' : 'Not committed (OK)'
            });
        }

        return {
            envFiles: results,
            totalFiles: results.length,
            committedFiles: results.filter(r => r.isCommitted).length
        };
    } catch (error) {
        throw new Error(`Failed to analyze .env files: ${error.message}`);
    }
}

/**
 * Generate suggested .gitignore entry
 * @returns {string} .gitignore content to add
 */
function generateGitignoreEntry() {
    return `
# Environment variables
.env
.env.local
.env.*.local
.env.development.local
.env.test.local
.env.production.local
`;
}

module.exports = {
    parseEnvFile,
    generateEnvExample,
    findEnvFiles,
    isEnvCommitted,
    createEnvExample,
    analyzeEnvFiles,
    generateGitignoreEntry
};
