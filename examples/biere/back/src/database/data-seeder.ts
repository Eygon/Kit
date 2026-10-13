import { Injectable } from "@nestjs/common";
import type { OnApplicationBootstrap } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { SEED_USERS } from "@/database/seed.constants";
import { User } from "@/modules/users/entities/user.entity";

@Injectable()
export class DataSeeder implements OnApplicationBootstrap {
  constructor(@InjectRepository(User) private readonly users: Repository<User>) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.seed();
  }

  async seed(): Promise<void> {
    if ((await this.users.count()) > 0) {
      return;
    }
    await this.users.insert(SEED_USERS.map((user) => ({ ...user })));
  }
}
