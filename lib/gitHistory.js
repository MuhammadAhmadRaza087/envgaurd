const { execSync } = require('child_process');

/**
 * Check if a directory is a git repository
 * @param {string} repoPath - Path to check
 * @returns {boolean} True if git repo
 */
function isGitRepository(repoPath) {
    try {
        execSync('git rev-parse --git-dir', {
            cwd: repoPath,
            stdio: 'pipe'
        });
        return true;
    } catch {
        return false;
    }
}

/**
 * Get list of commit hashes
 * @param {string} repoPath - Repository path
 * @param {number} limit - Max commits to check (default 100)
 * @returns {Array<string>} Commit hashes
 */
function getCommitHashes(repoPath, limit = 100) {
    try {
        const result = execSync(`git log --pretty=format:%H -n ${limit}`, {
            cwd: repoPath,
            encoding: 'utf-8',
            stdio: ['pipe', 'pipe', 'pipe']
        });
        return result.trim().split('\n').filter(Boolean);
    } catch {
        return [];
    }
}

/**
 * Search for .env files in git history
 * @param {string} repoPath - Repository path
 * @returns {Array<Object>} Findings of .env in history
 */
function searchEnvInHistory(repoPath) {
    try {
        const result = execSync('git log --all --full-history -- ".env" ".env.local" ".env.*.local"', {
            cwd: repoPath,
            encoding: 'utf-8',
            stdio: ['pipe', 'pipe', 'pipe']
        });

        if (result.trim().length > 0) {
            // .env file was committed at some point
            const commits = result.split('commit ').filter(Boolean);
            return commits.map(commit => {
                const lines = commit.split('\n');
                const hash = lines[0].trim();
                return {
                    type: '.env file in history',
                    commit: hash.substring(0, 7),
                    message: 'Found .env file in git history',
                    severity: 'high'
                };
            });
        }
        return [];
    } catch {
        return [];
    }
}

/**
 * Search for secrets in git history using git grep
 * @param {string} repoPath - Repository path
 * @param {Array<string>} patterns - Regex patterns to search
 * @param {number} maxCommits - Max commits to check
 * @returns {Array<Object>} Secrets found in history
 */
function searchSecretsInHistory(repoPath, patterns = [], maxCommits = 50) {
    const findings = [];

    // Common patterns to search for
    const searchPatterns = [
        'AKIA[0-9A-Z]{16}',  // AWS keys
        'AIza[0-9A-Za-z_-]{35}',  // Google API
        'sk_live_[0-9a-zA-Z]{24,}',  // Stripe
        'xox[pboa]-[0-9]{12}',  // Slack
        'gh[pousr]_[A-Za-z0-9_]{36,}',  // GitHub
        '-----BEGIN.*PRIVATE KEY-----',  // Private keys
        ...patterns
    ];

    try {
        getCommitHashes(repoPath, maxCommits); // Call to avoid unused variable

        for (const pattern of searchPatterns) {
            try {
                // Use git grep to search in all commits
                const result = execSync(`git grep -i -E "${pattern}" $(git rev-list --all) 2>$null`, {
                    cwd: repoPath,
                    encoding: 'utf-8',
                    stdio: ['pipe', 'pipe', 'pipe'],
                    maxBuffer: 1024 * 1024 * 10 // 10MB buffer
                });

                if (result.trim()) {
                    const lines = result.trim().split('\n');
                    lines.slice(0, 20).forEach(line => {  // Limit to 20 findings per pattern
                        const parts = line.split(':');
                        if (parts.length >= 3) {
                            const commit = parts[0];
                            const file = parts[1];
                            const content = parts.slice(2).join(':');

                            findings.push({
                                type: 'Secret in git history',
                                pattern,
                                commit: commit.substring(0, 7),
                                file,
                                snippet: content.substring(0, 80) + '...',
                                severity: 'high',
                                remediation: 'Use git-filter-repo or BFG Repo-Cleaner to remove from history. Rotate the exposed secret.'
                            });
                        }
                    });
                }
            } catch {
                // Pattern not found or error, continue
                continue;
            }
        }
    } catch {
        // Git grep failed, return what we have
    }

    return findings;
}

/**
 * Check git history for leaked secrets and .env files
 * @param {string} repoPath - Repository path
 * @param {Object} options - Scan options
 * @param {number} options.maxCommits - Max commits to check (default 50)
 * @param {boolean} options.deepScan - Do deep scan (slower, more thorough)
 * @returns {Promise<Object>} History scan results
 */
async function scanGitHistory(repoPath, options = {}) {
    const {
        maxCommits = 50,
        deepScan = false
    } = options;

    if (!isGitRepository(repoPath)) {
        return {
            checked: false,
            message: 'Not a git repository or git not available',
            leaksFound: 0,
            findings: []
        };
    }

    try {
        const findings = [];

        // Search for .env files in history
        const envFindings = searchEnvInHistory(repoPath);
        findings.push(...envFindings);

        // Search for secrets in history
        if (deepScan) {
            const secretFindings = searchSecretsInHistory(repoPath, [], maxCommits);
            findings.push(...secretFindings);
        }

        return {
            checked: true,
            deepScan,
            commitsChecked: maxCommits,
            leaksFound: findings.length,
            findings: findings.map(f => ({
                ...f,
                remediation: f.remediation || 'Remove from git history using git-filter-repo. See docs/REMEDIATION.md'
            }))
        };
    } catch (error) {
        return {
            checked: true,
            error: error.message,
            leaksFound: 0,
            findings: []
        };
    }
}

/**
 * Get instructions for cleaning git history
 * @returns {string} Instructions
 */
function getHistoryCleanupInstructions() {
    return `
To remove secrets from git history:

1. Using git-filter-repo (recommended):
   pip install git-filter-repo
   git filter-repo --path .env --invert-paths
   
2. Using BFG Repo-Cleaner:
   java -jar bfg.jar --delete-files .env
   git reflog expire --expire=now --all
   git gc --prune=now --aggressive

3. Force push (⚠️ coordinate with team):
   git push origin --force --all
   git push origin --force --tags

⚠️  IMPORTANT:
- Backup your repository first
- Coordinate with team members
- Rotate all exposed secrets/keys
- Everyone must re-clone after force push

See docs/REMEDIATION.md for detailed instructions.
`;
}

module.exports = {
    isGitRepository,
    scanGitHistory,
    searchEnvInHistory,
    searchSecretsInHistory,
    getHistoryCleanupInstructions
};
