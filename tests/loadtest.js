import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate } from 'k6/metrics';

// Configuration 
// Enter BASE via the CLI:  k6 run -e BASE=$website loadtest.js
const BASE = __ENV.BASE || 'https://staging.reformeracademy.pro/';

const errorRate = new Rate('errors');

// Scenarios: Select ONE (comment out the rest)
export const options = {
  // 1) LOAD TEST - realistic expected traffic (by capacity/campaign)
  // stages: [
  //   { duration: '2m', target: 20 },   // плавно покачване до 20 VU
  //   { duration: '5m', target: 20 },   // задържане (steady state)
  //   { duration: '2m', target: 0 },    // плавно сваляне
  // ],

  // 2) STRESS TEST - only against staging! Gradually until it breaks:
  stages: [
    { duration: '2m', target: 50 },
    { duration: '2m', target: 70 },
    { duration: '2m', target: 100 },
    { duration: '2m', target: 120 },
    { duration: '2m', target: 0 },
  ],

  // 3) SPIKE TEST - sudden spike (Instagram campaign, viral post):
  // stages: [
  //   { duration: '10s', target: 5 },
  //   { duration: '1m',  target: 100 },  // sharp increase
  //   { duration: '3m',  target: 200 },
  //   { duration: '1m',  target: 0 },
  // ],

  thresholds: {
    http_req_duration: ['p(95)<800', 'p(99)<2000'], // 95% < 800ms
    errors: ['rate<0.01'],                            // < 1% errors
    http_req_failed: ['rate<0.02'],
  },

  // Be considerate of your hosting provider - don't flood the server with thousands of requests all at once
  // maxRedirects: 4,
};

// Realistic User Flow
export default function () {
  group('Home Page', () => {
    const res = http.get(`${BASE}/`, {
      headers: { 'User-Agent': 'k6-loadtest (own-site testing)' },
    });
    check(res, {
      'status 200': (r) => r.status === 200,
      'зарежда < 1s': (r) => r.timings.duration < 1000,
    }) || errorRate.add(1);
  });

  sleep(Math.random() * 3 + 1); // think time 1–4s (imitates a real user)

  group('Course/Product Page/Blog', () => {
    const res = http.get(`${BASE}/blog/`);
    check(res, { 'status 200': (r) => r.status === 200 }) || errorRate.add(1);
  });

  sleep(Math.random() * 3 + 2);

  // WARNING: DO NOT automate actual POST requests to the LatePoint booking system
  // vs. production - will create junk in the database. Only on staging.
  // group('Booking flow', () => { ... http.post ... });
}
