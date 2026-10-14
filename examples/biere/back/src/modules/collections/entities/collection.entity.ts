import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, Unique } from "typeorm";
import { COLLECTION_NAME_MAX_LENGTH } from "@/modules/collections/collections.constants";

@Entity({ name: "collections" })
@Unique(["userId", "name"])
export class Collection {
  @PrimaryGeneratedColumn()
  readonly id!: number;

  @Column({ type: "integer" })
  userId!: number;

  @Column({ type: "varchar", length: COLLECTION_NAME_MAX_LENGTH })
  name!: string;

  @CreateDateColumn()
  readonly createdAt!: Date;
}
