import { Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, StreamableFile } from "@nestjs/common";
import { Public } from "@/common/security/public.decorator";
import { PokedexService } from "@/modules/pokedex/pokedex.service";

@Public()
@Controller("photos")
export class PhotosController {
  constructor(private readonly pokedexService: PokedexService) {}

  @Get(":id")
  @HttpCode(HttpStatus.OK)
  async getOne(@Param("id", new ParseUUIDPipe({ version: "4" })) id: string): Promise<StreamableFile> {
    const photo = await this.pokedexService.getPhoto(id);
    return new StreamableFile(photo.content, { type: photo.contentType });
  }
}
