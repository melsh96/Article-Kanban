"use client";

import { useState, useMemo } from "react";
import { History, User, ArrowRight, Search, X } from "lucide-react";
import { GlobalHistory, COLUMNS, COLUMN_LABELS } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";

interface HistoryPanelProps {
  history: GlobalHistory[];
}

function formatFullDateTime(date: Date): string {
  const d = new Date(date);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }) + " at " + d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function getColumnLabel(columnId: string): string {
  if (columnId === "new") return "Created";
  if (columnId === "deleted") return "Deleted";
  return COLUMN_LABELS[columnId as keyof typeof COLUMN_LABELS] || columnId;
}

export function HistoryPanel({ history }: HistoryPanelProps) {
  const [columnFilter, setColumnFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const totalChanges = history.reduce((acc, entry) => acc + entry.changes.length, 0);

  const filteredHistory = useMemo(() => {
    let result = [...history].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    // Apply column filter
    if (columnFilter !== "all") {
      result = result
        .map((entry) => ({
          ...entry,
          changes: entry.changes.filter(
            (change) => change.toColumn === columnFilter || change.fromColumn === columnFilter
          ),
        }))
        .filter((entry) => entry.changes.length > 0);
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result
        .map((entry) => ({
          ...entry,
          changes: entry.changes.filter((change) =>
            change.articleTitle.toLowerCase().includes(query)
          ),
        }))
        .filter(
          (entry) =>
            entry.changes.length > 0 ||
            entry.personName.toLowerCase().includes(query)
        );
    }

    return result;
  }, [history, columnFilter, searchQuery]);

  const filteredChangesCount = filteredHistory.reduce(
    (acc, entry) => acc + entry.changes.length,
    0
  );

  const clearFilters = () => {
    setColumnFilter("all");
    setSearchQuery("");
  };

  const hasActiveFilters = columnFilter !== "all" || searchQuery.trim() !== "";

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" className="relative">
          <History className="h-4 w-4" />
          {totalChanges > 0 && (
            <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary text-[10px] font-medium text-primary-foreground flex items-center justify-center">
              {totalChanges > 99 ? "99+" : totalChanges}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[400px] sm:w-[480px] p-0 flex flex-col">
        <SheetHeader className="px-6 pt-6 pb-4">
          <SheetTitle className="text-xl font-semibold">Change History</SheetTitle>
          <SheetDescription>
            View all changes made to articles
          </SheetDescription>
        </SheetHeader>

        {/* Search & Filters */}
        <div className="px-6 pb-4 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search articles or users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                onClick={() => setSearchQuery("")}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Select value={columnFilter} onValueChange={setColumnFilter}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Filter column" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Columns</SelectItem>
                {COLUMNS.map((col) => (
                  <SelectItem key={col.id} value={col.id}>
                    {col.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
              >
                Clear
              </Button>
            )}
          </div>
          {hasActiveFilters && (
            <p className="text-sm text-muted-foreground">
              Showing {filteredChangesCount} of {totalChanges} changes
            </p>
          )}
        </div>

        {/* History List */}
        <ScrollArea className="flex-1 px-6">
          {filteredHistory.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <History className="h-12 w-12 mb-4 opacity-20" />
              <p className="text-base font-medium">No history found</p>
              <p className="text-sm">
                {hasActiveFilters ? "Try adjusting your filters" : "Changes will appear here"}
              </p>
            </div>
          ) : (
            <div className="space-y-6 pb-6">
              {filteredHistory.map((entry) => (
                <div key={entry.id} className="flex gap-4">
                  {/* User Avatar */}
                  <div className="flex-shrink-0">
                    <div className="h-10 w-10 rounded-full bg-sky-100 dark:bg-sky-900/30 flex items-center justify-center">
                      <User className="h-5 w-5 text-sky-600 dark:text-sky-400" />
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    {/* User Info */}
                    <div className="mb-2">
                      <p className="font-semibold text-sm">{entry.personName}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatFullDateTime(entry.timestamp)}
                      </p>
                    </div>

                    {/* Changes Cards */}
                    <div className="space-y-2">
                      {entry.changes.map((change, index) => (
                        <div
                          key={index}
                          className="bg-muted/50 rounded-lg p-3"
                        >
                          <p className="font-medium text-sm mb-1.5">
                            {change.articleTitle}
                          </p>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span>{getColumnLabel(change.fromColumn)}</span>
                            <ArrowRight className="h-4 w-4" />
                            <span>{getColumnLabel(change.toColumn)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
