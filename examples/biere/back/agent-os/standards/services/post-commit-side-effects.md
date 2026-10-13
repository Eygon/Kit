---
name: post-commit-side-effects
description: A non-database side effect after a successful write (notification, external call, file cleanup) is best-effort — run after the repository call, try/catch + Logger.error, never fail or roll back the persisted write
metadata:
  type: project
---

# Post-Commit Side-Effects

```ts
import { Injectable, Logger } from "@nestjs/common";

@Injectable()
export class BeerNotifier {
  private readonly logger = new Logger(BeerNotifier.name);

  async beerCreated(beerId: number): Promise<void> {
    this.logger.log(`Beer ${beerId} announced.`);
  }
}

@Injectable()
export class BeerPublisher {
  private readonly logger = new Logger(BeerPublisher.name);

  constructor(private readonly notifier: BeerNotifier) {}

  async publish(beerId: number): Promise<void> {
    try {
      await this.notifier.beerCreated(beerId);
    } catch (error) {
      this.logger.error(`Notification failed for beer ${beerId}.`, error instanceof Error ? error.stack : String(error));
    }
  }
}
```

- Run the side effect **after** the write returned (outside any transaction,
  [[transactions]]).
- Catch, log with the ids involved, and still return success: the client's write
  happened.
- Never swallow errors of the write itself — only of the best-effort step.
- A heavier side-effect flow gets its own injectable (`BeerPublisher`) so the service
  stays readable and the failure path is unit-tested.
