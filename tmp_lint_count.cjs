
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

try {
    const output = execSync('npx eslint . --format json', { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 });
    const results = JSON.parse(output);
    const fileCounts = results.map(r => ({ file: r.filePath, count: r.errorCount }));
    console.log(JSON.stringify(fileCounts));
} catch (err) {
    // If exit code is 1, it might still have output
    if (err.stdout) {
        try {
            const results = JSON.parse(err.stdout);
            const fileCounts = results.map(r => ({ file: r.filePath, count: r.errorCount }));
            console.log(JSON.stringify(fileCounts));
        } catch (e) {
            console.error('Failed to parse stdout');
        }
    } else {
        console.error('No stdout');
    }
}
