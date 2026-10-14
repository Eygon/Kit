import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, Unique } from "typeorm";

@Entity({ name: "collection_items" })
@Unique(["collectionId", "beerId"])
export class CollectionItem {
  @PrimaryGeneratedColumn()
  readonly id!: number;

  @Column({ type: "integer" })
  collectionId!: number;

  @Column({ type: "integer" })
  beerId!: number;

  @CreateDateColumn()
  readonly addedAt!: Date;
}
