export type ColumnId = "included" | "excluded";

export type SourceType = "cron" | "playground" | "manual";

export interface SimilarSource {
  title: string;
  link: string;
}

export type ModificationType = "dragged" | "source_included" | "source_excluded" | "unlinked" | "created";

export interface ArticleModification {
  type: ModificationType;
  by: string;
  timestamp: Date;
  details?: {
    fromColumn?: ColumnId;
    toColumn?: ColumnId;
    sourceName?: string;
  };
}

export interface Article {
  id: string;
  title: string;
  description: string;
  link: string;
  sourceType: SourceType;
  sourceTimestamp: Date;
  additionalSources: string[]; // e.g., ["cron", "playground"]
  similarSources: SimilarSource[]; // Related articles/links
  similarSourceStates?: Record<number, "included" | "excluded">; // Track include/exclude state per source
  lastModification: ArticleModification | null;
  columnId: ColumnId;
}

export interface ColumnHistory {
  articleId: string;
  articleTitle: string;
  movedBy: string;
  movedAt: Date;
  fromColumn: string;
}

export type HistoryAction = "created" | "moved" | "deleted" | "edited";

export interface GlobalHistory {
  id: string;
  personName: string;
  timestamp: Date;
  changes: {
    articleId: string;
    articleTitle: string;
    action: HistoryAction;
    fromColumn: string;
    toColumn: string;
  }[];
}

export interface ColumnMetadata {
  lastCronRun: Date | null;
  lastHumanCheck: {
    date: Date;
    personName: string;
  } | null;
}

export interface Column {
  id: ColumnId;
  title: string;
}

export const COLUMNS: Column[] = [
  { id: "included", title: "Articles Included" },
  { id: "excluded", title: "Articles Excluded" },
];

export const SOURCE_LABELS: Record<SourceType, string> = {
  cron: "Cron",
  playground: "Playground",
  manual: "Manually Added",
};

export const SOURCE_COLORS: Record<SourceType, string> = {
  cron: "bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-300 border border-sky-200 dark:border-sky-800",
  playground: "bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-300 border border-violet-200 dark:border-violet-800",
  manual: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300 border border-amber-200 dark:border-amber-800",
};

export const COLUMN_LABELS: Record<ColumnId, string> = {
  included: "Articles Included",
  excluded: "Articles Excluded",
};

export const COLUMN_COLORS: Record<ColumnId, { bg: string; border: string; header: string; badge: string }> = {
  included: {
    bg: "bg-emerald-50/50 dark:bg-emerald-950/30",
    border: "border-emerald-200 dark:border-emerald-800",
    header: "bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300",
    badge: "bg-emerald-200 text-emerald-700 dark:bg-emerald-800 dark:text-emerald-300",
  },
  excluded: {
    bg: "bg-rose-50/50 dark:bg-rose-950/30",
    border: "border-rose-200 dark:border-rose-800",
    header: "bg-rose-100 dark:bg-rose-900/50 text-rose-700 dark:text-rose-300",
    badge: "bg-rose-200 text-rose-700 dark:bg-rose-800 dark:text-rose-300",
  },
};
