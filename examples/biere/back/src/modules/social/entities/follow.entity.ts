import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, Unique } from "typeorm";

@Entity({ name: "follows" })
@Unique(["followerId", "followedId"])
@Index(["followedId"])
export class Follow {
  @PrimaryGeneratedColumn()
  readonly id!: number;

  @Column({ type: "integer" })
  followerId!: number;

  @Column({ type: "integer" })
  followedId!: number;

  @CreateDateColumn()
  readonly createdAt!: Date;
}
