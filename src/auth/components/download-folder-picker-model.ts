const ROOT_FOLDER_ID = 0n;

type FolderCrumb = {
  id: bigint;
  name: string;
};

const ROOT_CRUMB: FolderCrumb = { id: ROOT_FOLDER_ID, name: "Your Files" };

function initialFolderPath(folder: FolderCrumb | null): FolderCrumb[] {
  if (!folder || isRootFolder(folder)) {
    return [ROOT_CRUMB];
  }
  return [ROOT_CRUMB, folder];
}

function isRootFolder(folder: FolderCrumb): boolean {
  if (folder.id !== ROOT_FOLDER_ID) return false;
  const name = folder.name.trim().toLowerCase();
  return name === "" || name === "my files" || name === "your files";
}

export { ROOT_CRUMB, ROOT_FOLDER_ID, initialFolderPath };
export type { FolderCrumb };
