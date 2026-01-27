"use client";

import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  GripVertical,
  ExternalLink,
  ChevronRight,
  Check,
  X,
  Unlink2,
} from "lucide-react";
import { Article, SOURCE_LABELS, SourceType, ColumnId, COLUMN_LABELS, ModificationType } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface KanbanCardProps {
  article: Article;
  onEdit: (article: Article) => void;
  onDelete: (id: string) => void;
  onUnlinkSource?: (articleId: string, sourceIndex: number, source: { title: string; link: string }) => void;
  onUpdateSourceState?: (articleId: string, sourceIndex: number, sourceName: string, state: "included" | "excluded") => void;
}

function getModificationDescription(article: Article): string {
  const mod = article.lastModification;
  if (!mod) return "";

  const columnLabel = (col: ColumnId | string | undefined) => {
    if (!col) return "";
    return COLUMN_LABELS[col as ColumnId] || col;
  };

  switch (mod.type) {
    case "dragged":
      return `Dragged from ${columnLabel(mod.details?.fromColumn)} to ${columnLabel(mod.details?.toColumn)} by ${mod.by}`;
    case "source_included":
      return `Source "${mod.details?.sourceName}" included by ${mod.by}`;
    case "source_excluded":
      return `Source "${mod.details?.sourceName}" excluded by ${mod.by}`;
    case "unlinked":
      return `Unlinked from "${mod.details?.sourceName}" by ${mod.by}`;
    case "created":
      return `Created by ${mod.by}`;
    default:
      return `Modified by ${mod.by}`;
  }
}

function formatDate(date: Date | null | undefined): string {
  if (!date) return "";
  const d = new Date(date);
  return d.toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(date: Date | null | undefined): string {
  if (!date) return "";
  const d = new Date(date);
  return d.toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }) + " at " + d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function isNewArticle(date: Date | null | undefined): boolean {
  if (!date) return false;
  const d = new Date(date);
  const now = new Date();
  const hoursDiff = (now.getTime() - d.getTime()) / (1000 * 60 * 60);
  return hoursDiff <= 24;
}

const SOURCE_DOT_COLORS: Record<SourceType, string> = {
  cron: "bg-orange-500",
  playground: "bg-violet-500",
  manual: "bg-amber-500",
};

const SOURCE_BADGE_COLORS: Record<SourceType, string> = {
  cron: "bg-orange-50 text-orange-600 border-orange-200 dark:bg-orange-950/50 dark:text-orange-400 dark:border-orange-800",
  playground: "bg-violet-50 text-violet-600 border-violet-200 dark:bg-violet-950/50 dark:text-violet-400 dark:border-violet-800",
  manual: "bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-950/50 dark:text-amber-400 dark:border-amber-800",
};

const CARD_ACCENT_COLORS: Record<ColumnId, string> = {
  included: "border-l-emerald-500 dark:border-l-emerald-400",
  excluded: "border-l-rose-500 dark:border-l-rose-400",
};

export function KanbanCard({ article, onEdit, onDelete, onUnlinkSource, onUpdateSourceState }: KanbanCardProps) {
  const [isSimilarOpen, setIsSimilarOpen] = useState(false);

  // Initialize from article's stored state or default to "included"
  const [sourceStates, setSourceStates] = useState<Record<number, "included" | "excluded">>(() => {
    if (article.similarSourceStates) {
      return article.similarSourceStates;
    }
    return Object.fromEntries((article.similarSources || []).map((_, i) => [i, "included"]));
  });

  const toggleSourceState = (index: number, state: "included" | "excluded", sourceName: string) => {
    setSourceStates((prev) => ({ ...prev, [index]: state }));
    // Update in store to track the modification
    onUpdateSourceState?.(article.id, index, sourceName, state);
  };

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: article.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const hasModification = article.lastModification !== null;
  const modificationDate = article.lastModification?.timestamp || article.sourceTimestamp;

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={cn(
        "transition-all duration-200 group border-l-4 bg-card",
        CARD_ACCENT_COLORS[article.columnId],
        "hover:shadow-md hover:-translate-y-0.5",
        isDragging && "opacity-50 shadow-2xl scale-105 rotate-2 ring-2 ring-primary z-50"
      )}
    >
      <div className="p-3">
        {/* Top Row: Drag handle, Source badge, Actions */}
        <div className="flex items-center gap-2 mb-4">
          <button
            {...attributes}
            {...listeners}
            className="text-muted-foreground/50 hover:text-muted-foreground flex-shrink-0 cursor-grab active:cursor-grabbing"
          >
            <GripVertical className="h-4 w-4" />
          </button>

          {/* Source Badge */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className={cn(
                    "flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border cursor-default",
                    SOURCE_BADGE_COLORS[article.sourceType]
                  )}
                >
                  <span className={cn("h-1.5 w-1.5 rounded-full", SOURCE_DOT_COLORS[article.sourceType])} />
                  {SOURCE_LABELS[article.sourceType]}
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Created {formatDateTime(article.sourceTimestamp)}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* New Badge - shows for articles created in the last 24 hours */}
          {isNewArticle(article.sourceTimestamp) && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-500 text-white">
              New
            </span>
          )}

          <div className="flex-1" />

          {/* External Link */}
          {article.link && (
            <a
              href={article.link}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          )}
        </div>

        {/* Title */}
        <h3 className={cn(
          "font-semibold text-sm leading-snug line-clamp-2",
          article.similarSources?.length > 0 ? "mb-4" : ""
        )}>
          {article.title}
        </h3>

        {/* Similar Sources */}
        {article.similarSources && article.similarSources.length > 0 && (
          <Collapsible open={isSimilarOpen} onOpenChange={setIsSimilarOpen}>
            <CollapsibleTrigger className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 font-medium w-full">
              <ChevronRight className={cn("h-3.5 w-3.5 transition-transform", isSimilarOpen && "rotate-90")} />
              {article.similarSources.length} similar source{article.similarSources.length > 1 ? "s" : ""}
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-3">
              <div className="space-y-2">
                {/* Included sources (green) */}
                {article.similarSources.map((source, index) => {
                  const isIncluded = sourceStates[index] === "included";
                  if (!isIncluded) return null;
                  return (
                    <div
                      key={index}
                      className="flex items-center justify-between rounded-lg border px-3 py-2 transition-colors bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800"
                    >
                      <a
                        href={source.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-xs font-medium hover:opacity-70 transition-opacity"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <span className="truncate max-w-[120px]">{source.title}</span>
                        <ExternalLink className="h-3 w-3 flex-shrink-0 text-muted-foreground" />
                      </a>
                      <div className="flex items-center">
                        <div className="h-4 w-px mx-2 bg-emerald-200 dark:bg-emerald-700" />
                        <button
                          className="p-1 rounded transition-colors bg-emerald-500 text-white"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleSourceState(index, "included", source.title);
                          }}
                        >
                          <Check className="h-3.5 w-3.5" />
                        </button>
                        <button
                          className="p-1 rounded transition-colors ml-1 text-muted-foreground hover:text-rose-600 hover:bg-rose-100 dark:hover:bg-rose-900/50"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleSourceState(index, "excluded", source.title);
                          }}
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                        <button
                          className="p-1 rounded transition-colors ml-1 text-muted-foreground hover:text-primary hover:bg-muted"
                          onClick={(e) => {
                            e.stopPropagation();
                            onUnlinkSource?.(article.id, index, source);
                          }}
                          title="Detach as new card"
                        >
                          <Unlink2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
                {/* Excluded sources (red) */}
                {article.similarSources.map((source, index) => {
                  const isIncluded = sourceStates[index] === "included";
                  if (isIncluded) return null;
                  return (
                    <div
                      key={index}
                      className="flex items-center justify-between rounded-lg border px-3 py-2 transition-colors bg-rose-50 border-rose-200 dark:bg-rose-950/30 dark:border-rose-800"
                    >
                      <a
                        href={source.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-xs font-medium hover:opacity-70 transition-opacity"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <span className="truncate max-w-[120px]">{source.title}</span>
                        <ExternalLink className="h-3 w-3 flex-shrink-0 text-muted-foreground" />
                      </a>
                      <div className="flex items-center">
                        <div className="h-4 w-px mx-2 bg-rose-200 dark:bg-rose-700" />
                        <button
                          className="p-1 rounded transition-colors text-muted-foreground hover:text-emerald-600 hover:bg-emerald-100 dark:hover:bg-emerald-900/50"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleSourceState(index, "included", source.title);
                          }}
                        >
                          <Check className="h-3.5 w-3.5" />
                        </button>
                        <button
                          className="p-1 rounded transition-colors ml-1 bg-rose-500 text-white"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleSourceState(index, "excluded", source.title);
                          }}
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                        <button
                          className="p-1 rounded transition-colors ml-1 text-muted-foreground hover:text-primary hover:bg-muted"
                          onClick={(e) => {
                            e.stopPropagation();
                            onUnlinkSource?.(article.id, index, source);
                          }}
                          title="Detach as new card"
                        >
                          <Unlink2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Created at / Modified by Section */}
        <div className="border-t pt-4 mt-4">
          {hasModification ? (
            <>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {getModificationDescription(article)}
              </p>
              <span className="text-xs text-muted-foreground/70">{formatDate(modificationDate)}</span>
            </>
          ) : (
            <>
              <p className="text-xs text-muted-foreground mb-0.5">Created at</p>
              <span className="text-xs">{formatDateTime(article.sourceTimestamp)}</span>
            </>
          )}
        </div>
      </div>
    </Card>
  );
}
