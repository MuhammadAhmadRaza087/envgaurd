#!/usr/bin/env node

const { program } = require('commander');
const path = require('path');
const fs = require('fs').promises;
const {
    scanRepository,
    generateEnvExample,
    generateReport,
    saveReportJSON,
    saveReportYAML,
    formatConsoleReport,
    generateGitignoreEntry
} = require('../index');

program
    .name('envinspect')
    .version('0.1.1')
    .description('EnvInspect — scan repos for environment variable issues & secrets');

program
    .option('-p, --path <path>', 'path to repository to scan', '.')
    .option('--fix', 'generate .env.example and auto-fix issues')
    .option('--json <file>', 'output report as JSON to specified file')
    .option('--yaml <file>', 'output report as YAML to specified file')
    .option('--output <file>', 'output report (format detected from extension)')
    .option('--check-history', 'scan git history for leaked secrets (slower)')
    .option('--deep-scan', 'perform deep scan (slower, more thorough)')
    .option('--ci', 'CI mode: exit with error code if high-confidence secrets found')
    .option('--max-files <number>', 'maximum number of files to scan', parseInt)
    .option('--exclude <patterns...>', 'additional glob patterns to exclude')
    .option('--force', 'force overwrite when using --fix')
    .action(async (options) => {
        const startTime = Date.now();

        try {
            const repoPath = path.resolve(options.path);

            // Show scanning message
            console.log('');
            console.log('🔍 EnvInspect - Scanning for environment variable issues...');
            console.log(`📁 Repository: ${repoPath}`);
            console.log('');

            // Perform scan
            const scanOptions = {
                checkHistory: options.checkHistory || false,
                deepScan: options.deepScan || false,
                exclude: options.exclude || [],
                maxFiles: options.maxFiles || Infinity
            };

            const results = await scanRepository(repoPath, scanOptions);
            const report = generateReport(results);

            // Handle --fix option
            if (options.fix) {
                console.log('🔧 Fix mode enabled...');

                // Generate .env.example if .env exists
                const envPath = path.join(repoPath, '.env');
                try {
                    await fs.access(envPath);
                    const result = await generateEnvExample(envPath, {
                        force: options.force || false
                    });

                    if (result.success) {
                        console.log(`✅ Created ${result.examplePath} (${result.keysFound} keys)`);
                    } else {
                        console.log(`ℹ️  ${result.message}`);
                    }
                } catch {
                    console.log('ℹ️  No .env file found in repository root');
                }

                // Check if .gitignore needs update
                if (results.envFiles.committedFiles > 0) {
                    console.log('');
                    console.log('⚠️  Suggested .gitignore entry:');
                    console.log(generateGitignoreEntry());
                }

                console.log('');
            }

            // Save reports if requested
            if (options.json) {
                await saveReportJSON(report, options.json);
                console.log(`📄 JSON report saved to: ${options.json}`);
            }

            if (options.yaml) {
                await saveReportYAML(report, options.yaml);
                console.log(`📄 YAML report saved to: ${options.yaml}`);
            }

            if (options.output) {
                const ext = path.extname(options.output).toLowerCase();
                if (ext === '.json') {
                    await saveReportJSON(report, options.output);
                } else if (ext === '.yaml' || ext === '.yml') {
                    await saveReportYAML(report, options.output);
                } else {
                    console.error('❌ Unsupported output format. Use .json, .yaml, or .yml');
                    process.exit(1);
                }
                console.log(`📄 Report saved to: ${options.output}`);
            }

            // Display console report
            const consoleOutput = formatConsoleReport(report);
            console.log(consoleOutput);

            // Show timing
            const duration = ((Date.now() - startTime) / 1000).toFixed(2);
            console.log(`⏱️  Scan completed in ${duration}s`);
            console.log('');

            // CI mode: exit with error if high-risk findings
            if (options.ci) {
                const hasHighRiskSecrets = results.secrets.some(s => s.confidence === 'high');
                const hasCommittedEnv = results.envFiles.committedFiles > 0;

                if (hasHighRiskSecrets || hasCommittedEnv) {
                    console.error('❌ CI check failed: High-risk security issues detected');
                    process.exit(1);
                } else {
                    console.log('✅ CI check passed: No critical issues found');
                    process.exit(0);
                }
            }

        } catch (error) {
            console.error('');
            console.error('❌ Error:', error.message);
            console.error('');
            if (process.env.DEBUG) {
                console.error(error.stack);
            }
            process.exit(1);
        }
    });

// Parse and run
program.parse(process.argv);

// Show help if no arguments
if (process.argv.length === 2) {
    program.help();
}

