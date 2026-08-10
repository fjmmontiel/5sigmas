const baseUrl = (process.env.S5_PRODUCTION_URL || 'https://5sigmas.com').replace(/\/$/, '');
const expected = (process.env.S5_EXPECTED_BUILD_SHA || '').trim();
const attempts = Number(process.env.S5_BUILD_WAIT_ATTEMPTS || 72);
const delayMs = Number(process.env.S5_BUILD_WAIT_DELAY_MS || 5000);

if (!expected) throw new Error('S5_EXPECTED_BUILD_SHA is required.');

let last = 'no response';
for (let attempt = 1; attempt <= attempts; attempt += 1) {
  try {
    const response = await fetch(`${baseUrl}/build.json?sha=${encodeURIComponent(expected)}&attempt=${attempt}`, {
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache', 'User-Agent': '5sigmas-production-verifier/1.0' },
    });
    if (response.ok) {
      const payload = await response.json();
      last = JSON.stringify(payload);
      if (payload.sha === expected) {
        console.log(`Production serves exact build ${expected}.`);
        process.exit(0);
      }
    } else {
      last = `HTTP ${response.status}`;
    }
  } catch (error) {
    last = error?.message || String(error);
  }
  if (attempt < attempts) await new Promise((resolve) => setTimeout(resolve, delayMs));
}
throw new Error(`Production never exposed expected build ${expected}; last observation: ${last}`);
