# Data Model: Freehand drawing on the board

## BoardItem (existing entity, table `BoardItems`) — extended

| Field | Type | Stored | Rule |
|---|---|---|---|
| Type | `BoardItemType` (string, max 16) | yes | gains the member `Freehand` (value 3) |
| Points | text (JSON array of `{ "x": number, "y": number }`), nullable | yes, NEW | non-null only for `Freehand`; 1 to 2000 points; offsets from the item origin (X, Y) |
| StrokeWidth | integer, nullable | yes, NEW | non-null only for `Freehand`; one of 2, 4, 8 |

Unchanged fields keep their rules (X, Y, Width > 0, Height > 0, Color max 32, Content max 2000, ZIndex, UpdatedAt).
Schema follows the EF model through `EnsureCreated` (no migration, standard ef-no-migrations).

## StrokePoint (value, not stored on its own)

- `x`, `y`: numbers in canvas units, relative to the owning item origin.
- Front: model `StrokePoint` / DTO `StrokePointDto` / mapped inside `boardItemMapper`.
- Back: `StrokePointDto` (record) serialized into `BoardItems.Points`.

## Validation (API, 400)

- Freehand without points, or with an empty list.
- Points or StrokeWidth supplied for StickyNote, Shape or Text (create) or on a non-Freehand item (patch).
- More than 2000 points.
- StrokeWidth not in {2, 4, 8}.
