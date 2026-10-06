---
name: ef-entity-type-configuration
description: All EF mapping in IEntityTypeConfiguration<T> — never [Table]/[Column]/[Key]/[ForeignKey]; wire via attribute for DbSet entities, ApplyConfiguration for non-DbSet parents
metadata:
  type: project
---

# EF Entity Type Configuration

All EF mapping (table name, column names, keys, relationships, value converters) goes in an `IEntityTypeConfiguration<T>` class. **Never** use `[Table]`, `[Column]`, `[Key]`, or `[ForeignKey]` data annotations on entities, and **never** scatter `modelBuilder.Entity<T>().Property(...)` mapping calls across `OnModelCreating`.

```csharp
// Entity — no mapping attributes, just the config wiring attribute
[EntityTypeConfiguration(typeof(FooConfiguration))]
public sealed class Foo
{
    public int Id { get; set; }
    public string Label { get; set; } = string.Empty;
}

// Configuration — all mapping here (internal sealed)
internal sealed class FooConfiguration : IEntityTypeConfiguration<Foo>
{
    public void Configure(EntityTypeBuilder<Foo> builder)
    {
        _ = builder.ToTable("T_Foo");
        _ = builder.HasKey(x => x.Id);
        _ = builder.Property(x => x.Id).HasColumnName("FooLngId");
        _ = builder.Property(x => x.Label).HasColumnName("FooStrLibelle").HasMaxLength(255);
    }
}
```

## Wiring the configuration (source of truth — PR review)

- **Entity exposed via a `DbSet<>`** → wire it with the `[EntityTypeConfiguration(typeof(XxxConfiguration))]` **attribute on the entity**. EF discovers it automatically through the DbSet. Do **not** also call `modelBuilder.ApplyConfiguration(...)` for it — that is duplication.
- **Parent / related entity NOT exposed as a `DbSet<>`** (reachable only through a navigation) → the attribute is not picked up, so register it explicitly in `OnModelCreating` with `modelBuilder.ApplyConfiguration(new XxxConfiguration())`.

```csharp
protected override void OnModelCreating(ModelBuilder modelBuilder)
{
    // Only for parent entities that have NO DbSet of their own:
    _ = modelBuilder.ApplyConfiguration(new SomeParentWithoutDbSetConfiguration());
}
```

- Value converters, **discriminators (TPH)**, and relationships belong in the entity's `Configure` method too — not as loose `modelBuilder.Entity<T>()…HasConversion(...)` / `…HasDiscriminator(...)` lines in `OnModelCreating`.
- Configuration class is `internal sealed`, placed in `MySepteo.Api.DAL/EntityTypeConfigurations/[Domain]EntityTypeConfigurations/`.

## Known deviations (the norm remains `IEntityTypeConfiguration<T>`)

- ~47 entities still carry `[Table]` / `[Column]` / `[Key]` / `[ForeignKey]` data annotations instead of a configuration class (e.g. `AccountSalesData`, `Document`, `TraceApplicationOperation`).
- Some contexts (e.g. `TicketContext`) still configure value converters and discriminators in `OnModelCreating` ([[tph-discriminators]]).

`IEntityTypeConfiguration<T>` is the standard for all new entities. When you **modify** one of the deviating files, propose to the author uniformizing it: move the annotations / loose `OnModelCreating` mapping into a config class and wire it via the attribute (DbSet entity) or `ApplyConfiguration` (non-DbSet parent). Never add a new annotation-mapped entity.
