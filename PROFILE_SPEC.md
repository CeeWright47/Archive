# Archive — Profile & Preferences (iOS / Expo)

Build the Profile stack natively in the Expo app. This is a settings
screen, not a form: a grouped list of rows that push to sub-pages,
auto-save everywhere, left-aligned throughout. Read and write through
Supabase (`user_profile`, `preferences`, `style_assessments`) with the
existing client and RLS — no local-only blobs.

Show the Profile list, About you, and Colors screens for review before
building the rest.

---

## 1. Navigation

- App bar profile icon pushes `/profile` (Stack, not a tab).
- Each row pushes a sub-page in the same Stack: `/profile/account`,
  `/profile/about`, `/profile/sizes`, `/profile/style`, `/profile/fit`,
  `/profile/colors`, `/profile/occasions`, `/profile/assessment`,
  `/profile/stores`, `/profile/budget`, `/profile/climate`,
  `/profile/privacy/photos`.
- Sub-page header: back chevron, section name as title in the serif
  face, left-aligned. Use the native Stack header with the app's
  tokens, not a custom bar.
- Toggles and single-value pickers (Units) are inline on the list, no
  sub-page.

## 2. Alignment and typography — global rule

Put these in the shared components so they can't drift per screen:

- `SectionHeader`: tracked mono caption, accent color, **left-aligned**,
  16pt horizontal inset, 24pt top / 8pt bottom spacing.
- `FieldLabel`: tracked mono caption, muted, **left-aligned**, 8pt
  below to its control.
- `HelperText`: footnote, muted, **left-aligned**, max two lines.
- Nothing on these screens is centered except text inside a chip and
  text inside a full-width button.

## 3. Profile list

Grouped rows using a shared `SettingsRow` component:

```
label            (body, bone)
description      (footnote, muted)              summary  ›
```

- `summary` is right-aligned, muted, one line, ellipsis. Every row that
  holds a value shows one — see the table.
- Row min height 56pt, 44pt tap target satisfied by the row itself.
- Group background one step lighter than the page, 16pt radius,
  hairline dividers inset to the label's left edge.

| Section  | Row                   | Description                        | Summary                                     |
|----------|-----------------------|------------------------------------|---------------------------------------------|
| YOU      | Account               | Name, email, mobile                | name or "Not set"                           |
| YOU      | About you             | Height, weight, build              | `5'10" · 175 lb` or "Not set"               |
| YOU      | Sizes                 | Tops, bottoms, shoes, outerwear    | `M · 32×32 · 10.5`                          |
| STYLE    | My Style              | In your own words                  | first ~30 chars of text or "Not set"        |
| STYLE    | Fit preferences       | Per category, cuffing, length      | `Slim tops · Slim bottoms · Cuffed`         |
| STYLE    | Colors                | Worn most and avoided              | `6 worn · 2 avoided`                        |
| STYLE    | Occasions             | What you dress for                 | `4 selected`                                |
| STYLE    | Style assessment      | Your style profiles                | profile names `Prep +2` or "Not run yet"    |
| SHOPPING | Stores                | Where you shop                     | `4 selected`                                |
| SHOPPING | Budget                | Typical spend per category         | `$–$$` or "Not set"                         |
| APP      | Auto-tag outfits      | (toggle)                           | —                                           |
| APP      | Run assessment automatically | (toggle, default off)       | —                                           |
| APP      | Units                 | (inline picker)                    | Imperial / Metric                           |
| APP      | Climate               | Affects seasonal suggestions       | value or "Not set"                          |
| PRIVACY  | Where photos are stored | —                                | —                                           |
| PRIVACY  | Export my data        | Everything, as one JSON file       | —                                           |
| PRIVACY  | Delete my account     | Removes all data and photos        | — (destructive color)                       |

Summaries are derived in a small selector module so the list never
reaches into raw records.

## 4. Save behavior

- **Auto-save everywhere.** No Save buttons on any sub-page.
- Text fields save on blur. Chips and toggles save on tap.
- Debounce writes 400ms; coalesce chip taps.
- Show a subtle "Saved" state in the header (fades in/out, ~1s). No
  toasts.
- Optimistic UI; on write failure, revert the control and show one
  inline error line under the field. Never block navigation.

## 5. Sub-pages

### Account
- Name, email (read-only from auth), mobile.
- Sign out.
- Placeholder rows for password change and Apple sign-in linking; wire
  when auth pass lands.

### About you
- Helper: "All optional. These only improve fit advice and aren't shown
  anywhere else."
- **Height**: two numeric fields, feet + inches, when Units = Imperial;
  one cm field when Metric. Numeric keyboard.
- **Weight**: one numeric field, unit label from Units setting.
- **Birth year**: four-digit numeric. Do not store age.
- **Build**: single-select chips — Slim, Athletic, Average, Stocky,
  Broad, Tall.

### Sizes
- **Tops**: letter size (XS–XXL chips) and optional neck/sleeve
  (two numeric fields, `15.5 / 34`).
- **Bottoms**: waist and inseam, numeric.
- **Shoes**: numeric size plus optional width chips (D, E, EE).
- **Outerwear**: letter size chips.

### My Style
- Helper: "Describe your style in your own words. This is one input to
  your style profiles alongside your closet, inspo, and outfits."
- Full-height multiline field, body size, sentence case. Saves on blur.

### Fit preferences
- Multi-select chips per category.
- Tops and Outerwear: Muscle, Slim, Regular, Relaxed, Oversized,
  No preference.
- Bottoms: Skinny, Slim, Regular, Relaxed, Loose, No preference.
- Cuffing: Cuffed, Uncuffed, No preference (single-select).
- Length: No break, Slight break, Full break, No preference
  (single-select).
- Vocabulary must match the `fit` attribute on pieces exactly.

### Colors
- **One list**, not two. Each chip cycles on tap:
  neutral → worn most → avoid → neutral.
- States: neutral = outlined muted; worn most = filled accent; avoid =
  outlined with a small ✕ before the label.
- Legend line at top: "Tap once for worn most, twice to avoid."
- One custom-add field. Custom chips get a long-press to remove.

### Occasions
- Multi-select chips: Work, Gym, Going out, Date night, Weekend,
  Travel, Formal events, Church.
- Custom-add field; long-press to remove custom.
- Selected chips sort to the front.

### Style assessment
- Description: "A synthesis of your written profile, inspo, closet, and
  outfit photos — broken into the distinct style lanes running through
  your closet."
- Before first run: description and a primary "Run assessment" button
  only. **Do not** show the stale-warning line.
- After a run: profile cards (rank label, headline, read, pillars,
  direction, activity), then `shared_pieces` as a list, then the stale
  line if inputs changed, then "Update assessment."
- Cards left-aligned, rank as tracked mono caption above the headline.

### Stores
- Multi-select chips. Defaults: H&M, Uniqlo, J.Crew, Abercrombie,
  Banana Republic, Nordstrom, Zara, Nike, Foot Locker, Amazon,
  Thrift / vintage, Online marketplaces.
- Custom-add; selected sort to front.

### Budget
- Per category (Tops, Bottoms, Shoes, Outerwear): single-select
  `$`, `$$`, `$$$`, `$$$$` with a helper line giving the ranges.

### Climate
- Single-select: Hot / humid, Warm, Temperate, Cool, Cold — plus an
  optional city text field.

### Where photos are stored
- Static explanation screen. Copy will change when Supabase Storage
  lands — keep it in one constant.

### Export my data
- Calls the existing export and presents the share sheet.

### Delete my account
- Two-step confirm (type "DELETE"). Calls the delete Edge Function
  when it exists; until then, disabled with a note.

## 6. Data mapping

- `user_profile`: name, mobile, height_cm, weight_kg, birth_year,
  build, sizes (jsonb). Store metric internally; convert for display
  from the Units setting.
- `preferences`: style_text, fit (jsonb per category), colors (jsonb:
  `{worn: [], avoid: []}`), occasions[], stores[], budget (jsonb),
  units, climate, auto_tag, auto_assess.
- `style_assessments`: read latest for summary and the assessment page.
- All reads scoped by RLS; never pass `user_id` from the client.

## 7. Components to create

- `SettingsRow`, `SettingsGroup`, `SectionHeader`
- `Chip` with variants: `outlined`, `filled`, `avoid`; `ChipGroup`
  with `single | multi | tristate` modes
- `FieldLabel`, `HelperText`, `NumericField`, `MultilineField`
- `SavedIndicator` (header)
- `useAutosave(record, writeFn)` hook with debounce and revert

## 8. Out of scope

- Onboarding flow (separate pass, reuses these sub-pages)
- Auth screens beyond sign-out
- Account deletion backend
