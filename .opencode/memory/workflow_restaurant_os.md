# B.L.A.S.T. Workflow — RestaurantOS

**Purpose:** Default operating protocol for this project.

---

## Protocol 0: Initialization

**Before any code is written:**

1. Load skills relevant to project type
2. Set up tracking files in `.opencode/memory/`
3. Halt until schema and plan approved

---

## Phase Sequence (Mandatory Order)

```
PROMPT-0 → Contractual foundation (DONE ✓)
PROMPT-1 → Cimentación (current)
PROMPT-2 → Guest CRM
PROMPT-3 → Reservations & Floor
PROMPT-4 → Kitchen Command (KDS)
PROMPT-5 → Inventory
PROMPT-6 → Staff Ops + POS
PROMPT-7 → Analytics + Dashboard
PROMPT-8 → Marketing Automation
PROMPT-9 → Payments (Stripe) + Multi-location
PROMPT-10 → Deployment + Security + Mobile Prep
```

---

## Data-First Rule

Define schema in `schema.md` BEFORE coding. Input shape → Output shape → confirmed → then code.

---

## Deliverables Check

For each phase, verify:
- lint passes
- tests pass (≥80% coverage on domain logic)
- build succeeds
- smoke test OK
- User approval before proceeding