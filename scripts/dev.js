const { spawn } = require('child_process');
const http = require('http');

console.log('[Dev] Starting Vite dev server...');
const vite = spawn('npx.cmd', ['vite'], {
  stdio: 'inherit',
  shell: true
});

function waitForVite(callback) {
  const check = () => {
    http.get('http://localhost:5173', (res) => {
      console.log('[Dev] Vite is ready! Launching Electron...');
      callback();
    }).on('error', () => {
      setTimeout(check, 500);
    });
  };
  check();
}

waitForVite(() => {
  const electron = spawn('npx.cmd', ['electron', '.', '--dev'], {
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, NODE_ENV: 'development', VITE_DEV_SERVER_URL: 'http://localhost:5173' }
  });

  electron.on('close', (code) => {
    console.log(`[Dev] Electron closed with code ${code}. Stopping Vite...`);
    vite.kill();
    process.exit(code || 0);
  });
});

process.on('SIGINT', () => {
  vite.kill();
  process.exit(0);
});
