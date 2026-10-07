# Data Model: Board sharing

## User (new, back - created by T001)

| Field | Type | Rule |
|---|---|---|
| Id | int | primary key, seeded 1, 2, 3 (`DataSeeder.AliceId/BobId/CarolId`) |
| DisplayName | string | required, max length `User.MaxDisplayNameLength` = 100 |

Table `Users`, configured in `UserConfiguration` (`[EntityTypeConfiguration]` on the entity), exposed as `TableauContext.Users`. Created by `EnsureCreated` (no migration, SQLite in memory). No foreign key to `BoardMembers` (kept as today: `BoardMembers.UserId` is a plain column).

## BoardMember (existing, back - unchanged)

`Tableau.DAL/Entities/BoardMember.cs`: BoardId, UserId (composite key), Role (`BoardRole` stored as string, max 16). Exactly one `Owner` per board (created with the board, `BoardRepository.Add`). The feature only adds or updates rows with role Viewer or Editor.

## Front models (new)

- `BoardMember` model: `userId: number`, `displayName: string`, `role: BoardRoleEnum` (DTO `BoardMemberDto`, all fields optional/nullable, mapper defaults 0 / "" / `BoardRoleEnum.VIEWER`).
- `User` model: `id: number`, `displayName: string` (DTO `UserDto`, mapper defaults 0 / "").
- `BoardRoleEnum`: `VIEWER = "Viewer"`, `EDITOR = "Editor"`, `OWNER = "Owner"` (backend contract values verbatim), with `BOARD_ROLE_LABEL_KEYS: Record<BoardRoleEnum, string>` and `ASSIGNABLE_BOARD_ROLES` in the enum file.
- Write DTOs: `AddBoardMemberDto { userId: number; role: BoardRoleEnum }`, `UpdateBoardMemberDto { role: BoardRoleEnum }`.
