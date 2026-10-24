# Archive — Next Pass

Ranked by effort, smallest first. Work top to bottom; each tier is a
natural checkpoint for a build and a TestFlight push. Read
BACKLOG.md, PROFILE_SPEC.md, and ASSESSMENT_SPEC.md before starting.
Show the plan before writing code on anything in Tier 3 or 4.

---

## Tier 1 — small (an afternoon total)

### 1.1 Backlog additions
Add to BACKLOG.md under a new "Ideas — unscheduled" section, in this
order:
- Brand field on pieces — nullable column, editable in Edit details,
  catalog prompt reads it from labels when visible. Small; unlocks
  store matching and affiliate suggestions.
- Piece tagging on outfit photos — tap to pin a closet piece to a
  spot on the photo. Builds on existing linked pieces.
- Discover page — browse other users' shared My Style photos, add to
  your own inspo. Requires per-photo opt-in sharing, reporting,
  blocking, and moderation (App Store UGC rules). After a few hundred
  active users.
- User search and friending — pairs with Discover; same
  prerequisites.
- Calendar-aware suggested fits — see 4.1 below; the occupation
  version ships first.

### 1.2 No empty-state flash on Wardrobe
Don't render "No pieces yet" until the initial pieces fetch has
resolved. Show a skeleton grid (6 placeholder cards) while loading.
Only show the empty state when the fetch completes with zero rows.
Apply the same rule to Outfits, Lookbook, and Insights.

### 1.3 Tap active tab to reset
Tapping the tab icon for the screen you're already on resets that
screen: scroll to top, clear search and filters, collapse any
expanded sections. Use expo-router's tabPress listener with
`e.preventDefault()` only when already focused, then call the
screen's reset handler via a ref or small event bus.

### 1.4 Sort by date and rating — Lookbook
Both Inspiration and My Style grids get a sort control (same sheet
pattern as Wardrobe): Newest, Oldest, Highest rated, Lowest rated.
Ratings come from the 202610120001_add_ratings migration. Unrated
items sort last on rating sorts. Persist the choice per grid.

### 1.5 Sort by rating — Wardrobe
Add Highest rated / Lowest rated to the Wardrobe sort sheet if
pieces carry a rating. If only fits and outfits are rated, skip this
and say so.

### 1.6 Auth error messages
Map Supabase auth errors to readable copy on sign-up and sign-in:
- email rate limit exceeded → "Too many sign-ups right now. Try
  again in a few minutes, or use Sign in with Apple."
- invalid credentials → "That email and password don't match."
- user already registered → "An account with this email already
  exists. Sign in instead."
- weak password → state the requirement.
Generic fallback: "Something went wrong — try again." Log the raw
error.

---

## Tier 2 — medium (a day each)

### 2.1 Fix the Wardrobe header scroll defect
Repro: scroll down, toggle a category chip, scroll back up — grid
items slide up behind the search field and chips.
- Clamp the collapsing header's translateY between -headerHeight
  and 0 with diffClamp on the native thread (Reanimated).
- Ignore scroll deltas while contentOffset.y < 0 or past max offset
  (iOS bounce).
- At contentOffset.y <= 0, force the header fully visible.
- On scroll end, snap fully shown or fully hidden — never rest
  partway.
- Toggling a chip must reset scroll to top AND reset the header
  offset to 0 together. The bug is almost certainly the chip toggle
  resetting one but not the other.
- Grid top padding = app bar only; header overlays the grid.

### 2.2 Image quality pipeline
Inspo and outfit photos render soft.
1. Check what resolution is stored in Supabase Storage. If ~480px,
   the AI preprocessing is being applied before saving.
2. Two versions going forward:
   - Stored original: longest edge 2048px, JPEG ~0.85. Displayed.
   - AI copy: 480px / 0.72, built at request time, never stored.
   Apply to inspo, outfits, and catalogued pieces.
3. expo-image everywhere with disk caching and contentFit="cover".
   Grid thumbnails via Supabase image transforms or a stored ~600px
   rendition; full image only in detail views.
4. Report how many existing images are low-res. They can't be
   recovered — I'll decide on re-uploads.

### 2.3 Fit ratings as an assessment input
- Pass each outfit's rating (where present) into the
  style-assessment function alongside its photo and metadata.
- Update ASSESSMENT_SPEC.md and the prompt: in Step 2, a highly
  rated outfit is stronger evidence for its lane than an unrated
  one; a low-rated outfit is still evidence the lane exists, just
  weaker confirmation. Ratings never create or remove a lane on
  their own.
- Include ratings in inputs_hash so re-rating triggers staleness.
- Do not add any new output field.

### 2.4 Brand field on pieces
Nullable `brand` text column. Editable in Edit details with
autocomplete from brands already in the user's closet. Catalog
prompt returns brand when a label or logo is visible, null
otherwise. Backfill: infer from existing names where unambiguous
("Carhartt midweight zip hoodie" → Carhartt), leave null when not.

---

## Tier 3 — large (several days each)

### 3.1 Suggested fits — occupation-based (Outfits tab)
New "Suggested" section at the top of the Outfits tab, above Saved
fits.
- Add `occupation` and `work_dress_code` (casual / business casual /
  formal / uniform / remote) to user_profile. Edit in Profile →
  About you.
- When set, generate-fit is called once per workday with occasion
  derived from occupation + dress code + the day's weather (the
  WeatherBadge data already in the app). Cache per day; don't
  regenerate on every open.
- Each suggestion is a fit card with a "Save" action that moves it
  into Saved fits, and a "Not this" that regenerates that day only.
- Respect the free tier: suggestions count as fit generations.
- Show nothing if occupation isn't set — one row inviting the user
  to add it, pointing at Profile.

### 3.2 Shopping suggestions — Insights
Turn gap analysis into purchasable suggestions.
- Inputs: the gaps from analyze-wardrobe-gaps, the user's stores,
  budget per category, fit preferences, colors, and the style
  profiles.
- New Edge Function `suggest-products`: for each gap, use the
  Anthropic web search tool to find 2–3 real products at the user's
  preferred stores within budget, returning name, store, price,
  product URL, and image URL. Validate that URLs resolve before
  returning; drop any that don't.
- Insights renders each gap as a card: the gap description, then a
  horizontal row of product cards with image, name, store logo,
  price. Tapping opens the product URL in an in-app browser.
- Example imagery for a gap when no products are found: a single
  representative product image from the same search, labeled "Looks
  like."
- Cache results per gap for 7 days. Pro-gated per the free tier
  spec. Affiliate link wrapping is a later pass — leave a hook.
- Also surface a lighter version on Lookbook: a "Pieces for your
  lanes" row under My Style, driven by the style profiles rather
  than gaps.

---

## Tier 4 — later

### 4.1 Calendar-aware suggested fits
Extends 3.1. Request calendar access (expo-calendar), read the next
7 days of events, and generate a suggestion per event using its
title and location as the occasion. Needs: permission UX, event
parsing, a per-event cache, and graceful handling of denied access.
Build only after 3.1 has shipped and been used — it's the same
feature with a harder input.

### 4.2 Piece tagging on outfit photos
### 4.3 Discover, search, friending
See BACKLOG.md. Not before a few hundred active users.

---

## Order of operations

1. Tier 1 as one commit set, build, TestFlight.
2. 2.1 and 2.2 together — both touch Wardrobe rendering. Build,
   TestFlight.
3. 2.3 and 2.4. Redeploy functions.
4. 3.1, then 3.2. Each is its own branch and TestFlight build.
