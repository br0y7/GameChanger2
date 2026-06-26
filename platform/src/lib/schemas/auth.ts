import { z } from 'zod';

export const loginFormSchema = z.object({
	email: z.email('Email is invalid'),
	password: z.string().min(1, 'Password is required'),
});

export type LoginFormSchema = z.infer<typeof loginFormSchema>;

export const signupFormSchema = z.object({
	name: z.string().min(2, 'Name must be at least 2 characters'),
	email: z.email('Email is invalid'),
	password: z.string().min(8, 'Password must be at least 8 characters'),
});

export type SignupFormSchema = z.infer<typeof signupFormSchema>;
