## GitHub Copilot Chat

- Extension: 0.48.2026050508 (prod)
- VS Code: 1.120.0-insider (0aed0a9b6adcf8898b54afc1b9c28e3ac4e9c2d3)
- OS: win32 10.0.26200 x64
- GitHub Account: joaouli123

## Network

User Settings:
```json
  "http.systemCertificatesNode": true,
  "github.copilot.advanced.debug.useElectronFetcher": true,
  "github.copilot.advanced.debug.useNodeFetcher": false,
  "github.copilot.advanced.debug.useNodeFetchFetcher": true
```

Connecting to https://api.github.com:
- DNS ipv4 Lookup: 4.228.31.149 (2 ms)
- DNS ipv6 Lookup: Error (2 ms): getaddrinfo ENOTFOUND api.github.com
- Proxy URL: None (1 ms)
- Electron fetch (configured): timed out after 10 seconds
- Node.js https: timed out after 10 seconds
- Node.js fetch: timed out after 10 seconds

Connecting to https://api.githubcopilot.com/_ping:
- DNS ipv4 Lookup: 140.82.113.21 (10 ms)
- DNS ipv6 Lookup: Error (3 ms): getaddrinfo ENOTFOUND api.githubcopilot.com
- Proxy URL: None (27 ms)
- Electron fetch (configured): HTTP 200 (138 ms)
- Node.js https: HTTP 200 (401 ms)
- Node.js fetch: HTTP 200 (413 ms)

Connecting to https://copilot-proxy.githubusercontent.com/_ping:
- DNS ipv4 Lookup: 4.228.31.153 (9 ms)
- DNS ipv6 Lookup: Error (11 ms): getaddrinfo ENOTFOUND copilot-proxy.githubusercontent.com
- Proxy URL: None (2 ms)
- Electron fetch (configured): HTTP 200 (84 ms)
- Node.js https: HTTP 200 (71 ms)
- Node.js fetch: HTTP 200 (67 ms)

Connecting to https://mobile.events.data.microsoft.com: HTTP 404 (151 ms)
Connecting to https://dc.services.visualstudio.com: HTTP 404 (672 ms)
Connecting to https://copilot-telemetry.githubusercontent.com/_ping: HTTP 200 (415 ms)
Connecting to https://copilot-telemetry.githubusercontent.com/_ping: HTTP 200 (429 ms)
Connecting to https://default.exp-tas.com: HTTP 400 (88 ms)

Number of system certificates: 99

## Documentation

In corporate networks: [Troubleshooting firewall settings for GitHub Copilot](https://docs.github.com/en/copilot/troubleshooting-github-copilot/troubleshooting-firewall-settings-for-github-copilot).