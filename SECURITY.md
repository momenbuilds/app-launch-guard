# Security

## Reporting vulnerabilities

Please report security issues privately to the maintainers rather than opening a public issue. If a public security contact has not been configured yet, open a minimal issue asking for a private contact path without including exploit details.

## Secret handling

AppLaunchGuard scans for common exposed secrets and masks matched values in reports. Masking is best-effort and does not guarantee every secret pattern will be detected.

Do not paste private repositories, real API keys, provisioning profiles, certificates, or private App Store metadata into GitHub issues.

## Privacy

AppLaunchGuard has no telemetry by default. It does not send project contents to external services. The scanner runs locally and does not require analytics, authentication, a database, or external network calls.
