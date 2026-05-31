import type { User } from "@prisma/client";
import { prisma } from "../lib/prisma.js";

export interface CreateUserRepositoryInput {
	email: string;
	passwordHash: string;
}

export interface UsersRepository {
	findByEmail(email: string): Promise<User | null>;
	findById(id: number): Promise<User | null>;
	create(data: CreateUserRepositoryInput): Promise<User>;
}

export const usersRepository: UsersRepository = {
	findByEmail(email: string) {
		return prisma.user.findUnique({ where: { email } });
	},
	findById(id: number) {
		return prisma.user.findUnique({ where: { id } });
	},
	create(data: CreateUserRepositoryInput) {
		return prisma.user.create({ data });
	},
};
