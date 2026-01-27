"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Article, ColumnId, SourceType, SimilarSource } from "@/lib/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ArticleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  article?: Article | null;
  defaultColumnId?: ColumnId;
  currentUser: string;
  onSave: (article: Omit<Article, "id">) => void;
}

export function ArticleDialog({
  open,
  onOpenChange,
  article,
  defaultColumnId = "included",
  currentUser,
  onSave,
}: ArticleDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [link, setLink] = useState("");
  const [columnId, setColumnId] = useState<ColumnId>(defaultColumnId);
  const [sourceType, setSourceType] = useState<SourceType>("manual");
  const [addedBy, setAddedBy] = useState("");
  const [similarSources, setSimilarSources] = useState<SimilarSource[]>([]);
  const [newSourceTitle, setNewSourceTitle] = useState("");
  const [newSourceLink, setNewSourceLink] = useState("");

  useEffect(() => {
    if (article) {
      setTitle(article.title);
      setDescription(article.description);
      setLink(article.link);
      setColumnId(article.columnId);
      setSourceType(article.sourceType);
      setSimilarSources(article.similarSources || []);
    } else {
      setTitle("");
      setDescription("");
      setLink("");
      setColumnId(defaultColumnId);
      setSourceType("manual");
      setAddedBy(currentUser || "");
      setSimilarSources([]);
    }
    setNewSourceTitle("");
    setNewSourceLink("");
  }, [article, defaultColumnId, open, currentUser]);

  const handleAddSimilarSource = () => {
    if (newSourceTitle.trim() && newSourceLink.trim()) {
      setSimilarSources([
        ...similarSources,
        { title: newSourceTitle.trim(), link: newSourceLink.trim() },
      ]);
      setNewSourceTitle("");
      setNewSourceLink("");
    }
  };

  const handleRemoveSimilarSource = (index: number) => {
    setSimilarSources(similarSources.filter((_, i) => i !== index));
  };

  const isNewArticle = !article;
  const isNewManualArticle = isNewArticle && sourceType === "manual";
  const canSave = title.trim() && (!isNewManualArticle || addedBy.trim());

  const handleSave = () => {
    if (!canSave) return;

    const now = new Date();

    onSave({
      title: title.trim(),
      description: description.trim(),
      link: link.trim(),
      // All new articles go directly to "included" column by default
      columnId: isNewArticle ? "included" : columnId,
      sourceType: article?.sourceType || sourceType,
      sourceTimestamp: article?.sourceTimestamp || now,
      additionalSources: article?.additionalSources || [],
      similarSources,
      similarSourceStates: article?.similarSourceStates,
      // Manual articles record who created them
      lastModification: article?.lastModification || (sourceType === "manual" ? {
        type: "created",
        by: addedBy.trim(),
        timestamp: now,
      } : null),
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>{article ? "Edit Article" : "New Article"}</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label htmlFor="title" className="text-sm font-medium">
                Title *
              </label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter article title..."
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="link" className="text-sm font-medium">
                Link
              </label>
              <Input
                id="link"
                type="url"
                value={link}
                onChange={(e) => setLink(e.target.value)}
                placeholder="https://example.com/article"
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="description" className="text-sm font-medium">
                Description
              </label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of the article..."
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              {/* Show column selector only when editing an existing article */}
              {article ? (
                <div className="grid gap-2">
                  <label htmlFor="column" className="text-sm font-medium">
                    Column
                  </label>
                  <Select value={columnId} onValueChange={(v) => setColumnId(v as ColumnId)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="included">Articles Included</SelectItem>
                      <SelectItem value="excluded">Articles Excluded</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="grid gap-2">
                  <label className="text-sm font-medium">Column</label>
                  <div className="h-10 px-3 py-2 rounded-md border bg-muted/50 text-sm flex items-center">
                    Articles Included
                  </div>
                  <p className="text-xs text-muted-foreground">
                    New articles are added to Included by default
                  </p>
                </div>
              )}
              {!article && (
                <div className="grid gap-2">
                  <label htmlFor="source" className="text-sm font-medium">
                    Source Type
                  </label>
                  <Select value={sourceType} onValueChange={(v) => setSourceType(v as SourceType)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manual">Manually Added</SelectItem>
                      <SelectItem value="cron">Cron</SelectItem>
                      <SelectItem value="playground">Playground</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Added By - Required for manual articles */}
            {isNewManualArticle && (
              <div className="grid gap-2">
                <label htmlFor="addedBy" className="text-sm font-medium">
                  Added by *
                </label>
                <Input
                  id="addedBy"
                  value={addedBy}
                  onChange={(e) => setAddedBy(e.target.value)}
                  placeholder="Your name..."
                />
              </div>
            )}

            {/* Similar Sources Section */}
            <div className="grid gap-2 border-t pt-4 mt-2">
              <label className="text-sm font-medium">Similar Sources</label>
              <p className="text-xs text-muted-foreground mb-2">
                Add related links and references
              </p>

              {/* Existing similar sources */}
              {similarSources.length > 0 && (
                <div className="space-y-2 mb-3">
                  {similarSources.map((source, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 p-2 bg-muted/50 rounded-md"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{source.title}</p>
                        <p className="text-xs text-muted-foreground truncate">{source.link}</p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 flex-shrink-0 text-destructive hover:text-destructive"
                        onClick={() => handleRemoveSimilarSource(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add new similar source */}
              <div className="space-y-2">
                <Input
                  placeholder="Source title..."
                  value={newSourceTitle}
                  onChange={(e) => setNewSourceTitle(e.target.value)}
                />
                <div className="flex gap-2">
                  <Input
                    placeholder="https://example.com/source"
                    type="url"
                    value={newSourceLink}
                    onChange={(e) => setNewSourceLink(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddSimilarSource()}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={handleAddSimilarSource}
                    disabled={!newSourceTitle.trim() || !newSourceLink.trim()}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!canSave}>
            {article ? "Save Changes" : "Create Article"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
