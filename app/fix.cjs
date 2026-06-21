const fs = require('fs');
let c = fs.readFileSync('src/components/GoogleDriveTab.tsx', 'utf8');
c = c.replace(/corpora=allDrives&/g, '');
fs.writeFileSync('src/components/GoogleDriveTab.tsx', c);
