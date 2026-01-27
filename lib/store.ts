"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Article, ColumnId, ColumnHistory, GlobalHistory, ColumnMetadata, SourceType, HistoryAction, ArticleModification } from "./types";
import { sampleArticles } from "./seed-data";

interface ArticleStore {
  articles: Article[];
  savedArticles: Article[];
  globalHistory: GlobalHistory[];
  columnHistory: Record<ColumnId, ColumnHistory[]>;
  columnMetadata: Record<ColumnId, ColumnMetadata>;
  currentUser: string;
  isSeeded: boolean;
  lastSavedBy: string | null;
  lastSavedAt: Date | null;
  setCurrentUser: (name: string) => void;
  addArticle: (article: Omit<Article, "id">) => void;
  updateArticle: (id: string, updates: Partial<Article>) => void;
  deleteArticle: (id: string) => void;
  moveArticle: (id: string, newColumnId: ColumnId) => void;
  reorderArticles: (activeId: string, overId: string, columnId: ColumnId) => void;
  addSourceToArticle: (id: string, sourceType: SourceType) => void;
  updateSourceState: (articleId: string, sourceIndex: number, sourceName: string, state: "included" | "excluded") => void;
  updateColumnMetadata: (columnId: ColumnId, type: "cron" | "human", personName?: string) => void;
  getHistoryByColumn: (columnId: ColumnId) => ColumnHistory[];
  hasUnsavedChanges: () => boolean;
  saveChanges: (modifiedBy: string) => void;
  discardChanges: () => void;
  unlinkSource: (articleId: string, sourceIndex: number, source: { title: string; link: string }) => void;
  seedData: () => void;
  clearData: () => void;
}

const defaultColumnMetadata: Record<ColumnId, ColumnMetadata> = {
  included: { lastCronRun: null, lastHumanCheck: null },
  excluded: { lastCronRun: null, lastHumanCheck: null },
};

const defaultColumnHistory: Record<ColumnId, ColumnHistory[]> = {
  included: [],
  excluded: [],
};

// Helper to compare articles for change detection
function articlesEqual(a: Article[], b: Article[]): boolean {
  if (a.length !== b.length) return false;

  const aMap = new Map(a.map(article => [article.id, article]));

  for (const articleB of b) {
    const articleA = aMap.get(articleB.id);
    if (!articleA) return false;

    if (
      articleA.title !== articleB.title ||
      articleA.description !== articleB.description ||
      articleA.link !== articleB.link ||
      articleA.columnId !== articleB.columnId
    ) {
      return false;
    }
  }

  return true;
}

export const useArticleStore = create<ArticleStore>()(
  persist(
    (set, get) => ({
      articles: [],
      savedArticles: [],
      globalHistory: [],
      columnHistory: defaultColumnHistory,
      columnMetadata: defaultColumnMetadata,
      currentUser: "",
      isSeeded: false,
      lastSavedBy: null,
      lastSavedAt: null,

      setCurrentUser: (name) => set({ currentUser: name }),

      seedData: () =>
        set((state) => {
          if (state.isSeeded || state.articles.length > 0) return state;

          // Generate initial column history entries for sample articles
          const initialColumnHistory: Record<ColumnId, ColumnHistory[]> = {
            included: [],
            excluded: [],
          };

          sampleArticles.forEach((article) => {
            initialColumnHistory[article.columnId].push({
              articleId: article.id,
              articleTitle: article.title,
              movedBy: article.sourceType === "cron" ? "Cron System" : "Manual Entry",
              movedAt: article.sourceTimestamp,
              fromColumn: "new",
            });
          });

          // Generate initial global history
          const initialGlobalHistory: GlobalHistory[] = [{
            id: crypto.randomUUID(),
            personName: "System",
            timestamp: new Date("2026-01-27T06:00:00"),
            changes: sampleArticles.map((article) => ({
              articleId: article.id,
              articleTitle: article.title,
              action: "created" as HistoryAction,
              fromColumn: "new",
              toColumn: article.columnId,
            })),
          }];

          return {
            articles: sampleArticles,
            savedArticles: sampleArticles,
            globalHistory: initialGlobalHistory,
            columnHistory: initialColumnHistory,
            isSeeded: true,
            lastSavedBy: "System",
            lastSavedAt: new Date(),
            columnMetadata: {
              included: {
                lastCronRun: new Date("2026-01-27T06:00:00"),
                lastHumanCheck: { date: new Date("2026-01-26T14:00:00"), personName: "Michael Chen" },
              },
              excluded: {
                lastCronRun: new Date("2026-01-27T06:00:00"),
                lastHumanCheck: { date: new Date("2026-01-26T16:45:00"), personName: "Emma Wilson" },
              },
            },
          };
        }),

      clearData: () =>
        set({
          articles: [],
          savedArticles: [],
          globalHistory: [],
          columnHistory: defaultColumnHistory,
          columnMetadata: defaultColumnMetadata,
          isSeeded: false,
          lastSavedBy: null,
          lastSavedAt: null,
        }),

      hasUnsavedChanges: () => {
        const state = get();
        return !articlesEqual(state.articles, state.savedArticles);
      },

      saveChanges: (modifiedBy) =>
        set((state) => {
          const now = new Date();

          // Find all changes between current and saved state
          const changes: GlobalHistory["changes"] = [];

          state.articles.forEach((article) => {
            const savedArticle = state.savedArticles.find((a) => a.id === article.id);
            if (!savedArticle) {
              // New article
              changes.push({
                articleId: article.id,
                articleTitle: article.title,
                action: "created",
                fromColumn: "new",
                toColumn: article.columnId,
              });
            } else if (savedArticle.columnId !== article.columnId) {
              // Moved article
              changes.push({
                articleId: article.id,
                articleTitle: article.title,
                action: "moved",
                fromColumn: savedArticle.columnId,
                toColumn: article.columnId,
              });
            } else if (
              savedArticle.title !== article.title ||
              savedArticle.description !== article.description ||
              savedArticle.link !== article.link
            ) {
              // Edited article (content changed but not column)
              changes.push({
                articleId: article.id,
                articleTitle: article.title,
                action: "edited",
                fromColumn: article.columnId,
                toColumn: article.columnId,
              });
            }
          });

          // Check for deleted articles
          state.savedArticles.forEach((savedArticle) => {
            if (!state.articles.find((a) => a.id === savedArticle.id)) {
              changes.push({
                articleId: savedArticle.id,
                articleTitle: savedArticle.title,
                action: "deleted",
                fromColumn: savedArticle.columnId,
                toColumn: "deleted",
              });
            }
          });

          // Create new global history entry if there are changes
          const newGlobalHistory: GlobalHistory[] = changes.length > 0
            ? [...state.globalHistory, {
                id: crypto.randomUUID(),
                personName: modifiedBy,
                timestamp: now,
                changes,
              }]
            : state.globalHistory;

          // Update column history for moves
          const newColumnHistory = { ...state.columnHistory };
          changes.forEach((change) => {
            if (change.toColumn !== "deleted" && change.toColumn !== "new") {
              const columnId = change.toColumn as ColumnId;
              newColumnHistory[columnId] = [
                ...newColumnHistory[columnId],
                {
                  articleId: change.articleId,
                  articleTitle: change.articleTitle,
                  movedBy: modifiedBy,
                  movedAt: now,
                  fromColumn: change.fromColumn,
                },
              ];
            }
          });

          // Update column metadata
          const newColumnMetadata = { ...state.columnMetadata };
          const columnIds: ColumnId[] = ["included", "excluded"];

          columnIds.forEach((columnId) => {
            newColumnMetadata[columnId] = {
              ...newColumnMetadata[columnId],
              lastHumanCheck: {
                date: now,
                personName: modifiedBy,
              },
            };
          });

          return {
            articles: state.articles,
            savedArticles: state.articles,
            globalHistory: newGlobalHistory,
            columnHistory: newColumnHistory,
            columnMetadata: newColumnMetadata,
            lastSavedBy: modifiedBy,
            lastSavedAt: now,
          };
        }),

      discardChanges: () =>
        set((state) => ({
          articles: state.savedArticles,
        })),

      unlinkSource: (articleId, sourceIndex, source) =>
        set((state) => {
          const parentArticle = state.articles.find((a) => a.id === articleId);
          if (!parentArticle || !parentArticle.similarSources) return state;

          const now = new Date();
          const unlinkedBy = state.currentUser || "Unknown";

          // Create a new article from the similar source
          const newArticle: Article = {
            id: crypto.randomUUID(),
            title: source.title,
            description: "",
            link: source.link,
            columnId: parentArticle.columnId,
            sourceType: "manual",
            sourceTimestamp: now,
            additionalSources: [],
            similarSources: [],
            lastModification: {
              type: "unlinked" as const,
              by: unlinkedBy,
              timestamp: now,
              details: {
                sourceName: parentArticle.title,
              },
            },
          };

          // Remove the source from parent's similarSources and update its modification
          const updatedSimilarSources = parentArticle.similarSources.filter(
            (_, index) => index !== sourceIndex
          );

          // Also remove from similarSourceStates if it exists
          const updatedSourceStates = parentArticle.similarSourceStates
            ? Object.fromEntries(
                Object.entries(parentArticle.similarSourceStates)
                  .filter(([key]) => parseInt(key) !== sourceIndex)
                  .map(([key, value], idx) => [idx, value])
              )
            : undefined;

          // Update column history for the new article
          const newColumnHistory = { ...state.columnHistory };
          newColumnHistory[newArticle.columnId] = [
            ...newColumnHistory[newArticle.columnId],
            {
              articleId: newArticle.id,
              articleTitle: newArticle.title,
              movedBy: unlinkedBy,
              movedAt: now,
              fromColumn: "unlinked",
            },
          ];

          return {
            articles: [
              ...state.articles.map((a) =>
                a.id === articleId
                  ? {
                      ...a,
                      similarSources: updatedSimilarSources,
                      similarSourceStates: updatedSourceStates,
                      lastModification: {
                        type: "unlinked" as const,
                        by: unlinkedBy,
                        timestamp: now,
                        details: {
                          sourceName: source.title,
                        },
                      },
                    }
                  : a
              ),
              newArticle,
            ],
            columnHistory: newColumnHistory,
          };
        }),

      addArticle: (article) =>
        set((state) => {
          const newArticle: Article = {
            ...article,
            id: crypto.randomUUID(),
          };

          // Add to column history
          const newColumnHistory = { ...state.columnHistory };
          newColumnHistory[newArticle.columnId] = [
            ...newColumnHistory[newArticle.columnId],
            {
              articleId: newArticle.id,
              articleTitle: newArticle.title,
              movedBy: state.currentUser || "Unknown",
              movedAt: new Date(),
              fromColumn: "new",
            },
          ];

          return {
            articles: [...state.articles, newArticle],
            columnHistory: newColumnHistory,
          };
        }),

      updateArticle: (id, updates) =>
        set((state) => ({
          articles: state.articles.map((article) =>
            article.id === id ? { ...article, ...updates } : article
          ),
        })),

      deleteArticle: (id) =>
        set((state) => ({
          articles: state.articles.filter((article) => article.id !== id),
        })),

      moveArticle: (id, newColumnId) =>
        set((state) => {
          const article = state.articles.find((a) => a.id === id);
          if (!article || article.columnId === newColumnId) return state;

          const movedBy = state.currentUser || "Unknown";
          const now = new Date();
          const fromColumn = article.columnId;

          // Add to column history for the destination column
          const newColumnHistory = { ...state.columnHistory };
          newColumnHistory[newColumnId] = [
            ...newColumnHistory[newColumnId],
            {
              articleId: article.id,
              articleTitle: article.title,
              movedBy,
              movedAt: now,
              fromColumn,
            },
          ];

          // Update the article with new column and modification info
          const updatedArticle: Article = {
            ...article,
            columnId: newColumnId,
            lastModification: {
              type: "dragged",
              by: movedBy,
              timestamp: now,
              details: {
                fromColumn,
                toColumn: newColumnId,
              },
            },
          };

          return {
            articles: state.articles.map((a) =>
              a.id === id ? updatedArticle : a
            ),
            columnHistory: newColumnHistory,
          };
        }),

      reorderArticles: (activeId, overId, columnId) =>
        set((state) => {
          const columnArticles = state.articles.filter((a) => a.columnId === columnId);
          const otherArticles = state.articles.filter((a) => a.columnId !== columnId);

          const oldIndex = columnArticles.findIndex((a) => a.id === activeId);
          const newIndex = columnArticles.findIndex((a) => a.id === overId);

          if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) {
            return state;
          }

          const reorderedColumn = [...columnArticles];
          const [removed] = reorderedColumn.splice(oldIndex, 1);
          reorderedColumn.splice(newIndex, 0, removed);

          return {
            articles: [...otherArticles, ...reorderedColumn],
          };
        }),

      addSourceToArticle: (id, sourceType) =>
        set((state) => ({
          articles: state.articles.map((article) =>
            article.id === id
              ? {
                  ...article,
                  additionalSources: [...article.additionalSources, sourceType],
                }
              : article
          ),
        })),

      updateSourceState: (articleId, sourceIndex, sourceName, newState) =>
        set((state) => {
          const now = new Date();
          const modifiedBy = state.currentUser || "Unknown";

          return {
            articles: state.articles.map((article) =>
              article.id === articleId
                ? {
                    ...article,
                    similarSourceStates: {
                      ...article.similarSourceStates,
                      [sourceIndex]: newState,
                    },
                    lastModification: {
                      type: newState === "included" ? "source_included" : "source_excluded",
                      by: modifiedBy,
                      timestamp: now,
                      details: {
                        sourceName,
                      },
                    },
                  }
                : article
            ),
          };
        }),

      updateColumnMetadata: (columnId, type, personName) =>
        set((state) => ({
          columnMetadata: {
            ...state.columnMetadata,
            [columnId]: {
              ...state.columnMetadata[columnId],
              ...(type === "cron"
                ? { lastCronRun: new Date() }
                : { lastHumanCheck: { date: new Date(), personName: personName || state.currentUser || "Unknown" } }),
            },
          },
        })),

      getHistoryByColumn: (columnId) => {
        const state = get();
        return state.columnHistory[columnId]
          .sort((a, b) => new Date(b.movedAt).getTime() - new Date(a.movedAt).getTime());
      },
    }),
    {
      name: "article-storage",
    }
  )
);
