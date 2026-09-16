# DM Connect & Conversion Tracker — audit specification

Source inputs used for the 2026-08-13 tracker:
- `Calls_2026-08-13.csv` is the source of truth for call rows, reps, dates, purposes, dispositions, record IDs, and notes.
- `Conversion Detection Audit for the DTT Dashboard` is the source of truth for classifier design.
- Supplied screenshots are presentation references for the summary and rep drill-down.

## KPI rules

- Evaluate only `Purpose = Decision Maker Call`.
- Non-connect dispositions: `Left Voicemail`, `No Answer`, `Left Message`, `Incorrect Phone Number`, blank/unknown.
- `Connect Rate = Connected DM Calls / Total DM Calls`.
- Qualifying products: Sponsored Listing/ads and Promotions only. Smart Campaign-only records do not count.
- Count at call level, not units.
- `Conversion Rate = Converted DM Calls / Connected DM Calls`.

## Status model

- `converted`: the note clearly proves a qualifying Sponsored Listing/ads or Promotions product was sold, activated, or set up during the call itself.
- `committed`: explicit agreement/intention or future/pending activation, but same-call activation is not proven.
- `ambiguous`: qualifying evidence exists but is insufficient to prove a same-call conversion. Mixed evidence defaults here rather than converted.
- `not_conversion`: no qualifying sale, existing-active only, declined/deactivated, unrelated product, or Smart-only.

## Section-aware evidence

Parse structured notes when present: Reason of Call, Key Points/Concerns, Actions Taken, Next Steps, Follow Up.

- `Actions Taken` plus product-local completed-action language is strong conversion evidence.
- `Next Steps` and `Follow Up` cannot independently establish conversion.
- Reason/Key Points are contextual and do not establish conversion from product words alone.
- Completed action must relate to the qualifying product in the same clause / nearby text.
- Existing-active language does not count as a new sale.
- Future/pending/link/callback language does not count as converted.

## Audit fields

Every connected DM call drill-down row preserves:
- Record ID
- Date
- Rep Name
- Purpose
- Disposition
- Full Note
- Extracted Note Sections
- Product Matched
- Status
- Reason
- Evidence

The summary includes Total DM Calls, Connected DM Calls, Connect Rate, Converted DM Calls, Committed, Ambiguous, Conversion Rate, and a View calls drill-down link.

## Conservative QA policy

Never infer conversion from product terminology alone. Normalize only recurring corpus-specific typos when context still supports the classification. If same-call completion is not clearly supported, use `ambiguous` or `committed`, never `converted`.
