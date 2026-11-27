// Writes test and coverage numbers into the GitHub job summary so every CI run
// is its own evidence record (docs/evidence/README.md).
import { appendFileSync, existsSync, readFileSync } from 'node:fs';

const dir = 'packages/domain/coverage';
const lines = ['### Test evidence: packages/domain', ''];

const resultsPath = `${dir}/test-results.json`;
if (existsSync(resultsPath)) {
  const r = JSON.parse(readFileSync(resultsPath, 'utf8'));
  lines.push(
    `- Test suites: ${r.numPassedTestSuites} passed of ${r.numTotalTestSuites}`,
    `- Tests: ${r.numPassedTests} passed, ${r.numFailedTests} failed, ${r.numTotalTests} total`,
  );
} else {
  lines.push('- No test results file was produced.');
}

const coveragePath = `${dir}/coverage-summary.json`;
if (existsSync(coveragePath)) {
  const total = JSON.parse(readFileSync(coveragePath, 'utf8')).total;
  for (const key of ['statements', 'branches', 'functions', 'lines']) {
    const m = total[key];
    lines.push(`- Coverage, ${key}: ${m.pct}% (${m.covered}/${m.total})`);
  }
} else {
  lines.push('- No coverage summary was produced.');
}

const out = `${lines.join('\n')}\n`;
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, out);
else process.stdout.write(out);
