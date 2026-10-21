import { Request, Response } from "express";
import { SubmissionStatus } from "@prisma/client";
import { listFeedbackQuerySchema, listUsersQuerySchema, overviewQuerySchema } from "../../validation/schemas";
import { adminService } from "./admin.service";

// ─── Overview ───────────────────────────────────────────────────────────────

const getOverview = async (req: Request, res: Response) => {
  const { tz } = overviewQuerySchema.parse(req.query);
  const data = await adminService.getOverview(tz);

  res.json({ success: true, data });
};

// ─── Users ──────────────────────────────────────────────────────────────────

const listUsers = async (req: Request, res: Response) => {
  const query = listUsersQuerySchema.parse(req.query);
  const data = await adminService.listUsers(query);

  res.json({ success: true, data });
};

const createUser = async (req: Request, res: Response) => {
  const user = await adminService.createUser(req.body);

  res.status(201).json({ success: true, message: `Created ${user.name}.`, data: { user } });
};

const updateUser = async (req: Request, res: Response) => {
  const user = await adminService.updateUser(req.params.id as string, req.user!.id, req.body);

  res.json({ success: true, message: `Updated ${user.name}.`, data: { user } });
};

const deleteUser = async (req: Request, res: Response) => {
  const { name } = await adminService.deleteUser(req.params.id as string, req.user!.id);

  res.json({ success: true, message: `Deleted ${name}.` });
};

// ─── Submissions ────────────────────────────────────────────────────────────

const overrideSubmissionStatus = async (req: Request, res: Response) => {
  const submission = await adminService.overrideSubmissionStatus(req.params.id as string, req.user!.id, req.body);

  const verb = submission.status === SubmissionStatus.PENDING ? "reopened for review" : submission.status.toLowerCase();
  res.json({ success: true, message: `Submission ${verb}.`, data: { submission } });
};

const deleteSubmission = async (req: Request, res: Response) => {
  const { projectName } = await adminService.deleteSubmission(req.params.id as string);

  res.json({ success: true, message: `Deleted “${projectName}”.` });
};

// ─── Feedback ───────────────────────────────────────────────────────────────

const listFeedback = async (req: Request, res: Response) => {
  const query = listFeedbackQuerySchema.parse(req.query);
  const data = await adminService.listFeedback(query);

  res.json({ success: true, data });
};

const deleteFeedback = async (req: Request, res: Response) => {
  await adminService.deleteFeedback(req.params.id as string);

  res.json({ success: true, message: "Comment deleted." });
};

export const adminController = {
  getOverview,
  listUsers,
  createUser,
  updateUser,
  deleteUser,
  overrideSubmissionStatus,
  deleteSubmission,
  listFeedback,
  deleteFeedback,
};
