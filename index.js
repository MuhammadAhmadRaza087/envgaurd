const path = require('path');
const { scanRepo, scanFile } = require('./lib/scanner');
const { scanForSecrets, scanFileForSecrets } = require('./lib/secrets');
const { analyzeEnvFiles, createEnvExample, generateGitignoreEntry } = require('./lib/envHandler');
const { scanGitHistory } = require('./lib/gitHistory');
const { generateReport, saveReportJSON, saveReportYAML, formatConsoleReport } = require('./lib/reporter');

/**
 * Main API: Scan repository for environment variable issues and secrets
 * @param {string} repoPath - Path to repository
 * @param {Object} options - Scan options
 * @param {boolean} options.checkHistory - Check git history for leaks
 * @param {boolean} options.deepScan - Do deep/slow scan
 * @param {Array<string>} options.exclude - Patterns to exclude
 * @param {number} options.maxFiles - Max files to scan
 * @returns {Promise<Object>} Scan results
 */
async function scanRepository(repoPath, options = {}) {
  const {
    checkHistory = false,
    deepScan = false,
    exclude = [],
    maxFiles = Infinity
  } = options;

  const absPath = path.resolve(repoPath);

  try {
    // Scan for environment variable usage
    const envScan = await scanRepo(absPath, { exclude, maxFiles });

    // Scan for secrets
    const secretScan = await scanForSecrets(absPath, { exclude, maxFiles });

    // Analyze .env files
    const envAnalysis = await analyzeEnvFiles(absPath);

    // Optionally scan git history
    let historyResults = null;
    if (checkHistory) {
      historyResults = await scanGitHistory(absPath, { deepScan });
    }

    // Combine all secrets
    const allSecrets = [...secretScan.secrets];
    if (historyResults && historyResults.findings) {
      allSecrets.push(...historyResults.findings.map(f => ({
        type: f.type,
        file: 'git-history',
        line: 0,
        snippet: f.snippet || f.message,
        confidence: 'high',
        remediation: f.remediation
      })));
    }

    return {
      envKeys: envScan.envKeys,
      secrets: allSecrets,
      envFiles: envAnalysis,
      gitHistory: historyResults,
      filesScanned: envScan.filesScanned
    };
  } catch (error) {
    throw new Error(`Repository scan failed: ${error.message}`);
  }
}

/**
 * Generate .env.example from .env file
 * @param {string} envPath - Path to .env file
 * @param {Object} options - Generation options
 * @returns {Promise<Object>} Result
 */
async function generateEnvExample(envPath, options = {}) {
  return createEnvExample(envPath, options);
}

/**
 * Generate and save report
 * @param {Object} scanResults - Results from scanRepository
 * @param {string} outputPath - Path to save report
 * @param {string} format - Format: 'json' or 'yaml'
 * @returns {Promise<Object>} Report object
 */
async function reportToFile(scanResults, outputPath, format = 'json') {
  const report = generateReport(scanResults);

  if (format === 'json') {
    await saveReportJSON(report, outputPath);
  } else if (format === 'yaml') {
    await saveReportYAML(report, outputPath);
  } else {
    throw new Error(`Unsupported format: ${format}`);
  }

  return report;
}

// Export public API
module.exports = {
  scanRepository,
  scanRepo,
  scanFile,
  scanForSecrets,
  scanFileForSecrets,
  generateEnvExample,
  analyzeEnvFiles,
  scanGitHistory,
  generateReport,
  reportToFile,
  saveReportJSON,
  saveReportYAML,
  formatConsoleReport,
  generateGitignoreEntry
};
