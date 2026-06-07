#!/usr/bin/env bash
# Faz 0 smoke testi: API + DB + Redis uçtan uca doğrulama.
set -u
cd "$(dirname "$0")/.."

pkill -f "tsx watch src/index.ts" 2>/dev/null || true
sleep 1

npm run dev -w @unicampus/api > /tmp/unicampus-api.log 2>&1 &
APIPID=$!

# Sunucunun ayağa kalkmasını bekle
for i in $(seq 1 25); do
  if curl -s http://localhost:4000/v1/health >/dev/null 2>&1; then break; fi
  sleep 1
done

echo "=== HEALTH ==="
curl -s http://localhost:4000/v1/health; echo

ITU_ID=$(docker exec unicampus-postgres psql -U unicampus -d unicampus -tAc \
  "select university_id from university_domains where domain='itu.edu.tr'")
echo "=== ITU_ID: ${ITU_ID} ==="

echo "=== SEND-OTP (gecerli domain) ==="
curl -s -X POST http://localhost:4000/v1/auth/send-otp \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"ali@itu.edu.tr\",\"universityId\":\"${ITU_ID}\"}"; echo

echo "=== SEND-OTP (yanlis domain -> 422) ==="
curl -s -X POST http://localhost:4000/v1/auth/send-otp \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"ali@gmail.com\",\"universityId\":\"${ITU_ID}\"}"; echo

echo "=== FEED (oturumsuz -> 401) ==="
curl -s "http://localhost:4000/v1/feed?domain=social"; echo

echo "=== FEED (gecersiz domain -> 400) ==="
curl -s "http://localhost:4000/v1/feed?domain=mixed"; echo

echo "=== DEV OTP LOG ==="
grep "DEV OTP" /tmp/unicampus-api.log | tail -2 || true

kill "$APIPID" 2>/dev/null || true
echo "stopped"
