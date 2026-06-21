const fs = require('fs');
let content = fs.readFileSync('src/components/GoogleDriveTab.tsx', 'utf8');

// Replace everything that needs corporas in searches
content = content.replace(/&supportsAllDrives=true&includeItemsFromAllDrives=true/g, '&corpora=allDrives&supportsAllDrives=true&includeItemsFromAllDrives=true');

// If there are any duplicate corporas from a partial previous run, remove them
content = content.replace(/&corpora=allDrives&corpora=allDrives/g, '&corpora=allDrives');

fs.writeFileSync('src/components/GoogleDriveTab.tsx', content);
console.log('Fixed ALL queries!');
