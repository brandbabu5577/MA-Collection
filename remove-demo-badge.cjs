const fs = require('fs');
const crypto = require('crypto');

const p = 'index.html';
const b = 'index.html.before-demo-badge-removal.bak';

if (!fs.existsSync(b)) throw Error('Backup missing; stopped.');

const hash = f => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
if (hash(p) !== hash(b)) throw Error('Backup mismatch; stopped.');

let s = fs.readFileSync(p, 'utf8');
const re = /<span class="badge warn" title="Sample records only[^"]*">Demo data<\/span>/g;
const matches = [...s.matchAll(re)].length;

if (matches !== 1) throw Error('Expected one badge; found ' + matches);

fs.writeFileSync(p, s.replace(re, ''), 'utf8');
console.log('Demo badge removed successfully.');