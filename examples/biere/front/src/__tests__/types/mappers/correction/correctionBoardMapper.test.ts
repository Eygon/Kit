import type { CorrectionBoardDto } from "@/types/dtos/correction/correctionBoardDto";
import type { CorrectionDto } from "@/types/dtos/correction/correctionDto";
import { CorrectionStatusEnum } from "@/types/enums/correction/correctionStatusEnum";
import { correctionBoardDtoToModel } from "@/types/mappers/correction/correctionBoardMapper";

const dto = (id: number, overrides: Partial<CorrectionDto> = {}): CorrectionDto => ({
  id,
  beerId: 7,
  beerName: "Chimay Rouge",
  characteristic: "ibu",
  currentValue: null,
  proposedValue: 35,
  reason: "",
  proposedBy: 2,
  proposedByName: "Bob",
  createdAt: "2026-10-10T10:00:00.000Z",
  closesAt: "2026-10-17T10:00:00.000Z",
  status: "open",
  resolvedAt: null,
  agreeCount: 2,
  disagreeCount: 1,
  myVote: null,
  isMine: false,
  ...overrides,
});

describe("correctionBoardDtoToModel", () => {
  it("keeps the served order of both lists and the pending count", () => {
    const board: CorrectionBoardDto = {
      open: [dto(9), dto(4), dto(6)],
      recentlyClosed: [dto(3, { status: "accepted", resolvedAt: "2026-10-12T08:00:00.000Z" }), dto(8, { status: "rejected", resolvedAt: "2026-10-11T08:00:00.000Z" })],
      pendingCount: 3,
    };

    const model = correctionBoardDtoToModel(board);

    expect(model.open.map(({ id }) => id)).toEqual([9, 4, 6]);
    expect(model.recentlyClosed.map(({ id, status, resolvedAt }) => [id, status, resolvedAt])).toEqual([
      [3, CorrectionStatusEnum.ACCEPTED, "2026-10-12T08:00:00.000Z"],
      [8, CorrectionStatusEnum.REJECTED, "2026-10-11T08:00:00.000Z"],
    ]);
    expect(model.pendingCount).toBe(3);
  });

  it("maps an empty board to empty lists and a zero count", () => {
    expect(correctionBoardDtoToModel({ open: [], recentlyClosed: [], pendingCount: 0 })).toEqual({
      open: [],
      recentlyClosed: [],
      pendingCount: 0,
    });
  });

  it("drops a correction of an unknown characteristic from either list and keeps the pending count as served", () => {
    const model = correctionBoardDtoToModel({
      open: [dto(1, { characteristic: "colour" }), dto(2)],
      recentlyClosed: [dto(3, { characteristic: "colour", status: "accepted" }), dto(4, { status: "rejected" })],
      pendingCount: 2,
    });

    expect(model.open.map(({ id }) => id)).toEqual([2]);
    expect(model.recentlyClosed.map(({ id }) => id)).toEqual([4]);
    expect(model.pendingCount).toBe(2);
  });

  it("reads an unknown status as open and keeps a null resolution date", () => {
    const model = correctionBoardDtoToModel({ open: [dto(1, { status: "archived" })], recentlyClosed: [], pendingCount: 1 });

    expect(model.open[0].status).toBe(CorrectionStatusEnum.OPEN);
    expect(model.open[0].resolvedAt).toBeNull();
  });
});
