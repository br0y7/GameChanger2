import { z } from 'zod';

export const loginFormSchema = z.object({
	email: z.email('Email is invalid'),
	password: z.string().min(1, 'Password is required'),
	redirectTo: z.string().optional(),
});

export type LoginFormSchema = z.infer<typeof loginFormSchema>;

/** Cold signup intent — invite flows omit this and set role on accept. */
export const signupRoles = ['coach', 'player_follower', 'organizer'] as const;
export type SignupRole = (typeof signupRoles)[number];

export const signupFormSchema = z.object({
	name: z.string().min(2, 'Name must be at least 2 characters'),
	email: z.email('Email is invalid'),
	password: z.string().min(8, 'Password must be at least 8 characters'),
	redirectTo: z.string().optional(),
	role: z.enum(signupRoles).optional(),
});

export type SignupFormSchema = z.infer<typeof signupFormSchema>;
