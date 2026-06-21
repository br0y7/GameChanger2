import { type User } from './auth';

export const isAdmin = (user: User) => user.role === 'admin';
