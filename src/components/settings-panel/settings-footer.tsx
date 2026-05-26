import { InstituteExternalLinks } from "@/ui/components/institute-footer";

const WEB_REPOSITORY_COMMIT_URL = "https://github.com/chill-institute/chill-web/commit";
const commitReleasePattern = /^[0-9a-f]{7,40}$/i;

function getReleaseCommitUrl(release: string) {
  return commitReleasePattern.test(release) ? `${WEB_REPOSITORY_COMMIT_URL}/${release}` : undefined;
}

function SettingsFooter() {
  const release = import.meta.env.VITE_PUBLIC_RELEASE ?? "dev";
  const releaseCommitUrl = getReleaseCommitUrl(release);

  return (
    <div className="flex flex-col items-center gap-3 text-center text-xs sm:flex-row sm:justify-between sm:gap-3 sm:text-left">
      <InstituteExternalLinks ariaLabel="contact" className="text-fg-3" />
      <span className="text-fg-3 shrink-0 text-center sm:text-left">
        release:{" "}
        {releaseCommitUrl ? (
          <a
            href={releaseCommitUrl}
            rel="noreferrer noopener"
            target="_blank"
            className="hover-hover:hover:text-fg-1 hover-hover:hover:underline font-normal underline-offset-2"
          >
            {release}
          </a>
        ) : (
          release
        )}
      </span>
    </div>
  );
}

export { getReleaseCommitUrl, SettingsFooter };
