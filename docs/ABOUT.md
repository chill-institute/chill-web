# About chill.institute

[chill.institute](https://chill.institute) is an independently maintained
companion for searching releases, browsing movies and TV shows, and sending a
selection to a user's put.io account.

It also supports account settings, RSS shortcuts for compatible catalog feeds,
and a [Stremio add-on](https://chill.institute/stremio). The project is not
affiliated with the services it connects to.

## Privacy

- The browser stores an auth token for API requests.
- Product analytics runs in the API, using pseudonymous IDs and bounded fields.
  It excludes searches, media IDs, URLs, account IDs, IP addresses, user agents,
  and free-form errors.
- Configured crash reporting may include the route path, runtime, release, and
  stack. It excludes tokens, cookies, request bodies, user IDs, request URLs,
  and query strings.
- Without crash reporting, a crash report stays local until the user copies it.
- The Stremio add-on link is a private credential: anyone with it can play the
  user's put.io library and download to that account. Stremio saves installed
  add-ons, including the link, on the device and in the user's Stremio account
  when they are signed in. Error reports from chill.institute redact it.
  Signing out of chill.institute does not stop it; **disconnect Stremio** at
  [chill.institute/stremio](https://chill.institute/stremio) stops every link
  within a minute.

For help, read the [FAQ](./FAQ.md). Report sensitive problems through the
[private security route](../SECURITY.md).
