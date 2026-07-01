import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate } from 'k6/metrics';

// ── Конфигурация ──────────────────────────────────────────────
// Подай BASE през CLI:  k6 run -e BASE=https://staging.твойсайт.pro loadtest.js
const BASE = __ENV.BASE || 'https://staging.example.pro';

const errorRate = new Rate('errors');

// ── Сценарии: пускай ЕДИН по избор (закоментирай останалите) ──
export const options = {
  // 1) LOAD TEST — реалистичен очакван трафик (за капацитет/кампания)
  stages: [
    { duration: '2m', target: 20 },   // плавно покачване до 20 VU
    { duration: '5m', target: 20 },   // задържане (steady state)
    { duration: '2m', target: 0 },    // плавно сваляне
  ],

  // 2) STRESS TEST — само срещу staging! Постепенно до счупване:
  // stages: [
  //   { duration: '2m', target: 50 },
  //   { duration: '2m', target: 100 },
  //   { duration: '2m', target: 200 },
  //   { duration: '2m', target: 400 },
  //   { duration: '2m', target: 0 },
  // ],

  // 3) SPIKE TEST — внезапен пик (Instagram кампания, viral пост):
  // stages: [
  //   { duration: '10s', target: 5 },
  //   { duration: '1m',  target: 300 },  // рязък скок
  //   { duration: '3m',  target: 300 },
  //   { duration: '1m',  target: 0 },
  // ],

  thresholds: {
    http_req_duration: ['p(95)<800', 'p(99)<2000'], // 95% < 800ms
    errors: ['rate<0.01'],                            // < 1% грешки
    http_req_failed: ['rate<0.02'],
  },

  // Уважавай хостинга — не пали хиляди заявки моментално
  // maxRedirects: 4,
};

// ── Реалистичен потребителски поток ──────────────────────────
export default function () {
  group('Начална страница', () => {
    const res = http.get(`${BASE}/`, {
      headers: { 'User-Agent': 'k6-loadtest (own-site testing)' },
    });
    check(res, {
      'status 200': (r) => r.status === 200,
      'зарежда < 1s': (r) => r.timings.duration < 1000,
    }) || errorRate.add(1);
  });

  sleep(Math.random() * 3 + 1); // think time 1–4s (имитира реален потребител)

  group('Страница на курс/продукт', () => {
    const res = http.get(`${BASE}/pro-pilates/`);
    check(res, { 'status 200': (r) => r.status === 200 }) || errorRate.add(1);
  });

  sleep(Math.random() * 3 + 2);

  // ВНИМАНИЕ: НЕ автоматизирай реални POST към LatePoint booking-а
  // срещу production — ще създаде боклук в базата. Само на staging.
  // group('Booking flow', () => { ... http.post ... });
}
