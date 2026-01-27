"use client";

import { useState } from "react";
import { Save, Undo2, AlertTriangle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";

interface ActionFooterProps {
  hasChanges: boolean;
  onSave: (modifiedBy: string) => void;
  onCancel: () => void;
  defaultName?: string;
}

export function ActionFooter({
  hasChanges,
  onSave,
  onCancel,
  defaultName = "",
}: ActionFooterProps) {
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [modifierName, setModifierName] = useState(defaultName);
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveClick = () => {
    setModifierName(defaultName);
    setSaveDialogOpen(true);
  };

  const handleConfirmSave = async () => {
    if (modifierName.trim()) {
      setIsSaving(true);

      // Simulate a brief delay for better UX
      await new Promise(resolve => setTimeout(resolve, 300));

      onSave(modifierName.trim());
      setSaveDialogOpen(false);
      setModifierName("");
      setIsSaving(false);

      toast.success("Changes saved successfully", {
        description: `Saved by ${modifierName.trim()}`,
        icon: <CheckCircle2 className="h-4 w-4" />,
      });
    }
  };

  const handleConfirmCancel = () => {
    onCancel();
    setCancelDialogOpen(false);

    toast.info("Changes discarded", {
      description: "All changes have been reverted to the last saved state",
    });
  };

  return (
    <>
      {/* Sticky Footer */}
      <footer className="sticky bottom-0 left-0 right-0 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-center gap-4">
          <Button
            variant="outline"
            onClick={() => setCancelDialogOpen(true)}
            disabled={!hasChanges}
            className="min-w-[140px]"
          >
            <Undo2 className="h-4 w-4 mr-2" />
            Discard
          </Button>
          <Button
            onClick={handleSaveClick}
            disabled={!hasChanges}
            className="min-w-[140px]"
          >
            <Save className="h-4 w-4 mr-2" />
            Save Changes
          </Button>
        </div>
        {hasChanges && (
          <div className="text-center pb-2">
            <span className="text-xs text-amber-600 dark:text-amber-400 flex items-center justify-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              You have unsaved changes
            </span>
          </div>
        )}
      </footer>

      {/* Save Confirmation Modal */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Save Changes</DialogTitle>
            <DialogDescription>
              Please enter your name to save these modifications.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <label htmlFor="modifier-name" className="text-sm font-medium mb-2 block">
              Who modified these articles? *
            </label>
            <Input
              id="modifier-name"
              value={modifierName}
              onChange={(e) => setModifierName(e.target.value)}
              placeholder="Enter your name..."
              onKeyDown={(e) => e.key === "Enter" && !isSaving && handleConfirmSave()}
              autoFocus
              disabled={isSaving}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSaveDialogOpen(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmSave}
              disabled={!modifierName.trim() || isSaving}
            >
              {isSaving ? (
                <>
                  <span className="animate-spin mr-2">
                    <svg className="h-4 w-4" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                  </span>
                  Saving...
                </>
              ) : (
                "Confirm Save"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Confirmation Alert Dialog */}
      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard Changes?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to undo all changes? This will revert all
              articles to their last saved state. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Editing</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmCancel}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              Discard Changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
