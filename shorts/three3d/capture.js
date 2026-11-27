// usage: node capture.js <out.mp4|preview.png> <narration.wav> [--preview t1,t2,...]
const { chromium } = require('playwright'); const { spawn } = require('child_process'); const http = require('http');
const fs = require('fs'), path = require('path');
const root = __dirname, [out, wav, flag, times] = process.argv.slice(2);
const types = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json' };
const srv = http.createServer((q, r) => { const f = path.join(root, decodeURIComponent(q.url.split('?')[0])); fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'application/octet-stream' }); r.end(d); }); }).listen(8765);
(async () => {
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  p.on('pageerror', e => console.error('PAGE ERROR', e.message)); p.on('console', m => m.type() === 'error' && console.error('console', m.text()));
  await p.goto('http://localhost:8765/scene.html'); await p.waitForFunction('window.ready === true', null, { timeout: 120000 });
  const data = JSON.parse(fs.readFileSync(path.join(root, 'data.json')));
  if (flag === '--preview') {
    const ts = times.split(',').map(Number); let i = 0;
    for (const t of ts) { await p.evaluate(t => window.renderAt(t), t); await p.screenshot({ path: `${out}_${i++}.jpg`, type: 'jpeg', quality: 80 }); }
  } else {
    const fps = 30, n = Math.floor(data.total * fps);
    const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-', '-i', wav,
      '-c:v', 'libx264', '-preset', 'medium', '-crf', '19', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', out], { stdio: ['pipe', 'inherit', 'inherit'] });
    const t0 = Date.now();
    for (let i = 0; i < n; i++) {
      await p.evaluate(t => window.renderAt(t), i / fps);
      const buf = await p.screenshot({ type: 'jpeg', quality: 92 });
      if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
      if (i % 150 === 0) console.log(`frame ${i}/${n} ${((Date.now() - t0) / 1000).toFixed(0)}s`);
    }
    ff.stdin.end(); await new Promise(r => ff.on('close', r));
  }
  await b.close(); srv.close(); console.log('done');
})();
