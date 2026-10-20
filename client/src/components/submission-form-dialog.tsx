"use client";

import { MessageSquareText } from "lucide-react";
import { submissionsApi } from "@/lib/api";
import { submissionSchema } from "@/lib/validation";
import { showToast } from "@/lib/alerts";
import { useZodForm } from "@/hooks/use-zod-form";
import { Submission } from "@/types";
import { FormBanner, FormField } from "@/components/form-field";
import { Spinner } from "@/components/spinner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const DESCRIPTION_MAX = 2000;

/**
 * Create a new submission, or resubmit a rejected one (pass `resubmitting`).
 * The form is remounted per target via `key`, so it always starts fresh.
 */
export function SubmissionFormDialog({
  open,
  onOpenChange,
  resubmitting,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resubmitting: Submission | null;
  onSaved: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{resubmitting ? "Resubmit Project" : "Submit a Project"}</DialogTitle>
          <DialogDescription>
            {resubmitting
              ? "Address the mentor's feedback, update the details, and send it back for review."
              : "Fill in your project details for review by a mentor."}
          </DialogDescription>
        </DialogHeader>
        <SubmissionForm
          key={resubmitting?.id ?? "new"}
          resubmitting={resubmitting}
          onCancel={() => onOpenChange(false)}
          onSaved={() => {
            onOpenChange(false);
            onSaved();
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

function SubmissionForm({
  resubmitting,
  onCancel,
  onSaved,
}: {
  resubmitting: Submission | null;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const form = useZodForm(submissionSchema, {
    projectName: resubmitting?.projectName ?? "",
    repoUrl: resubmitting?.repoUrl ?? "",
    liveUrl: resubmitting?.liveUrl ?? "",
    description: resubmitting?.description ?? "",
  });
  const { errors, field, formError, isSubmitting } = form;
  const latestFeedback = resubmitting?.feedbacks?.[0];
  const descriptionLength = form.values.description.trim().length;

  const onSubmit = form.handleSubmit(async (data) => {
    if (resubmitting) {
      await submissionsApi.resubmit(resubmitting.id, data);
      showToast("Resubmitted for review", "success");
    } else {
      await submissionsApi.create(data);
      showToast("Project submitted for review", "success");
    }
    onSaved();
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {latestFeedback && (
        <div className="rounded-md border border-border/60 bg-muted/40 p-3 text-sm">
          <p className="flex items-center gap-1.5 font-medium mb-1">
            <MessageSquareText className="size-4" /> Feedback from {latestFeedback.mentor?.name ?? "a mentor"}
          </p>
          <p className="text-muted-foreground whitespace-pre-wrap">{latestFeedback.comment}</p>
        </div>
      )}

      <FormBanner message={formError} />

      <FormField id="projectName" label="Project name" error={errors.projectName}>
        <Input {...field("projectName")} placeholder="My Awesome Project" maxLength={100} autoFocus />
      </FormField>

      <FormField
        id="repoUrl"
        label="GitHub repository URL"
        error={errors.repoUrl}
        hint="The repository's root URL, e.g. https://github.com/username/project"
      >
        <Input {...field("repoUrl")} type="url" inputMode="url" placeholder="https://github.com/username/project" />
      </FormField>

      <FormField id="liveUrl" label="Live link" error={errors.liveUrl} hint="Where your deployed project can be viewed">
        <Input {...field("liveUrl")} type="url" inputMode="url" placeholder="https://my-project.vercel.app" />
      </FormField>

      <FormField id="description" label="Description" error={errors.description}>
        <Textarea
          {...field("description")}
          placeholder="What does it do? Which technologies did you use? Anything the reviewer should know?"
          maxLength={DESCRIPTION_MAX}
          rows={5}
        />
        <p className="text-right text-xs tabular-nums text-muted-foreground">
          {descriptionLength}/{DESCRIPTION_MAX}
        </p>
      </FormField>

      <div className="flex justify-end gap-3 pt-1">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Spinner className="size-4 text-current" />}
          {isSubmitting ? "Submitting…" : resubmitting ? "Resubmit" : "Submit project"}
        </Button>
      </div>
    </form>
  );
}
