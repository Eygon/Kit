import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";
import { PhotoContentTypeEnum } from "@/modules/tastings/enums/photo-content-type.enum";

@Entity({ name: "photos" })
export class Photo {
  @PrimaryGeneratedColumn("uuid")
  readonly id!: string;

  @Column({ type: "simple-enum", enum: PhotoContentTypeEnum })
  contentType!: PhotoContentTypeEnum;

  @Column({ type: "blob" })
  content!: Buffer;
}
