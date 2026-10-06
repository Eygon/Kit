---
name: interface-file-structure
description: Interface and implementation in separate files — interface always in Interfaces/ subfolder
metadata:
  type: project
---

# Interface File Structure

Interface and implementation MUST be in separate files. Interface goes in an `Interfaces/` subfolder.

```
MyDomain/
  Interfaces/
    IFooService.cs
    IFooRepository.cs
  FooService.cs
  FooRepository.cs
```

- One interface per file, one implementation per file
- Interface name = `I` + implementation name (e.g. `IUserService` / `UserService`)
- Applies to Services, Repositories, and Factories
