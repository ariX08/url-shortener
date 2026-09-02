# Shorten

Minimal, functional URL shortener.

Paste a long URL, get a short permanent link via the public CleanURI API. Recent links are kept in localStorage.

## Run locally

```bash
python3 -m http.server 8080
```

Open http://localhost:8080

Or open `index.html` directly in a browser.

## Notes

- No backend, no API keys.
- Rate limit of the upstream service is approximately 2 requests per second per IP.
- Free public shorteners always involve some trust: the service sees the URLs you submit.
