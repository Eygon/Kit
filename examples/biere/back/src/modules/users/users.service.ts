import { Injectable, NotFoundException } from "@nestjs/common";
import type { UserDto } from "@/modules/users/dtos/user.dto";
import { UsersRepository } from "@/modules/users/users.repository";

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  getUsers(): Promise<UserDto[]> {
    return this.usersRepository.findAll();
  }

  isKnownUser(userId: number): Promise<boolean> {
    return this.usersRepository.existsById(userId);
  }

  async getUser(userId: number): Promise<UserDto> {
    const user = await this.usersRepository.findById(userId);
    if (user === null) {
      throw new NotFoundException(`User ${userId} not found.`);
    }
    return user;
  }
}
