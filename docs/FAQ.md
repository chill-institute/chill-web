# Frequently Asked Questions

## How can I contribute?

Start with the [contributing guide](../CONTRIBUTING.md). Sharing reproducible
bug reports is useful too.

## Which browsers are supported?

Current evergreen browsers on desktop and mobile. Include the browser version,
device, and release when reporting a compatibility problem.

## How should I report a bug?

Use the
[bug report form](https://github.com/chill-institute/chill-web/issues/new?template=bug_report.yml)
and include what you did, what you expected, and what happened.

For search problems, include the title, season or episode, filters, and sorting.
For crashes, include the displayed Sentry event ID or copied local crash report.

## Is chill.institute affiliated with put.io?

No. chill.institute is independently maintained. Contact this project for app
problems and put.io for problems with its own service.

## Why is a put.io account required?

The app searches and browses content before handing the selected transfer to
put.io. It is not a standalone torrent client or self-hosted search stack.

## Does chill.institute work in Stremio?

Yes. Open [chill.institute/stremio](https://chill.institute/stremio), get an
add-on link and select **install chill**. In Stremio you can browse movies and
shows, download a release to put.io, play it when it's ready, and play videos
from your put.io library.

It is tested in Stremio Web and Stremio for Linux. Other Stremio apps, including
Android TV, macOS and Windows, are unverified.

## How do I stop the Stremio add-on?

Select **disconnect Stremio** at
[chill.institute/stremio](https://chill.institute/stremio), then remove chill
from Stremio. Every add-on link stops working within a minute. Signing out of
chill.institute does not stop add-on links; removing chill.institute's access in
put.io does.

## Why is a transfer slow or failing?

The app can select and submit a transfer but does not control transfer health.
Try another release or indexer first; report the problem when failures are
consistent across results.

## How are settings stored?

Account settings use put.io's configuration storage. A small set of interface
preferences is cached in the browser.
