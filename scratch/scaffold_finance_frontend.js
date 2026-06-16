const fs = require('fs');
const path = require('path');

const dirs = [
  'invoices',
  'settlements',
  'esic-pf',
  'deposits',
  'analytics',
  'audit'
];

dirs.forEach(dir => {
  const dirPath = path.join(__dirname, '..', 'src', 'app', 'finance', dir);
  fs.mkdirSync(dirPath, { recursive: true });
  const content = `import React from 'react';

export default function Finance${dir.replace(/-./g, x => x[1].toUpperCase()).replace(/^./, x => x.toUpperCase())}() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">${dir}</h1>
      <p className="text-muted-foreground">Module in development.</p>
    </div>
  );
}
`;
  fs.writeFileSync(path.join(dirPath, 'page.tsx'), content);
});
