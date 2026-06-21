const fs = require('fs');

let content = fs.readFileSync('src/components/ProductionSheetsTab.tsx', 'utf8');

content = content.replace(/q\.actual\.toString\(\)/g, "(q.actual || 0).toString()");
content = content.replace(/cr\.row\.quantity\.toString\(\)/g, "(cr.row.quantity || 0).toString()");

fs.writeFileSync('src/components/ProductionSheetsTab.tsx', content);
