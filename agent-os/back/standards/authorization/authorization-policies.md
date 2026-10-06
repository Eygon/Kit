---
name: authorization-policies
description: Policy names are const in Constants.Policies (Domain.Action[.Scope]); add to Policies.Roles for auto-registration via AddApplicationPolicies; routes use [Authorize(Policy = Policies.X)]
metadata:
  type: project
---

# Authorization Policies

Authorization policies are named constants, registered from one list, and referenced by constant on every route.

```csharp
// Constants/Policies.cs
public const string TicketUpdateState = "Ticket.Update.State";   // Domain.Action[.Scope]
public static readonly IReadOnlyCollection<string> Roles = [ TicketCreate, TicketUpdateState, /* … */ ];

// AddApplicationPolicies() registers a role policy per entry in Policies.Roles
Policies.Roles.ForEach(role => builder.AddRolePolicy(role));

// Route
[Authorize(Policy = Policies.TicketUpdateState)]
```

- Name format: `Domain.Action[.Scope]` (e.g. `Ticket.Update.State`, `SupportRequest.Read`).
- To add a policy: add the `const` **and** add it to `Policies.Roles`, so `AddApplicationPolicies` registers it.
- Reference policies by the constant, never a string literal.
- How a policy is satisfied → [[policy-evaluation]].

See [[controller-patterns]], [[policy-evaluation]].
