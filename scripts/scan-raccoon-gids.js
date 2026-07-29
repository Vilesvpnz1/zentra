const https = require('https');
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, 'raccoon-discovered.json');
const LAYOUT = path.join(__dirname, '..', 'Cine-Cloud-SRC-main', 'src', 'random', 'gamelayout.js');

function post(body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = https.request(
      {
        hostname: 'www.raccoongame.com',
        path: '/game/noticeBoard',
        method: 'POST',
        headers: {
          'User-Agent': 'Mozilla/5.0',
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data),
          Referer: 'https://www.raccoongame.com/wap/dist/',
          Origin: 'https://www.raccoongame.com',
        },
      },
      (res) => {
        let d = '';
        res.on('data', (c) => (d += c));
        res.on('end', () => {
          try {
            resolve(JSON.parse(d));
          } catch {
            resolve({ code: -1, raw: d.slice(0, 200) });
          }
        });
      }
    );
    req.on('error', reject);
    req.setTimeout(15000, () => {
      req.destroy();
      reject(new Error('timeout'));
    });
    req.write(data);
    req.end();
  });
}

function existingGids() {
  const src = fs.readFileSync(LAYOUT, 'utf8');
  const set = new Set();
  const re = /gid=(\d+)/g;
  let m;
  while ((m = re.exec(src))) set.add(Number(m[1]));
  return set;
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const have = existingGids();
  console.log('existing raccoon gids:', have.size);
  const max = Math.max(...have, 1200);
  const missing = [];
  for (let i = 1; i <= max; i++) {
    if (!have.has(i)) missing.push(i);
  }
  console.log('to scan:', missing.length, 'max:', max);

  const found = [];
  const failed = [];
  let i = 0;
  const concurrency = 8;

  async function worker(ids) {
    for (const gid of ids) {
      i++;
      try {
        const r = await post({ game_id: gid });
        if (r && r.code === 200 && r.data && r.data.game_name) {
          found.push({ gid, n: String(r.data.game_name).trim() });
          console.log('HIT', gid, r.data.game_name);
        } else if (r && r.code === 200) {
          found.push({ gid, n: 'Game ' + gid });
          console.log('HIT empty-name', gid);
        }
      } catch (e) {
        failed.push(gid);
        console.log('ERR', gid, e.message);
        await sleep(300);
      }
      if (i % 50 === 0) {
        console.log('progress', i + '/' + missing.length, 'found', found.length);
        fs.writeFileSync(OUT, JSON.stringify({ found, failed, scanned: i }, null, 2));
      }
      await sleep(40);
    }
  }

  const chunks = Array.from({ length: concurrency }, () => []);
  missing.forEach((gid, idx) => chunks[idx % concurrency].push(gid));
  await Promise.all(chunks.map(worker));

  fs.writeFileSync(OUT, JSON.stringify({ found, failed, scanned: i }, null, 2));
  console.log('done found', found.length, 'failed', failed.length);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
