# Content slots waiting on client data

Fill these in `src/config/site.ts` (or dedicated content files) before publishing company claims. Empty values stay hidden on the site.

## Launch blockers

| Item | Status | Notes |
|------|--------|-------|
| Privacy / legal policy | **blocker** | Final lawyer-approved text for `/privacy`. Current page only describes form fields and purpose (no retention, legal bases, or rights claims). |

## Contacts (`siteConfig`)

| Field     | Status | Notes                                      |
|-----------|--------|--------------------------------------------|
| `phone`   | empty  | Shown in footer + contacts + JSON-LD       |
| `email`   | empty  | Shown in footer + contacts + JSON-LD       |
| `address` | empty  | Cleared — not confirmed by owner; publish only after confirmation |
| `hours`   | empty  | Contacts / service hours — wait for client |
| `logo.src`| empty  | Text brand until logo assets are provided  |

## Category intros (client copy)

Category pages currently show **data-only** leads: model count and the relevant numeric range from the catalog (kg / width / volume / power). Optional short marketing intros from the client can replace or follow that line later — without inventing claims.

| Category slug | Status | Notes |
|---------------|--------|-------|
| `washers` | empty | Client short intro (optional) |
| `dryers` | empty | Client short intro (optional) |
| `flatwork-ironers` | empty | Client short intro (optional) |
| `laundry-carts` | empty | Client short intro (optional) |
| `ironing-rollers` | empty | Client short intro (optional) |
| `finishing` | empty | Client short intro (optional) |
| `water-recovery` | empty | Client short intro (optional) |
| `washer-dryers` | empty | Client short intro (optional) |

## About page

Corporate sections (expertise, warehouse, standards, quote CTA) are live. Optional slots below stay hidden until client content exists.

| Slot           | Status | Notes                                      |
|----------------|--------|--------------------------------------------|
| History        | empty  | Company timeline / founding story          |
| Team           | empty  | People / roles                             |
| Certificates   | empty  | Only real certificates with source docs    |

## Service page

| Slot              | Status | Notes                                   |
|-------------------|--------|-----------------------------------------|
| Warehouse address | empty  | Wait for owner confirmation |
| Service phone     | empty  | Client will add later; card hides until set |
| Service email     | empty  | Hide until set                          |
| Warranty terms    | empty  | Do not invent coverage or duration      |
| Spare parts lead times | empty | Channels, lead times               |
| Service hours / SLA | empty | Response times — no invented SLA      |
