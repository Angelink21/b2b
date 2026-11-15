# Catalog build report

Generated: 2026-11-15T17:03:43.052Z
Source: **remote**

## Summary

- Models: **303**
- Categories: **8**
- Series entities: **64**
- Families: **139**
- Multi-variant families: **95**
- Discarded empty CSV rows: **0**
- Index JSON: 101050 bytes raw, **6080** bytes gzip

## Что изменилось с прошлой сборки

- Добавлены (0): —
- Удалены (0): —
- Изменены по имени (0): —
- Переименования (по imageKey / image_id): —

## Counts by category

| Category | Count |
|---|---|
| `washers` | 88 |
| `dryers` | 129 |
| `flatwork-ironers` | 36 |
| `laundry-carts` | 15 |
| `ironing-rollers` | 14 |
| `finishing` | 12 |
| `water-recovery` | 7 |
| `washer-dryers` | 2 |

## Empty fields (null count)

| Field | Empty |
|---|---|
| `loadKg` | 84 |
| `volumeL` | 281 |
| `boilerL` | 298 |
| `powerKw` | 23 |
| `boilerPowerKw` | 298 |
| `gFactor` | 213 |
| `spinRpm` | 213 |
| `shaftDiameterMm` | 253 |
| `workingWidthMm` | 253 |
| `workingSpeedMpm` | 253 |
| `heating` | 25 |
| `voltage` | 22 |
| `exhaustMm` | 140 |
| `airflowM3h` | 140 |
| `noiseDb` | 35 |

## Series coverage

- Unique short descriptions: 29
- Unique full descriptions: 52
- Models without short description: 1
- Models without full description: 13

## Needs-review

- Finishing without heating (3): DES-F, DES-F-GC, MINI-DES
- EN category labels from prototype — confirm with customer (DATA_CONTRACT Q3)
- Family/variant suffix heuristic — labels only, meaning unknown (Q2)
- loadKg ranges stored as raw+min/max; meaning not interpreted (Q1)

## Warnings

- P-18/100 M E: decimal comma coerced in «Робоча швидкість (м/хв)»: "2,02" → "2.02"
- P-18/100 M E Nomex: decimal comma coerced in «Робоча швидкість (м/хв)»: "2,02" → "2.02"
- P-18/120 M E: decimal comma coerced in «Робоча швидкість (м/хв)»: "2,02" → "2.02"
- P-18/120 M E Nomex: decimal comma coerced in «Робоча швидкість (м/хв)»: "2,02" → "2.02"

## Multi-variant families (for review)

Total: 95 families.

### `LA-100C TP2` (`la-100c-tp2`)

- LA-100C TP2 HW → `HW`
- LA-100C TP2 S → `S`

### `LA-11 TP2` (`la-11-tp2`)

- LA-11 TP2 E → `E`
- LA-11 TP2 HW → `HW`
- LA-11 TP2 S → `S`

### `LA-120C TP2` (`la-120c-tp2`)

- LA-120C TP2 HW → `HW`
- LA-120C TP2 S → `S`

### `LA-14 TP2` (`la-14-tp2`)

- LA-14 TP2 E → `E`
- LA-14 TP2 HW → `HW`
- LA-14 TP2 S → `S`

### `LA-18 TP2` (`la-18-tp2`)

- LA-18 TP2 E → `E`
- LA-18 TP2 HW → `HW`
- LA-18 TP2 S → `S`

### `LA-22 TP2` (`la-22-tp2`)

- LA-22 TP2 E → `E`
- LA-22 TP2 HW → `HW`
- LA-22 TP2 S → `S`

### `LA-28 TP2` (`la-28-tp2`)

- LA-28 TP2 E → `E`
- LA-28 TP2 HW → `HW`
- LA-28 TP2 S → `S`

### `LA-35C TP2` (`la-35c-tp2`)

- LA-35C TP2 E → `E`
- LA-35C TP2 HW → `HW`
- LA-35C TP2 S → `S`

### `LA-45C TP2` (`la-45c-tp2`)

- LA-45C TP2 E → `E`
- LA-45C TP2 HW → `HW`
- LA-45C TP2 S → `S`

### `LA-60C TP2` (`la-60c-tp2`)

- LA-60C TP2 E → `E`
- LA-60C TP2 HW → `HW`
- LA-60C TP2 S → `S`

### `LA-80C TP2` (`la-80c-tp2`)

- LA-80C TP2 E → `E`
- LA-80C TP2 HW → `HW`
- LA-80C TP2 S → `S`

### `LAP-08 TP2` (`lap-08-tp2`)

- LAP-08 TP2 E V → `E V`
- LAP-08 TP2 E P → `E P`
- LAP-08 TP2 HW V → `HW V`
- LAP-08 TP2 HW P → `HW P`

### `LAP-10 TP2` (`lap-10-tp2`)

- LAP-10 TP2 E V → `E V`
- LAP-10 TP2 E P → `E P`
- LAP-10 TP2 HW V → `HW V`
- LAP-10 TP2 HW P → `HW P`

### `LBS-100 TP2` (`lbs-100-tp2`)

- LBS-100 TP2 E → `E`
- LBS-100 TP2 S → `S`
- LBS-100 TP2 ES → `ES`

### `LBS-27 TP2` (`lbs-27-tp2`)

- LBS-27 TP2 E → `E`
- LBS-27 TP2 S → `S`
- LBS-27 TP2 ES → `ES`

### `LBS-35 TP2` (`lbs-35-tp2`)

- LBS-35 TP2 E → `E`
- LBS-35 TP2 S → `S`
- LBS-35 TP2 ES → `ES`

### `LBS-50 TP2` (`lbs-50-tp2`)

- LBS-50 TP2 E → `E`
- LBS-50 TP2 S → `S`
- LBS-50 TP2 ES → `ES`

### `LBS-70 TP2` (`lbs-70-tp2`)

- LBS-70 TP2 E → `E`
- LBS-70 TP2 S → `S`
- LBS-70 TP2 ES → `ES`

### `LMED-16 TP2` (`lmed-16-tp2`)

- LMED-16 TP2 E → `E`
- LMED-16 TP2 S → `S`
- LMED-16 TP2 ES → `ES`

### `LMED-22 TP2` (`lmed-22-tp2`)

- LMED-22 TP2 E → `E`
- LMED-22 TP2 S → `S`
- LMED-22 TP2 ES → `ES`

### `LN-11 TP2` (`ln-11-tp2`)

- LN-11 TP2 E → `E`
- LN-11 TP2 HW → `HW`
- LN-11 TP2 S → `S`

### `LN-14 TP2` (`ln-14-tp2`)

- LN-14 TP2 E → `E`
- LN-14 TP2 HW → `HW`
- LN-14 TP2 S → `S`

### `LN-18 TP2` (`ln-18-tp2`)

- LN-18 TP2 E → `E`
- LN-18 TP2 HW → `HW`
- LN-18 TP2 S → `S`

### `LN-22 TP2` (`ln-22-tp2`)

- LN-22 TP2 E → `E`
- LN-22 TP2 HW → `HW`
- LN-22 TP2 S → `S`

### `LN-28 TP2` (`ln-28-tp2`)

- LN-28 TP2 E → `E`
- LN-28 TP2 HW → `HW`
- LN-28 TP2 S → `S`

### `LN-35C TP2` (`ln-35c-tp2`)

- LN-35C TP2 E → `E`
- LN-35C TP2 HW → `HW`
- LN-35C TP2 S → `S`

### `LN-45C TP2` (`ln-45c-tp2`)

- LN-45C TP2 E → `E`
- LN-45C TP2 HW → `HW`
- LN-45C TP2 S → `S`

### `LN-60C TP2` (`ln-60c-tp2`)

- LN-60C TP2 E → `E`
- LN-60C TP2 HW → `HW`
- LN-60C TP2 S → `S`

### `LN-80C TP2` (`ln-80c-tp2`)

- LN-80C TP2 E → `E`
- LN-80C TP2 HW → `HW`
- LN-80C TP2 S → `S`

### `P-18/100 M` (`p-18-100-m`)

- P-18/100 M E → `E`
- P-18/100 M E Nomex → `E Nomex`

### `P-18/120 M` (`p-18-120-m`)

- P-18/120 M E → `E`
- P-18/120 M E Nomex → `E Nomex`

### `PI-25/100 M` (`pi-25-100-m`)

- PI-25/100 M E → `E`
- PI-25/100 M E NOMEX → `E NOMEX`

### `PI-25/120 M` (`pi-25-120-m`)

- PI-25/120 M E → `E`
- PI-25/120 M E NOMEX → `E NOMEX`

### `PI-25/140 M` (`pi-25-140-m`)

- PI-25/140 M E → `E`
- PI-25/140 M E NOMEX → `E NOMEX`

### `PI-25/200 M` (`pi-25-200-m`)

- PI-25/200 M E → `E`
- PI-25/200 M E NOMEX → `E NOMEX`

### `PS-35/140 M` (`ps-35-140-m`)

- PS-35/140 M E → `E`
- PS-35/140 M G → `G`

### `PS-35/160 M` (`ps-35-160-m`)

- PS-35/160 M E → `E`
- PS-35/160 M G → `G`

### `PS-35/200 M` (`ps-35-200-m`)

- PS-35/200 M E → `E`
- PS-35/200 M G → `G`

### `PS-35/200 M PLUS` (`ps-35-200-m-plus`)

- PS-35/200 M PLUS E → `E`
- PS-35/200 M PLUS G R → `G R`

### `PS-35/260 M PLUS` (`ps-35-260-m-plus`)

- PS-35/260 M PLUS E → `E`
- PS-35/260 M PLUS G R → `G R`

### `PS-35/330 M PLUS` (`ps-35-330-m-plus`)

- PS-35/330 M PLUS E → `E`
- PS-35/330 M PLUS G R → `G R`

### `PSP-50/200 TP2` (`psp-50-200-tp2`)

- PSP-50/200 TP2 E → `E`
- PSP-50/200 TP2 G → `G`
- PSP-50/200 TP2 G R → `G R`
- PSP-50/200 TP2 S → `S`

### `PSP-50/260 TP2` (`psp-50-260-tp2`)

- PSP-50/260 TP2 E → `E`
- PSP-50/260 TP2 G → `G`
- PSP-50/260 TP2 G R → `G R`
- PSP-50/260 TP2 S → `S`

### `PSP-50/330 TP2` (`psp-50-330-tp2`)

- PSP-50/330 TP2 E → `E`
- PSP-50/330 TP2 G → `G`
- PSP-50/330 TP2 G R → `G R`
- PSP-50/330 TP2 S → `S`

### `PSP-65/200 TP2` (`psp-65-200-tp2`)

- PSP-65/200 TP2 E → `E`
- PSP-65/200 TP2 G R → `G R`
- PSP-65/200 TP2 S → `S`

### `PSP-65/260 TP2` (`psp-65-260-tp2`)

- PSP-65/260 TP2 E → `E`
- PSP-65/260 TP2 G R → `G R`
- PSP-65/260 TP2 S → `S`

### `PSP-65/330 TP2` (`psp-65-330-tp2`)

- PSP-65/330 TP2 E → `E`
- PSP-65/330 TP2 G R → `G R`
- PSP-65/330 TP2 S → `S`

### `SC-11 M` (`sc-11-m`)

- SC-11 M E → `E`
- SC-11 M G → `G`

### `SC-14 M` (`sc-14-m`)

- SC-14 M E → `E`
- SC-14 M G → `G`

### `SC-18 M` (`sc-18-m`)

- SC-18 M E → `E`
- SC-18 M G → `G`

### `SC-2-11 M` (`sc-2-11-m`)

- SC-2-11 M E XP → `E XP`
- SC-2-11 M G XP → `G XP`

### `SC-2-14 M` (`sc-2-14-m`)

- SC-2-14 M E XP → `E XP`
- SC-2-14 M G XP → `G XP`

### `SC-2-18 M` (`sc-2-18-m`)

- SC-2-18 M E XP → `E XP`
- SC-2-18 M G XP → `G XP`

### `SC-22 M` (`sc-22-m`)

- SC-22 M E → `E`
- SC-22 M G → `G`

### `SC-28 M` (`sc-28-m`)

- SC-28 M E → `E`
- SC-28 M G → `G`

### `SC-35 M` (`sc-35-m`)

- SC-35 M E → `E`
- SC-35 M G → `G`

### `SCP-10 M` (`scp-10-m`)

- SCP-10 M E → `E`
- SCP-10 M G → `G`

### `SLN-18 TP2` (`sln-18-tp2`)

- SLN-18 TP2 E → `E`
- SLN-18 TP2 G → `G`

### `SR-11 M` (`sr-11-m`)

- SR-11 M E → `E`
- SR-11 M G → `G`
- SR-11 M S → `S`

### `SR-11 TP2` (`sr-11-tp2`)

- SR-11 TP2 E → `E`
- SR-11 TP2 G → `G`
- SR-11 TP2 S → `S`

### `SR-11 TP2 PLUS` (`sr-11-tp2-plus`)

- SR-11 TP2 PLUS E → `E`
- SR-11 TP2 PLUS G → `G`
- SR-11 TP2 PLUS S → `S`
- SR-11 TP2 PLUS HPi → `HPi`

### `SR-14 M` (`sr-14-m`)

- SR-14 M E → `E`
- SR-14 M G → `G`
- SR-14 M S → `S`

### `SR-14 TP2` (`sr-14-tp2`)

- SR-14 TP2 E → `E`
- SR-14 TP2 G → `G`
- SR-14 TP2 S → `S`

### `SR-14 TP2 PLUS` (`sr-14-tp2-plus`)

- SR-14 TP2 PLUS E → `E`
- SR-14 TP2 PLUS G → `G`
- SR-14 TP2 PLUS S → `S`
- SR-14 TP2 PLUS HPi → `HPi`

### `SR-18 M` (`sr-18-m`)

- SR-18 M E → `E`
- SR-18 M G → `G`
- SR-18 M S → `S`

### `SR-18 TP2` (`sr-18-tp2`)

- SR-18 TP2 E → `E`
- SR-18 TP2 G → `G`
- SR-18 TP2 S → `S`

### `SR-18 TP2 PLUS` (`sr-18-tp2-plus`)

- SR-18 TP2 PLUS E → `E`
- SR-18 TP2 PLUS G → `G`
- SR-18 TP2 PLUS S → `S`
- SR-18 TP2 PLUS HPi → `HPi`

### `SR-2-11 M` (`sr-2-11-m`)

- SR-2-11 M E XP → `E XP`
- SR-2-11 M G XP → `G XP`

### `SR-2-11 TP2` (`sr-2-11-tp2`)

- SR-2-11 TP2 E XP → `E XP`
- SR-2-11 TP2 G XP → `G XP`

### `SR-2-14 M` (`sr-2-14-m`)

- SR-2-14 M E XP → `E XP`
- SR-2-14 M G XP → `G XP`

### `SR-2-14 TP2` (`sr-2-14-tp2`)

- SR-2-14 TP2 E XP → `E XP`
- SR-2-14 TP2 G XP → `G XP`

### `SR-2-18 M` (`sr-2-18-m`)

- SR-2-18 M E XP → `E XP`
- SR-2-18 M G XP → `G XP`

### `SR-2-18 TP2` (`sr-2-18-tp2`)

- SR-2-18 TP2 E XP → `E XP`
- SR-2-18 TP2 G XP → `G XP`

### `SR-22 M` (`sr-22-m`)

- SR-22 M E → `E`
- SR-22 M G → `G`
- SR-22 M S → `S`

### `SR-22 TP2` (`sr-22-tp2`)

- SR-22 TP2 E → `E`
- SR-22 TP2 G → `G`
- SR-22 TP2 S → `S`

### `SR-22 TP2 PLUS` (`sr-22-tp2-plus`)

- SR-22 TP2 PLUS E → `E`
- SR-22 TP2 PLUS G → `G`
- SR-22 TP2 PLUS S → `S`
- SR-22 TP2 PLUS HPi → `HPi`

### `SR-28 M` (`sr-28-m`)

- SR-28 M E → `E`
- SR-28 M G → `G`
- SR-28 M S → `S`

### `SR-28 TP2` (`sr-28-tp2`)

- SR-28 TP2 E → `E`
- SR-28 TP2 G → `G`
- SR-28 TP2 S → `S`

### `SR-28 TP2 PLUS` (`sr-28-tp2-plus`)

- SR-28 TP2 PLUS E → `E`
- SR-28 TP2 PLUS G → `G`
- SR-28 TP2 PLUS S → `S`

### `SR-35 M` (`sr-35-m`)

- SR-35 M E → `E`
- SR-35 M G → `G`
- SR-35 M S → `S`

### `SR-35 TP2` (`sr-35-tp2`)

- SR-35 TP2 E → `E`
- SR-35 TP2 G → `G`
- SR-35 TP2 S → `S`

### `SR-35 TP2 PLUS` (`sr-35-tp2-plus`)

- SR-35 TP2 PLUS E → `E`
- SR-35 TP2 PLUS G → `G`
- SR-35 TP2 PLUS S → `S`

### `SR-45 M` (`sr-45-m`)

- SR-45 M E → `E`
- SR-45 M G → `G`
- SR-45 M S → `S`

### `SR-45 TP2` (`sr-45-tp2`)

- SR-45 TP2 E → `E`
- SR-45 TP2 G → `G`
- SR-45 TP2 S → `S`

### `SR-45 TP2 PLUS` (`sr-45-tp2-plus`)

- SR-45 TP2 PLUS E → `E`
- SR-45 TP2 PLUS G → `G`
- SR-45 TP2 PLUS S → `S`

### `SR-60 M` (`sr-60-m`)

- SR-60 M E → `E`
- SR-60 M G → `G`
- SR-60 M S → `S`

### `SR-60 TP2` (`sr-60-tp2`)

- SR-60 TP2 E → `E`
- SR-60 TP2 G → `G`
- SR-60 TP2 S → `S`

### `SR-60 TP2 PLUS` (`sr-60-tp2-plus`)

- SR-60 TP2 PLUS E → `E`
- SR-60 TP2 PLUS G → `G`
- SR-60 TP2 PLUS S → `S`

### `SR-80 M` (`sr-80-m`)

- SR-80 M E → `E`
- SR-80 M G → `G`
- SR-80 M S → `S`

### `SR-80 TP2` (`sr-80-tp2`)

- SR-80 TP2 E → `E`
- SR-80 TP2 G → `G`
- SR-80 TP2 S → `S`

### `SR-80 TP2 PLUS` (`sr-80-tp2-plus`)

- SR-80 TP2 PLUS E → `E`
- SR-80 TP2 PLUS G → `G`
- SR-80 TP2 PLUS S → `S`

### `SRP-08 M` (`srp-08-m`)

- SRP-08 M E → `E`
- SRP-08 M G → `G`

### `SRP-08 TP2` (`srp-08-tp2`)

- SRP-08 TP2 E → `E`
- SRP-08 TP2 G → `G`

### `SRP-10 M` (`srp-10-m`)

- SRP-10 M E → `E`
- SRP-10 M G → `G`

### `SRP-10 TP2` (`srp-10-tp2`)

- SRP-10 TP2 E → `E`
- SRP-10 TP2 G → `G`

