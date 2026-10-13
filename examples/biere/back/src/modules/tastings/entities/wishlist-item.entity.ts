import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, Unique } from "typeorm";

@Entity({ name: "wishlist_items" })
@Unique(["userId", "beerId"])
export class WishlistItem {
  @PrimaryGeneratedColumn()
  readonly id!: number;

  @Column({ type: "integer" })
  userId!: number;

  @Column({ type: "integer" })
  beerId!: number;

  @CreateDateColumn()
  readonly addedAt!: Date;
}
