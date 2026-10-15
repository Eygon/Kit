import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Put } from "@nestjs/common";
import { CurrentUserId } from "@/common/security/current-user-id.decorator";
import { BeersService } from "@/modules/beers/beers.service";
import type { CorrectionBoardDto } from "@/modules/beers/dtos/correction-board.dto";
import type { CorrectionDto } from "@/modules/beers/dtos/correction.dto";
import { SaveCorrectionVoteDto } from "@/modules/beers/dtos/save-correction-vote.dto";

@Controller("corrections")
export class CorrectionsController {
  constructor(private readonly beersService: BeersService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  getBoard(@CurrentUserId() userId: number): Promise<CorrectionBoardDto> {
    return this.beersService.getCorrectionBoard(userId);
  }

  @Put(":id/vote")
  @HttpCode(HttpStatus.OK)
  vote(
    @CurrentUserId() userId: number,
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: SaveCorrectionVoteDto,
  ): Promise<CorrectionDto> {
    return this.beersService.voteCorrection(userId, id, dto);
  }
}
