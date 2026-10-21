import { Request, Response } from "express";
import { authService } from "./auth.service";

// Controllers only speak HTTP: read the request, call the service, send the response.
// Errors thrown by a service reach the global error handler (Express 5 forwards async rejections).

const signup = async (req: Request, res: Response) => {
  const data = await authService.signup(req.body);

  res.status(201).json({
    success: true,
    message: "Account created successfully.",
    data,
  });
};

const login = async (req: Request, res: Response) => {
  const data = await authService.login(req.body);

  res.json({
    success: true,
    message: "Login successful.",
    data,
  });
};

const getMe = async (req: Request, res: Response) => {
  const user = await authService.getMe(req.user!.id);

  res.json({ success: true, data: { user } });
};

export const authController = { signup, login, getMe };
