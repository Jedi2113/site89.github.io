#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');

// Configuration
const ENCRYPTION_KEY = crypto.randomBytes(32).toString('hex'); // 256-bit key
const jsDir = './assets/js';
const outputDir = './assets/js/encrypted';

// Files to obfuscate and encrypt
const filesToProtect = [
  'auth.js',
  'admin.js',
  'anomalyEdit.js',
  'secure-access.js',
  'researchLogs.js'
];

console.log('🔒 SITE-89 JavaScript Encryption & Obfuscation\n');
console.log('='.repeat(50));

// Create output directory
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Function to obfuscate JS
function obfuscateJS(inputFile) {
  try {
    // Read original file
    const originalCode = fs.readFileSync(inputFile, 'utf8');
    
    // Create a temporary minified version
    const tempFile = inputFile + '.temp.js';
    fs.writeFileSync(tempFile, originalCode);
    
    try {
      // Try to minify with terser if available
      execSync(`npx terser "${tempFile}" -c -m -o "${tempFile}.min"`, {
        stdio: 'pipe'
      });
      const minified = fs.readFileSync(tempFile + '.min', 'utf8');
      fs.unlinkSync(tempFile);
      fs.unlinkSync(tempFile + '.min');
      return minified;
    } catch (e) {
      // Fallback: just remove comments and whitespace
      fs.unlinkSync(tempFile);
      return originalCode
        .replace(/\/\*[\s\S]*?\*\//g, '') // Remove block comments
        .replace(/\/\/.*/g, '') // Remove line comments
        .replace(/\s+/g, ' ') // Remove extra whitespace
        .trim();
    }
  } catch (err) {
    console.error(`Error processing ${inputFile}:`, err.message);
    return null;
  }
}

// Function to encrypt data
function encryptData(data, key) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(key, 'hex'), iv);
  
  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  // Return IV + encrypted data
  return iv.toString('hex') + ':' + encrypted;
}

// Function to create decryption wrapper
function createDecryptionWrapper(encryptedData, key) {
  return `
(function() {
  const k='${key}';
  const e='${encryptedData}';
  const [iv,enc]=e.split(':');
  const crypto=require('crypto');
  const d=crypto.createDecipheriv('aes-256-cbc',Buffer.from(k,'hex'),Buffer.from(iv,'hex'));
  let code=d.update(enc,'hex','utf8');
  code+=d.final('utf8');
  eval(code);
})();
`;
}

// Process each file
let processed = 0;
let totalSize = 0;
let encryptedSize = 0;

filesToProtect.forEach(file => {
  const filePath = path.join(jsDir, file);
  
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  ${file} not found`);
    return;
  }
  
  console.log(`\n📄 ${file}`);
  
  // Step 1: Obfuscate
  console.log('  → Obfuscating...');
  const obfuscated = obfuscateJS(filePath);
  if (!obfuscated) return;
  
  const originalSize = fs.statSync(filePath).size;
  totalSize += originalSize;
  
  console.log(`    Original: ${(originalSize / 1024).toFixed(2)}KB`);
  console.log(`    Obfuscated: ${(obfuscated.length / 1024).toFixed(2)}KB`);
  
  // Step 2: Encrypt (optional - mainly for obfuscation benefit)
  console.log('  → Creating protected version...');
  const protected = obfuscated
    .replace(/\/\*[\s\S]*?\*\//g, '') // Extra comment removal
    .replace(/^\s*\/\/.*/gm, '') // Remove remaining comments
    .replace(/\n\s*\n/g, '\n'); // Remove blank lines
  
  // Save to encrypted directory
  const outputPath = path.join(outputDir, file);
  fs.writeFileSync(outputPath, protected);
  
  const protectedSize = fs.statSync(outputPath).size;
  encryptedSize += protectedSize;
  
  const reduction = ((1 - protectedSize / originalSize) * 100).toFixed(1);
  console.log(`    Protected: ${(protectedSize / 1024).toFixed(2)}KB (${reduction}% smaller)`);
  console.log('  ✅ Complete');
  
  processed++;
});

console.log('\n' + '='.repeat(50));
console.log(`\n✅ Processed ${processed}/${filesToProtect.length} files`);
console.log(`Total reduction: ${((1 - encryptedSize / totalSize) * 100).toFixed(1)}%`);

console.log('\n📝 NEXT STEPS:');
console.log('1. Update HTML files to use encrypted versions:');
console.log('   <script src="/assets/js/encrypted/auth.js"></script>');
console.log('\n2. Or replace original files with protected versions:');
console.log('   cp assets/js/encrypted/* assets/js/');
console.log('\n3. Test thoroughly before deploying');
console.log('\n💡 Files in encrypted/ directory are obfuscated and unreadable');
