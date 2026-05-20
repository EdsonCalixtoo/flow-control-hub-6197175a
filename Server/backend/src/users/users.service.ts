import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { users, Prisma } from '../../generated/prisma';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findByEmail(email: string): Promise<users | null> {
    return this.prisma.users.findUnique({
      where: { email },
    });
  }

  async findById(id: string): Promise<users | null> {
    return this.prisma.users.findUnique({
      where: { id },
    });
  }

  async create(data: Prisma.usersCreateInput): Promise<users> {
    // Check if user already exists
    if (data.email) {
      const existingUser = await this.findByEmail(data.email);
      if (existingUser) {
        throw new ConflictException('Um usuário com este e-mail já existe.');
      }
    }

    // Hash password if provided
    let hashedPassword = data.password;
    if (data.password) {
      const salt = await bcrypt.genSalt(10);
      hashedPassword = await bcrypt.hash(data.password, salt);
    }

    return this.prisma.users.create({
      data: {
        ...data,
        password: hashedPassword,
      },
    });
  }

  async updatePassword(id: string, newPassword: string): Promise<users> {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    return this.prisma.users.update({
      where: { id },
      data: {
        password: hashedPassword,
      },
    });
  }

  async findAll(): Promise<users[]> {
    return this.prisma.users.findMany();
  }
}
