import type { useDownloadFolderQuery } from "@/auth/queries/download-folder";
import type { useProfileQuery } from "@/auth/queries/profile";
import type { ChillSettings } from "@/lib/types";

export type PersistPatch = (patch: Partial<ChillSettings>) => void;
export type ProfileQuery = ReturnType<typeof useProfileQuery>;
export type DownloadFolderQuery = ReturnType<typeof useDownloadFolderQuery>;
export type IndexerOption = { id: string; label: string };
