const fs = require('fs');
let c = fs.readFileSync('src/components/GoogleDriveTab.tsx', 'utf8');
c = c.replace(/pageSize=100&supportsAllDrives=true/g, 'pageSize=100&corpora=allDrives&supportsAllDrives=true');
c = c.replace(/pageSize=500&supportsAllDrives=true/g, 'pageSize=500&corpora=allDrives&supportsAllDrives=true');
c = c.replace(/pageSize=50&supportsAllDrives=true/g, 'pageSize=50&corpora=allDrives&supportsAllDrives=true');
fs.writeFileSync('src/components/GoogleDriveTab.tsx', c);
