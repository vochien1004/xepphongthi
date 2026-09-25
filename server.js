import fs from 'fs';
import { execSync } from 'child_process';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.join(__dirname, 'dist');

// Ensure dist directory exists
if (!fs.existsSync(distPath) || !fs.existsSync(path.join(distPath, 'index.html'))) {
  console.log('Building app production assets...');
  try {
    execSync('npm run build', { stdio: 'inherit' });
  } catch (err) {
    console.error('Build failed:', err);
  }
}

const app = express();

// Determine listening port:
// In AI Studio Cloud Run, Nginx occupies port 8080 and proxies to port 3000 (DEFAULT_APP_PORT).
// Therefore, if PORT is 8080 or DEFAULT_APP_PORT is defined, the app must listen on port 3000.
const PORT = process.env.DEFAULT_APP_PORT 
  ? Number(process.env.DEFAULT_APP_PORT)
  : (process.env.PORT && process.env.PORT !== '8080' ? Number(process.env.PORT) : 3000);

// Health check endpoint for Cloud Run / load balancers
app.get('/healthz', (req, res) => {
  res.status(200).send('OK');
});

// Serve static assets from dist
app.use(express.static(distPath));

// SPA fallback for all routes
app.get('*', (req, res) => {
  const indexPath = path.join(distPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(200).send('App is starting up, please refresh in a moment.');
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Application server running on http://0.0.0.0:${PORT}`);
});
