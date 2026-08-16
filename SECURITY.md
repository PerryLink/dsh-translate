# Security policy

## Reporting a vulnerability

Please **do not** open a public issue for security vulnerabilities.

Report privately through GitHub's private vulnerability reporting:

**https://github.com/PerryLink/dsh-translate/security/advisories/new**

That flow keeps the report confidential while we triage, and it is the channel we watch first.

## Before you report

- **Redact sensitive data** from any JSON payloads, logs, or session excerpts you attach: tokens, API keys, secrets, Authorization/request headers, personal paths, and account identifiers. Trimmed, schema-annotated examples are usually enough.
- Include, when possible: the plugin version, the harness (`dsh`) version, Node and OS versions, and the minimal steps to reproduce.

## What to expect

- **Acknowledgment**: within 5 business days.
- **Triage**: within 10 business days we confirm the issue and assess severity, or ask for more details.
- **Fix**: security fixes are prepared in a private fork, released as a patch version, and announced in the release notes.

## Disclosure and credit

- We follow coordinated disclosure: a public advisory (and CVE request where appropriate) is published once a fix ships.
- Reporters are credited in the advisory unless they ask to remain anonymous. There is no bug bounty program at this time.

## Scope

This plugin translates LLM parameters between vendors and repairs broken JSON in tool results — it makes no network requests, stores no credentials, and never calls a model. Its repair guarantees:

- Repair is deterministic text surgery: escape repair, trailing-comma removal, truncation closure, and `null` placeholders for missing required fields — no value is ever invented, and a result that still violates the schema fails closed.
- Session-log audit events carry only tool name, call id, strategy names, and counts — never repaired payloads.
- Hostile schemas are bounded: unsupported keywords are rejected, circular schemas fail, and oneOf validation is capped by depth and a branch budget so an exponential schema cannot exhaust the process.

Vulnerabilities in the harness itself should be reported to the official harness maintainers instead.
