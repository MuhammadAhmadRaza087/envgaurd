const fs = require('fs').promises;
const path = require('path');
const fg = require('fast-glob');

/**
 * Default patterns to exclude from scanning
 */
const DEFAULT_EXCLUDE = [
    '**/node_modules/**',
    '**/.git/**',
    '**/dist/**',
    '**/build/**',
    '**/coverage/**',
    '**/.next/**',
    '**/out/**',
    '**/*.min.js',
    '**/*.bundle.js',
    '**/vendor/**',
    '**/.husky/**'
];

/**
 * Regex patterns to detect environment variable usage
 */
const ENV_PATTERNS = [
    // process.env.VAR_NAME
    /process\.env\.([A-Z_][A-Z0-9_]*)/g,
    // process.env['VAR_NAME'] or process.env["VAR_NAME"]
    /process\.env\[['"]([A-Z_][A-Z0-9_]*)['"]\]/g,
    // process.env?.VAR_NAME (optional chaining)
    /process\.env\?\.([A-Z_][A-Z0-9_]*)/g,
    // import.meta.env.VAR_NAME
    /import\.meta\.env\.([A-Z_][A-Z0-9_]*)/g,
    // import.meta.env['VAR_NAME']
    /import\.meta\.env\[['"]([A-Z_][A-Z0-9_]*)['"]\]/g,
    // process.env.VAR_NAME ?? 'default'
    /process\.env\.([A-Z_][A-Z0-9_]*)\s*\?\?/g
];

/**
 * Scan files in a directory for environment variable usage
 * @param {string} repoPath - Path to the repository
 * @param {Object} options - Scanning options
 * @param {Array<string>} options.exclude - Additional patterns to exclude
 * @param {number} options.maxFiles - Maximum number of files to scan
 * @param {Array<string>} options.include - File patterns to include (default: js, ts, jsx, tsx, mjs, cjs)
 * @returns {Promise<Object>} Scan results with env keys and locations
 */
async function scanRepo(repoPath, options = {}) {
    const {
        exclude = [],
        maxFiles = Infinity,
        include = ['**/*.{js,ts,jsx,tsx,mjs,cjs}']
    } = options;

    const excludePatterns = [...DEFAULT_EXCLUDE, ...exclude];

    try {
        // Find all matching files
        const files = await fg(include, {
            cwd: repoPath,
            absolute: true,
            ignore: excludePatterns,
            onlyFiles: true
        });

        const filesToScan = files.slice(0, maxFiles);
        const envKeysMap = new Map(); // Map<varName, Array<{file, line, snippet}>>
        let filesScanned = 0;

        for (const filePath of filesToScan) {
            try {
                const content = await fs.readFile(filePath, 'utf-8');
                const lines = content.split('\n');

                lines.forEach((line, lineIndex) => {
                    ENV_PATTERNS.forEach(pattern => {
                        const matches = line.matchAll(pattern);
                        for (const match of matches) {
                            const varName = match[1];
                            if (!varName) continue;

                            if (!envKeysMap.has(varName)) {
                                envKeysMap.set(varName, []);
                            }

                            envKeysMap.get(varName).push({
                                file: path.relative(repoPath, filePath),
                                line: lineIndex + 1,
                                snippet: line.trim().substring(0, 100)
                            });
                        }
                    });
                });

                filesScanned++;
            } catch {
                // Skip files that can't be read
                continue;
            }
        }

        // Convert map to array format
        const envKeys = Array.from(envKeysMap.entries()).map(([name, locations]) => ({
            name,
            locations
        }));

        return {
            envKeys,
            filesScanned,
            totalFiles: files.length
        };
    } catch (error) {
        throw new Error(`Failed to scan repository: ${error.message}`);
    }
}

/**
 * Scan a single file for environment variable usage
 * @param {string} filePath - Path to file
 * @returns {Promise<Array>} Array of env var names found
 */
async function scanFile(filePath) {
    try {
        const content = await fs.readFile(filePath, 'utf-8');
        const envVars = new Set();

        ENV_PATTERNS.forEach(pattern => {
            const matches = content.matchAll(pattern);
            for (const match of matches) {
                if (match[1]) {
                    envVars.add(match[1]);
                }
            }
        });

        return Array.from(envVars);
    } catch (error) {
        throw new Error(`Failed to scan file ${filePath}: ${error.message}`);
    }
}

module.exports = {
    scanRepo,
    scanFile,
    ENV_PATTERNS,
    DEFAULT_EXCLUDE
};
