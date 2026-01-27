"use client";

import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Plus } from "lucide-react";
import { Article, ColumnId, Column, COLUMN_COLORS } from "@/lib/types";
import { KanbanCard } from "./kanban-card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface KanbanColumnProps {
  column: Column;
  articles: Article[];
  onAddArticle: (columnId: ColumnId) => void;
  onEditArticle: (article: Article) => void;
  onDeleteArticle: (id: string) => void;
  onUnlinkSource: (articleId: string, sourceIndex: number, source: { title: string; link: string }) => void;
  onUpdateSourceState: (articleId: string, sourceIndex: number, sourceName: string, state: "included" | "excluded") => void;
  isDragging?: boolean;
  isActiveColumn?: boolean;
}

export function KanbanColumn({
  column,
  articles,
  onAddArticle,
  onEditArticle,
  onDeleteArticle,
  onUnlinkSource,
  onUpdateSourceState,
  isDragging = false,
  isActiveColumn = false,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
  });

  const colors = COLUMN_COLORS[column.id];

  return (
    <div
      className={cn(
        "flex flex-col rounded-lg p-4 w-full max-w-[400px] h-full transition-all duration-200 border",
        colors.bg,
        colors.border,
        isDragging && !isActiveColumn && "ring-2 ring-dashed ring-primary/40",
        isOver && "ring-2 ring-primary ring-offset-2 scale-[1.02]",
        isActiveColumn && isDragging && "opacity-60"
      )}
    >
      {/* Column Header */}
      <div className={cn("flex items-center justify-between mb-3 -mx-4 -mt-4 px-4 py-3 rounded-t-lg", colors.header)}>
        <div className="flex items-center gap-2">
          <h2 className="font-semibold text-base">{column.title}</h2>
          <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", colors.badge)}>
            {articles.length}
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => onAddArticle(column.id)}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Articles Section */}
      <ScrollArea className="flex-1 mb-3">
        <div ref={setNodeRef} className="flex flex-col gap-2 min-h-[100px] pr-2">
          <SortableContext
            items={articles.map((a) => a.id)}
            strategy={verticalListSortingStrategy}
          >
            {articles.map((article) => (
              <KanbanCard
                key={article.id}
                article={article}
                onEdit={onEditArticle}
                onDelete={onDeleteArticle}
                onUnlinkSource={onUnlinkSource}
                onUpdateSourceState={onUpdateSourceState}
              />
            ))}
          </SortableContext>
          {articles.length === 0 && (
            <div
              className={cn(
                "flex items-center justify-center h-24 border-2 border-dashed rounded-lg transition-colors",
                isDragging && !isActiveColumn
                  ? "border-primary/60 bg-primary/5"
                  : "border-muted-foreground/20"
              )}
            >
              <p className="text-xs text-muted-foreground">
                {isDragging ? "Drop here" : "No articles"}
              </p>
            </div>
          )}
        </div>
      </ScrollArea>

          </div>
  );
}
