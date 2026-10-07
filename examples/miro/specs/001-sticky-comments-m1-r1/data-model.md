# Data model: Comment

New entity in the back (`Tableau.DAL/Entities/Comment.cs`), table `Comments`, created by `EnsureCreated` (no migrations, `Tableau.Api/Program.cs:30`).

| Field | Type | Rule | Source |
|---|---|---|---|
| Id | int | PK, identity | new |
| BoardItemId | int | FK -> BoardItems.Id, cascade delete, indexed | `Tableau.DAL/Entities/BoardItem.cs:10` (BoardItem.Id) |
| AuthorId | int | X-User-Id of the poster | `Tableau.Api/Security/HeaderCurrentUserResolver.cs:7-10` |
| Body | string | required, 1-2000 chars after trim (`MaxBodyLength = 2000` constant) | intent |
| CreatedAt | DateTime (UTC) | set on create from TimeProvider | `Tableau.Business/Services/BoardItemService.cs:69` pattern |
| UpdatedAt | DateTime (UTC) | set on create and every PATCH | same |
| IsResolved | bool | default false | intent |

Relations: `BoardItem 1 — n Comment` (navigation `Comment.BoardItem`; no collection added on BoardItem).

Authorization data (no new table): `BoardMember.Role` (`Tableau.DAL/Entities/BoardMember.cs:14`, `BoardRole.Owner = 2`) read through `IBoardService.EnsureAccess` (`Tableau.Business/Services/BoardService.cs:46-65`).

Front model (`src/types/models/comment/comment.ts`): same fields camelCase, `createdAt`/`updatedAt` as ISO strings; author label derived in the UI as `t("pages.boards.ownerName", { id: authorId })` (clarify Q1).
