# k6 Load & Stress Testing

Automated load, stress, and spike testing for WordPress sites using k6 and GitHub Actions. Built to identify performance bottlenecks on shared hosting environments with Cloudflare, PHP-FPM, and OPcache.

## Repository Structure

```
.
├── .github/
│   └── workflows/
│       └── k6-loadtest.yml   # GitHub Actions CI workflow
└── tests/
    └── loadtest.js           # k6 test scenarios
```

## Test Scenarios

| Scenario | Description | When to Use |
|----------|-------------|-------------|
| `load`   | Gradual ramp to 20 VUs, 5 min steady state | Pre-campaign capacity check |
| `stress` | Stepped ramp to 400 VUs until failure | Bottleneck identification |
| `spike`  | Sudden burst to 300 VUs in 60s | Simulating viral/campaign traffic |

## Running Locally

**Requirements:** [k6](https://k6.io/docs/get-started/installation/)

```bash
# Load test
k6 run -e BASE=https://staging.example.com -e SCENARIO=load tests/loadtest.js

# Stress test (staging only - never against production)
k6 run -e BASE=https://staging.example.com -e SCENARIO=stress tests/loadtest.js

# Full HTTP debug output
k6 run -e BASE=https://staging.example.com --http-debug="full" tests/loadtest.js > debug.txt 2>&1
```

## GitHub Actions

### Manual Run

Actions -> **Load Test** -> Run workflow -> select target URL and scenario.

### Scheduled

Runs automatically every Sunday at 03:00 UTC against staging (load scenario).

### Reports

After each run: Actions -> select run -> **Artifacts** -> download `k6-report-NNN` -> open `report.html` in a browser.

The HTML report includes avg/p95/p99 response times, error rate, and PASS/FAIL status per threshold with color indicators.

## Thresholds

| Metric | Target |
|--------|--------|
| p(95) response time | < 800ms |
| p(99) response time | < 2000ms |
| Error rate | < 1% |
| Failed requests | < 2% |

## What We Learned

Running this against a real WordPress site on shared hosting revealed:

- **Primary bottleneck:** PHP-FPM worker exhaustion - the server stops accepting connections rather than slowing down, which shows as fast 403/502 responses at high VU counts rather than timeouts
- **OPcache misconfiguration:** Default 128MB allocation was fully consumed, causing continuous cache eviction and recompilation. Increasing `opcache.memory_consumption` to 256MB and `opcache.interned_strings_buffer` to 32MB brought the hit rate from ~33% to ~79%
- **Gzip compression** was disabled by default - enabling it reduced response payload size by ~60-80%
- **Cached vs uncached endpoints** behave completely differently under load - logged-in users and booking flows bypass page cache and hit MySQL directly

## Security Notes

- Block common load testing User-Agents in `.htaccess` (`k6`, `locust`, `artillery`)
- GitHub Actions runners egress from Azure IP ranges - whitelist in Cloudflare if testing staging behind WAF
- Enable Cloudflare Bot Fight Mode and rate limiting (>30 req/10s per IP) for production protection

[![Open Actions](https://img.shields.io/badge/Open-Actions-brightgreen?style=for-the-badge)](https://github.com/nKashev/k6-loadtest/actions)
