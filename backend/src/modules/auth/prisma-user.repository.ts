import { Prisma, type PrismaClient } from "../../generated/prisma/client";
import { EmailAlreadyExistsError, type NewUser, type User, type UserRepository } from "./user.repository";

/** PostgreSQL-backed users. Email uniqueness is enforced by the database, not by this class. */
export class PrismaUserRepository implements UserRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(data: NewUser): Promise<User> {
    try {
      return await this.prisma.user.create({ data });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new EmailAlreadyExistsError(data.email);
      }
      throw error;
    }
  }

  findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }
}
