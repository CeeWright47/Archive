# Archive — Backlog

## In progress

| Item | Notes |
|---|---|
| Multi-profile style analysis | Replace single-identity assessment with 2–4 ranked profiles. Drop `blind_spot`, add `direction` + `activity` per profile, `shared_pieces` at top level. Hard rules against cross-lane criticism. |
| Date range chip + inline calendar | Replace heavy date control with compact chip showing active range; popover with presets and clear. |
| Category pills + search in piece picker | Filter ~200 items by category with search. Selected pieces pin to top, filter resets to All on select. |

## Next up

| Item | Notes |
|---|---|
| Vision auto-matching for fit photos | Match photographed outfits against catalogued closet items. Deferred from the fit capture build. |
| "Add to closet" inline from a fit | When a fit contains an unmatched garment, offer to catalog it — turns fit logging into passive closet completion. |
| Profile tags on fit cards | Once analysis returns profiles, tag each fit and allow filtering the grid by profile. |
| Rotation gaps | Surface closet items that have never appeared in any fit. |

## Technical debt / decisions

| Item | Notes |
|---|---|
| Route outfits through the storage adapter | Don't write to localStorage directly. One persistence path, local-only at the adapter level. |
| ~~IndexedDB for image blobs~~ | Superseded (Oct 2026): photos live in the private `archive-images` Storage bucket; rows store paths. |
| UUIDs for outfit ids | Not array indices or timestamps — needs to survive the move to a server DB. |
| Nullable `userId` on outfits | Add now to avoid migrating records when auth lands. |
| `fp` staleness includes outfit ids | So new fit photos trigger a re-analysis. |

## Future — multi-user

| Item | Notes |
|---|---|
| Real DB + logins | Expansion beyond personal local-only app. |
| Self-photo privacy model | **Decided (Oct 2026):** outfit photos upload to the private `archive-images` bucket under the owner's folder (RLS by `auth.uid()`), are read only through short-lived signed URLs, and are deleted from Storage when the outfit is deleted. Still open: account-deletion cleanup of the user's whole folder. |
| Profile re-ranking over time | Whether lane rank shifts silently as fits accumulate, or surfaces as a prompt to reorder. |

## Ideas — unscheduled

| Item | Notes |
|---|---|
| Occasion-driven suggestions | Use the `occasion` field on fits to recommend outfits for a given context. |
| Underbuilt lane prompts | A profile with anchors but too few supporting pieces to assemble fits — feed into Gaps. |
| Brand field on pieces | Nullable column, editable in Edit details, catalog prompt reads it from labels when visible. Small; unlocks store matching and affiliate suggestions. |
| Piece tagging on outfit photos | Tap to pin a closet piece to a spot on the photo. Builds on existing linked pieces. |
| Discover page | Browse other users' shared My Style photos, add to your own inspo. Requires per-photo opt-in sharing, reporting, blocking, and moderation (App Store UGC rules). After a few hundred active users. |
| User search and friending | Pairs with Discover; same prerequisites. |
| Calendar-aware suggested fits | See NEXT_PASS.md 4.1; the occupation version ships first. |
