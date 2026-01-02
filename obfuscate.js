const fs = require('fs');
const path = require('path');

// Simple obfuscation by minifying and mangling variable names
// Requires: npm install -g terser

const { execSync } = require('child_process');

const jsDir = 'assets/js';
const files = fs.readdirSync(jsDir).filter(f => f.endsWith('.js') && !f.includes('.min.'));

console.log('🔒 Starting JS obfuscation...\n');

let count = 0;

files.forEach(file => {
  const filePath = path.join(jsDir, file);
  const outputPath = path.join(jsDir, file.replace('.js', '.min.js'));
  
  try {
    console.log(`Processing: ${file}`);
    
    // Use terser to minify and mangle variable names
    execSync(`npx terser "${filePath}" -c -m -o "${outputPath}" --compress --mangle`, {
      stdio: 'pipe'
    });
    
    const original = fs.statSync(filePath).size;
    const minified = fs.statSync(outputPath).size;
    const reduction = ((1 - minified / original) * 100).toFixed(1);
    
    console.log(`  ✓ Created ${file.replace('.js', '.min.js')} (${reduction}% smaller)\n`);
    count++;
  } catch (err) {
    console.log(`  ✗ Error: ${err.message}\n`);
  }
});

console.log(`\n✅ Obfuscated ${count} files`);
console.log('\nNow update your HTML files to use the .min.js versions:');
console.log('Example: <script src="/assets/js/auth.min.js"></script>');
