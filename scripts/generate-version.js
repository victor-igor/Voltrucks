import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const version = Date.now().toString();

const versionData = {
    version: version
};

const rootDir = path.join(__dirname, '..');
const publicDir = path.join(__dirname, '../public');
const versionFilePath = path.join(publicDir, 'version.json');
const srcVersionFilePath = path.join(rootDir, 'version.ts'); // Output to root

// Ensure public dir exists
if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
}

fs.writeFileSync(versionFilePath, JSON.stringify(versionData, null, 2));
fs.writeFileSync(srcVersionFilePath, `export const version = '${version}';\n`);

console.log(`Version ${version} generated at:`);
console.log(` - ${versionFilePath}`);
console.log(` - ${srcVersionFilePath}`);
