const fs = require('fs');
const path = require('path');

const files = [
  'frontend/src/pages/CustomerDetail.tsx',
  'frontend/src/components/ContractModal.tsx',
  'frontend/src/pages/Dashboard.tsx',
  'frontend/src/pages/Forecast.tsx',
];

files.forEach(filePath => {
  try {
    const fullPath = path.join(__dirname, filePath);
    let content = fs.readFileSync(fullPath, 'utf8');

    // Replace €{...toFixed(2)} with {formatCurrency(...)}
    content = content.replace(/€\{([^}]*?)\.toFixed\(2\)\}/g, '{formatCurrency($1)}');

    // Replace toLocaleDateString('de-DE') with formatDate(...)
    content = content.replace(/new Date\(([^)]*?)\)\.toLocaleDateString\('de-DE'\)/g, 'formatDate($1)');
    content = content.replace(/\.toLocaleDateString\('de-DE'\)/g, ' with formatDate will be applied');

    fs.writeFileSync(fullPath, content, 'utf8');
    console.log(`✓ Updated ${filePath}`);
  } catch (err) {
    console.error(`✗ Error with ${filePath}:`, err.message);
  }
});

console.log('\nDone! Remember to add formatCurrency and formatDate imports.');
