#!/usr/bin/env node
/**
 * Bağımlılıksız yük testi (Faz 12).
 * Node 20+ global fetch kullanır. Sabit eşzamanlı worker havuzu ile
 * belirtilen hedefe süre boyunca istek atar; gecikme yüzdelikleri + RPS raporlar.
 *
 * Kullanım:
 *   node scripts/load-test.mjs
 *   BASE_URL=http://localhost:3000 TARGET=/v1/health/ready CONCURRENCY=100 DURATION_MS=15000 node scripts/load-test.mjs
 *   TOKEN=<jwt> TARGET=/v1/feed?domain=social CONCURRENCY=200 node scripts/load-test.mjs
 *
 * Env:
 *   BASE_URL      Hedef sunucu (varsayılan http://localhost:3000)
 *   TARGET        İstek yolu (varsayılan /v1/health/ready)
 *   METHOD        HTTP metodu (varsayılan GET)
 *   TOKEN         Bearer token (opsiyonel, korumalı uçlar için)
 *   CONCURRENCY   Eşzamanlı worker sayısı (varsayılan 50)
 *   DURATION_MS   Test süresi ms (varsayılan 10000)
 *   WARMUP_MS     Ölçüme dahil edilmeyen ısınma süresi (varsayılan 1000)
 */

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';
const TARGET = process.env.TARGET ?? '/v1/health/ready';
const METHOD = (process.env.METHOD ?? 'GET').toUpperCase();
const TOKEN = process.env.TOKEN ?? '';
const CONCURRENCY = Number(process.env.CONCURRENCY ?? 50);
const DURATION_MS = Number(process.env.DURATION_MS ?? 10000);
const WARMUP_MS = Number(process.env.WARMUP_MS ?? 1000);

const url = BASE_URL.replace(/\/$/, '') + TARGET;
const headers = TOKEN ? { authorization: `Bearer ${TOKEN}` } : {};

/** @type {number[]} */
const latencies = [];
let ok = 0;
let failed = 0;
let measuring = false;
const statusCounts = new Map();

function record(status, ms, success) {
  if (!measuring) return;
  statusCounts.set(status, (statusCounts.get(status) ?? 0) + 1);
  if (success) {
    ok += 1;
    latencies.push(ms);
  } else {
    failed += 1;
  }
}

async function worker(deadline) {
  while (performance.now() < deadline) {
    const start = performance.now();
    try {
      const res = await fetch(url, { method: METHOD, headers });
      // gövdeyi tüket (bağlantı yeniden kullanımı için)
      await res.arrayBuffer();
      record(res.status, performance.now() - start, res.ok);
    } catch {
      record('ERR', performance.now() - start, false);
    }
  }
}

function percentile(sorted, p) {
  if (!sorted.length) return 0;
  const idx = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[idx];
}

async function main() {
  console.log(`> Yük testi: ${METHOD} ${url}`);
  console.log(`> Eşzamanlılık=${CONCURRENCY} Süre=${DURATION_MS}ms Isınma=${WARMUP_MS}ms`);

  // Bağlanabilirlik ön kontrolü.
  try {
    const probe = await fetch(url, { method: METHOD, headers });
    await probe.arrayBuffer();
    console.log(`> Ön kontrol durumu: ${probe.status}`);
  } catch (err) {
    console.error(`! Sunucuya ulaşılamadı: ${url}\n  ${String(err)}`);
    process.exit(1);
  }

  const startWall = performance.now();
  const deadline = startWall + WARMUP_MS + DURATION_MS;
  setTimeout(() => {
    measuring = true;
  }, WARMUP_MS);

  const workers = Array.from({ length: CONCURRENCY }, () => worker(deadline));
  await Promise.all(workers);

  const total = ok + failed;
  const sorted = latencies.slice().sort((a, b) => a - b);
  const seconds = DURATION_MS / 1000;
  const rps = (total / seconds).toFixed(1);

  console.log('\n=== Sonuçlar ===');
  console.log(`Toplam istek : ${total}`);
  console.log(`Başarılı     : ${ok}`);
  console.log(`Hatalı       : ${failed} (${total ? ((failed / total) * 100).toFixed(2) : '0'}%)`);
  console.log(`RPS          : ${rps}`);
  console.log('Gecikme (ms) :');
  console.log(`  p50 ${percentile(sorted, 50).toFixed(1)}  p90 ${percentile(sorted, 90).toFixed(1)}  p95 ${percentile(sorted, 95).toFixed(1)}  p99 ${percentile(sorted, 99).toFixed(1)}  max ${(sorted[sorted.length - 1] ?? 0).toFixed(1)}`);
  console.log('Durum dağılımı:');
  for (const [status, count] of [...statusCounts.entries()].sort()) {
    console.log(`  ${status}: ${count}`);
  }

  // Basit başarı eşiği: hata oranı < %1 ve p99 < 1000ms.
  const errorRate = total ? failed / total : 1;
  const p99 = percentile(sorted, 99);
  if (errorRate > 0.01 || p99 > 1000) {
    console.log(`\n! Eşik aşıldı (hata oranı ${(errorRate * 100).toFixed(2)}%, p99 ${p99.toFixed(0)}ms).`);
    process.exit(2);
  }
  console.log('\n✓ Eşikler içinde.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
