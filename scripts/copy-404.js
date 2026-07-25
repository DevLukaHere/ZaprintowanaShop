const fs = require('fs');
const path = require('path');

// GitHub Pages has no server-side rewrite for SPA routes, so a direct hit on
// e.g. /checkout or /admin 404s. Serving a copy of index.html as 404.html
// lets the Angular router take over and resolve the route client-side.
const browserDir = path.join(__dirname, '..', 'dist', 'ZaprintowanaShop', 'browser');
const indexPath = path.join(browserDir, 'index.html');
const notFoundPath = path.join(browserDir, '404.html');

fs.copyFileSync(indexPath, notFoundPath);
console.log('[copy-404] dist/ZaprintowanaShop/browser/404.html utworzony z index.html');
