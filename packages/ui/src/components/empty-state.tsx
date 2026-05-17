import type { ReactNode } from "react";

import { Empty, EmptyContent, EmptyHeader, EmptyMedia, EmptyTitle } from "./ui/empty";

type EmptyStateProps = {
  description: ReactNode;
  icon: ReactNode;
  title: string;
};

export function EmptyState({ description, icon, title }: EmptyStateProps) {
  return (
    <Empty className="border-0 px-4 lg:px-0">
      <EmptyHeader>
        <EmptyMedia className="mb-2 text-4xl md:text-5xl animate-soft-pop">{icon}</EmptyMedia>
        <EmptyTitle className="text-lg">{title}</EmptyTitle>
      </EmptyHeader>
      <EmptyContent>{description}</EmptyContent>
    </Empty>
  );
}
