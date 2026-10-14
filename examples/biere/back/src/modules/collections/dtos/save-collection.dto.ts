import { Transform } from "class-transformer";
import { IsNotEmpty, IsString, MaxLength } from "class-validator";
import { COLLECTION_NAME_MAX_LENGTH } from "@/modules/collections/collections.constants";

const trimString = ({ value }: { value: unknown }): unknown => (typeof value === "string" ? value.trim() : value);

export class SaveCollectionDto {
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(COLLECTION_NAME_MAX_LENGTH)
  readonly name!: string;
}
