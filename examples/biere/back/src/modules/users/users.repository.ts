import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import type { UserDto } from "@/modules/users/dtos/user.dto";
import { User } from "@/modules/users/entities/user.entity";
import { toUserDto } from "@/modules/users/mappers/user.mapper";

@Injectable()
export class UsersRepository {
  constructor(@InjectRepository(User) private readonly users: Repository<User>) {}

  async findAll(): Promise<UserDto[]> {
    const entities = await this.users.find({ order: { displayName: "ASC", id: "ASC" } });
    return entities.map(toUserDto);
  }

  async findById(id: number): Promise<UserDto | null> {
    const entity = await this.users.findOneBy({ id });
    return entity === null ? null : toUserDto(entity);
  }
}
