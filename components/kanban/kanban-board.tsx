"use client";

import { useEffect, useState } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  KeyboardSensor,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { Plus, Bot, User } from "lucide-react";
import { Article, ColumnId, COLUMNS } from "@/lib/types";
import { useArticleStore } from "@/lib/store";
import { KanbanColumn } from "./kanban-column";
import { KanbanCard } from "./kanban-card";
import { ArticleDialog } from "./article-dialog";
import { ActionFooter } from "./action-footer";
import { HistoryPanel } from "./history-panel";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

function formatDate(date: Date | null | undefined): string {
  if (!date) return "Never";
  const d = new Date(date);
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function KanbanBoard() {
  const {
    articles,
    globalHistory,
    addArticle,
    updateArticle,
    deleteArticle,
    moveArticle,
    reorderArticles,
    columnMetadata,
    currentUser,
    setCurrentUser,
    seedData,
    hasUnsavedChanges,
    saveChanges,
    discardChanges,
    unlinkSource,
    updateSourceState,
  } = useArticleStore();

  const [activeArticle, setActiveArticle] = useState<Article | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState<Article | null>(null);
  const [defaultColumnId, setDefaultColumnId] = useState<ColumnId>("included");
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [userName, setUserName] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Seed sample data if not already seeded
    seedData();
    if (!currentUser) {
      setUserDialogOpen(true);
    }
  }, [currentUser, seedData]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const article = articles.find((a) => a.id === active.id);
    if (article) {
      setActiveArticle(article);
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeArticle = articles.find((a) => a.id === activeId);
    if (!activeArticle) return;

    // Check if dropping over a column
    const isOverColumn = COLUMNS.some((col) => col.id === overId);
    if (isOverColumn) {
      const newColumnId = overId as ColumnId;
      if (activeArticle.columnId !== newColumnId) {
        moveArticle(activeArticle.id, newColumnId);
      }
      return;
    }

    // Check if dropping over another article
    const overArticle = articles.find((a) => a.id === overId);
    if (overArticle) {
      // If different columns, move to new column
      if (activeArticle.columnId !== overArticle.columnId) {
        moveArticle(activeArticle.id, overArticle.columnId);
      }
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveArticle(null);

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    if (activeId === overId) return;

    const activeArticle = articles.find((a) => a.id === activeId);
    const overArticle = articles.find((a) => a.id === overId);

    if (!activeArticle) return;

    // Reorder within the same column
    if (overArticle && activeArticle.columnId === overArticle.columnId) {
      reorderArticles(activeId, overId, activeArticle.columnId);
    }
  };

  const handleAddArticle = (columnId: ColumnId) => {
    setEditingArticle(null);
    setDefaultColumnId(columnId);
    setDialogOpen(true);
  };

  const handleEditArticle = (article: Article) => {
    setEditingArticle(article);
    setDefaultColumnId(article.columnId);
    setDialogOpen(true);
  };

  const handleSaveArticle = (articleData: Omit<Article, "id">) => {
    if (editingArticle) {
      updateArticle(editingArticle.id, articleData);
    } else {
      addArticle(articleData);
    }
  };

  const handleSaveUser = () => {
    if (userName.trim()) {
      setCurrentUser(userName.trim());
      setUserDialogOpen(false);
    }
  };

  const getArticlesByColumn = (columnId: ColumnId) =>
    articles.filter((article) => article.columnId === columnId);

  if (!mounted) {
    return (
      <div className="flex flex-col min-h-screen bg-background">
        <header className="border-b px-6 py-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div>
              <Skeleton className="h-8 w-48 mb-2" />
              <Skeleton className="h-4 w-64" />
            </div>
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-md" />
              <Skeleton className="h-10 w-10 rounded-md" />
              <Skeleton className="h-10 w-32 rounded-md" />
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-auto p-6">
          <div className="max-w-7xl mx-auto flex gap-6 justify-center">
            {[1, 2, 3].map((i) => (
              <div key={i} className="w-[350px] flex-shrink-0">
                <Skeleton className="h-12 w-full rounded-lg mb-4" />
                <div className="space-y-3">
                  <Skeleton className="h-40 w-full rounded-lg" />
                  <Skeleton className="h-40 w-full rounded-lg" />
                  <Skeleton className="h-40 w-full rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="border-b px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Article Kanban</h1>
            <p className="text-sm text-muted-foreground">
              Manage your articles from idea to publication
            </p>
          </div>
          <div className="flex items-center gap-3">
            {currentUser && (
              <span className="text-sm text-muted-foreground">
                Logged in as: <strong>{currentUser}</strong>
              </span>
            )}
            <HistoryPanel history={globalHistory} />
            <Button onClick={() => handleAddArticle("included")}>
              <Plus className="h-4 w-4 mr-2" />
              New Article
            </Button>
          </div>
        </div>
      </header>

      {/* Global Metadata Banner */}
      <div className="border-b bg-muted/30 px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-center gap-8">
          <div className="flex items-center gap-2 text-sm">
            <Bot className="h-4 w-4 text-sky-600 dark:text-sky-400" />
            <span className="text-muted-foreground">Last CRON:</span>
            <span className="font-medium">
              {formatDate(columnMetadata.included.lastCronRun)}
            </span>
          </div>
          <div className="h-4 w-px bg-border" />
          <div className="flex items-center gap-2 text-sm">
            <User className="h-4 w-4 text-violet-600 dark:text-violet-400" />
            <span className="text-muted-foreground">Last Human Check:</span>
            <span className="font-medium">
              {columnMetadata.included.lastHumanCheck
                ? `${formatDate(columnMetadata.included.lastHumanCheck.date)} by ${columnMetadata.included.lastHumanCheck.personName}`
                : "Never"}
            </span>
          </div>
        </div>
      </div>

      <main className="flex-1 overflow-auto p-6 pb-24">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="max-w-7xl mx-auto flex gap-6 h-full justify-center">
            {COLUMNS.map((column) => (
              <KanbanColumn
                key={column.id}
                column={column}
                articles={getArticlesByColumn(column.id)}
                onAddArticle={handleAddArticle}
                onEditArticle={handleEditArticle}
                onDeleteArticle={deleteArticle}
                onUnlinkSource={unlinkSource}
                onUpdateSourceState={updateSourceState}
                isDragging={!!activeArticle}
                isActiveColumn={activeArticle?.columnId === column.id}
              />
            ))}
          </div>

          <DragOverlay dropAnimation={{
            duration: 200,
            easing: "cubic-bezier(0.18, 0.67, 0.6, 1.22)",
          }}>
            {activeArticle && (
              <div className="rotate-3 scale-105">
                <KanbanCard
                  article={activeArticle}
                  onEdit={() => {}}
                  onDelete={() => {}}
                  onUnlinkSource={() => {}}
                  onUpdateSourceState={() => {}}
                />
              </div>
            )}
          </DragOverlay>
        </DndContext>
      </main>

      {/* Action Footer */}
      <ActionFooter
        hasChanges={hasUnsavedChanges()}
        onSave={saveChanges}
        onCancel={discardChanges}
        defaultName={currentUser}
      />

      <ArticleDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        article={editingArticle}
        defaultColumnId={defaultColumnId}
        currentUser={currentUser}
        onSave={handleSaveArticle}
      />

      {/* User Name Dialog */}
      <Dialog open={userDialogOpen} onOpenChange={setUserDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Enter Your Name</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              placeholder="Your name..."
              onKeyDown={(e) => e.key === "Enter" && handleSaveUser()}
            />
          </div>
          <DialogFooter>
            <Button onClick={handleSaveUser} disabled={!userName.trim()}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
