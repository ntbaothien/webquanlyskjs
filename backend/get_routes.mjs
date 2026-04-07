import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const routesDir = path.join(__dirname, 'routes');
const files = fs.readdirSync(routesDir);
const results = [];

files.forEach(f => {
    if(f.endsWith('.js')) {
        const content = fs.readFileSync(path.join(routesDir, f), 'utf-8');
        const lines = content.split('\n');
        lines.forEach((line, i) => {
            if (line.match(/router\.(get|post|put|delete|patch)\(/)) {
                results.push(`${f}: ${line.trim()}`);
            }
        });
    }
});

fs.writeFileSync(path.join(__dirname, 'routes_list.txt'), results.join('\n'));
console.log('done');
