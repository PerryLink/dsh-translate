# Security

## Reporting

Open a private security advisory on this repository
(`Security` → `Advisories` → `Report a vulnerability`). Do not open a public
issue for a vulnerability.

## Scope

- The plugin never reads, stores or forwards model credentials; authentication
  stays with the host provider configuration.
- Only prose with protected spans masked leaves the browser, and only to the
  provider the user already configured.
- The host half writes no session event and no workspace file; the browser half
  writes only a bounded translation cache in `localStorage`.
- Placeholder verification is the trust boundary: a translation that loses,
  renumbers or invents a `⟦n⟧` token is discarded and the original text stays.

## Supported versions

The `0.3.x` line targets DeepSeek Harness `>=0.2.1-0 <0.3.0`.
