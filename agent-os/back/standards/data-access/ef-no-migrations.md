---
name: ef-no-migrations
description: Schema managed outside this project — never run dotnet ef migrations add or create Migrations/
metadata:
  type: project
---

# No EF Migrations

The database schema is managed outside this project. Never run `dotnet ef migrations add` or create a `Migrations/` folder.

- Schema changes go through a separate SQL versioning process
- If a SQL script is needed: write it idempotent (`IF EXISTS / IF NOT EXISTS`) and version it
- `dotnet ef database update` is also forbidden in this project
