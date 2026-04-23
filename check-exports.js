/**
 * Diagnostic script to check command exports
 * Run with: node check-exports.js
 */

const fs = require('fs');
const path = require('path');

const commandsDir = path.join(__dirname, 'commands');
const files = fs.readdirSync(commandsDir).filter(f => f.endsWith('.js'));

console.log(`\n📋 Checking ${files.length} command files for export issues...\n`);

const issues = [];
const goodExports = [];

files.forEach(file => {
    const filePath = path.join(commandsDir, file);
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        const lastLines = content.split('\n').slice(-20).join('\n');
        
        // Check export patterns
        if (lastLines.includes('module.exports = {') && lastLines.includes('execute:')) {
            issues.push({
                file,
                problem: 'OBJECT with execute property',
                fix: 'Change to: module.exports = commandFunction;'
            });
        } else if (lastLines.includes('module.exports = {') && !lastLines.includes('execute:')) {
            issues.push({
                file,
                problem: 'OBJECT export (not execute format)',
                fix: 'Check if exports should be function only'
            });
        } else if (lastLines.match(/module\.exports\s*=\s*(async\s+)?function/) || 
                   lastLines.match(/module\.exports\s*=\s*\w+Command\s*;/)) {
            goodExports.push(file);
        } else if (!lastLines.includes('module.exports')) {
            issues.push({
                file,
                problem: 'NO module.exports found',
                fix: 'Add: module.exports = commandFunction;'
            });
        }
    } catch (err) {
        console.error(`Error reading ${file}:`, err.message);
    }
});

if (issues.length > 0) {
    console.log('❌ ISSUES FOUND:\n');
    issues.forEach(issue => {
        console.log(`  File: ${issue.file}`);
        console.log(`  Problem: ${issue.problem}`);
        console.log(`  Fix: ${issue.fix}`);
        console.log('');
    });
} else {
    console.log('✅ All exports look good!');
}

console.log(`\n📊 Summary:`);
console.log(`  Total files: ${files.length}`);
console.log(`  Good exports: ${goodExports.length}`);
console.log(`  Issues found: ${issues.length}`);
