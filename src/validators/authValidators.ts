import { z } from "zod";

export const loginBodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  recaptchaToken: z.string().min(1).optional(),
  /** Post-login path for user portal only; never forces /admin. */
  next: z.string().optional(),
});

export const forgotPasswordBodySchema = z.object({
  email: z.string().email(),
  recaptchaToken: z.string().min(1),
});

export const resetPasswordBodySchema = z.object({
  token: z.string().min(10),
  newPassword: z.string().min(8).max(72),
  recaptchaToken: z.string().min(1).optional(),
});

export const otpSendBodySchema = z.object({
  email: z.string().email(),
  recaptchaToken: z.string().min(1).optional(),
});

export const otpVerifyBodySchema = z.object({
  email: z.string().email(),
  code: z.string().regex(/^\d{6}$/),
  recaptchaToken: z.string().min(1).optional(),
  next: z.string().optional(),
});

