---
name: testing-conventions
description: NUnit 4 + NSubstitute + Shouldly, AAA pattern — no Repository tests, no EF In-Memory
metadata:
  type: project
---

# Testing Conventions

Stack: **NUnit 4** + **NSubstitute** (mocks) + **Shouldly** (assertions). Pattern: AAA (Arrange / Act / Assert).

```csharp
[Test]
public async Task GetById_ReturnsDto_WhenFound()
{
    // Arrange
    var repo = Substitute.For<IFooRepository>();
    repo.Get(1).Returns(new FooDto { Id = 1 });
    var sut = new FooService(repo, Substitute.For<ILogger<FooService>>());

    // Act
    var result = await sut.GetById(1);

    // Assert
    result.ShouldNotBeNull();
    result.Id.ShouldBe(1);
}
```

**Hard constraints:**
- No tests on Repositories (no TestContainers / test DB in the pipeline)
- No EF Core In-Memory provider in tests
- Tests go in `MySepteo.Api.Tests/`, organized by subject (`Mappers/`, `Services/`, `Dto/`)
