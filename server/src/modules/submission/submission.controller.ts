import { Request, Response } from "express";
import { listSubmissionsQuerySchema } from "../../validation/schemas";
import { submissionService } from "./submission.service";

const createSubmission = async (req: Request, res: Response) => {
  const submission = await submissionService.createSubmission(req.user!.id, req.body);

  res.status(201).json({
    success: true,
    message: "Submission created successfully.",
    data: { submission },
  });
};

const resubmitSubmission = async (req: Request, res: Response) => {
  const submission = await submissionService.resubmitSubmission(req.params.id as string, req.user!.id, req.body);

  res.json({
    success: true,
    message: "Submission resubmitted for review.",
    data: { submission },
  });
};

const listSubmissions = async (req: Request, res: Response) => {
  const query = listSubmissionsQuerySchema.parse(req.query);
  const data = await submissionService.listSubmissions(req.user!, query);

  res.json({ success: true, data });
};

const getSubmissionStats = async (req: Request, res: Response) => {
  const stats = await submissionService.getSubmissionStats(req.user!);

  res.json({ success: true, data: { stats } });
};

const getSubmission = async (req: Request, res: Response) => {
  const submission = await submissionService.getSubmission(req.params.id as string, req.user!);

  res.json({ success: true, data: { submission } });
};

const reviewSubmission = async (req: Request, res: Response) => {
  const submission = await submissionService.reviewSubmission(req.params.id as string, req.user!.id, req.body);

  res.json({
    success: true,
    message: `Submission ${submission.status.toLowerCase()} successfully.`,
    data: { submission },
  });
};

const addFeedback = async (req: Request, res: Response) => {
  const feedback = await submissionService.addFeedback(req.params.id as string, req.user!.id, req.body.comment);

  res.status(201).json({
    success: true,
    message: "Feedback added successfully.",
    data: { feedback },
  });
};

export const submissionController = {
  createSubmission,
  resubmitSubmission,
  listSubmissions,
  getSubmissionStats,
  getSubmission,
  reviewSubmission,
  addFeedback,
};
