import { Skeleton } from "@/ui/components/ui/skeleton";
import { useImageLoadedState } from "@/ui/hooks/use-image-loaded-state";
import { cn } from "@/ui/lib/cn";

export function DetailBackdropImage({ url }: { url?: string }) {
  const img = useImageLoadedState();
  if (!url) return <div className="absolute inset-0 bg-app" />;
  return (
    <>
      <Skeleton
        className={cn(
          "absolute inset-0 h-full w-full rounded-none transition-opacity duration-base ease-out",
          img.loaded ? "opacity-0" : "opacity-100",
        )}
      />
      <img
        ref={img.ref}
        src={url}
        alt=""
        aria-hidden="true"
        onLoad={img.onLoad}
        onError={img.onError}
        className={cn(
          "absolute inset-0 h-full w-full object-cover object-center transition-opacity duration-slow ease-out",
          img.loaded ? "opacity-100" : "opacity-0",
        )}
      />
    </>
  );
}

export function DetailPosterImage({ url, alt }: { url: string; alt: string }) {
  const img = useImageLoadedState();
  return (
    <div className="relative aspect-[2/3] w-[92px] shrink-0 sm:w-[110px]">
      <Skeleton
        className={cn(
          "absolute inset-0 h-full w-full rounded transition-opacity duration-base ease-out",
          img.loaded ? "opacity-0" : "opacity-100",
        )}
      />
      <img
        ref={img.ref}
        src={url}
        alt={alt}
        onLoad={img.onLoad}
        onError={img.onError}
        className={cn(
          "border-border-strong absolute inset-0 h-full w-full rounded border object-cover shadow-poster transition-opacity duration-slow ease-out",
          img.loaded ? "opacity-100" : "opacity-0",
        )}
      />
    </div>
  );
}
