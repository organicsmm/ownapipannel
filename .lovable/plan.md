## Goal

User-side "My Bundles" ko bilkul admin Engagement Bundles jaisa banana hai — manual ratio hatao, AI auto-ratios use ho, aur ek engagement type (e.g. Views) ke andar multiple provider accounts rotate ho saken. Service ko service ID se directly link kiya jaye (admin jaise), na ki "import service" wala alag flow.

## New User Bundle UX (per bundle card)

```
[Platform tabs: Instagram | TikTok | YouTube | Twitter/X | Facebook]

Bundle: "My IG Bundle"          [Active toggle]  [Delete]

  🧠 AI Organic Mode             [ON/OFF]
  ✨ AI Organic Ratios (auto)    [ON/OFF]   ← replaces manual ratio %

  [Views+] [Likes+] [Comments+] [Saves+] [Shares+] [Followers+]  ← add type

  ▼ Views  (Base)
    Service ID: [____]  Name (auto-filled)  $rate/1k    [Providers (2)] [Unlink]
  ▼ Likes
    Service ID: [____]  ...                              [Providers (1)] [Unlink]
```

- "Service ID" ek single input — user apne provider ka service number type karta hai, hum `user-import-services` (fetch_only) se metadata fetch karke `user_bundle_items` me link kar dete hain.
- "Providers" button ek dialog kholega (admin jaise Provider Rotation modal): user apne multiple `user_provider_accounts` me se tick laga sakta hai, har account ka apna service ID + priority. Order place karte waqt priority 1 fail → 2 try.

## DB changes

Naya table for rotation (user-side mirror of admin's `service_provider_mapping`):

```
user_bundle_item_providers
  id uuid pk
  user_id uuid
  user_bundle_item_id uuid → user_bundle_items.id (cascade)
  user_provider_account_id uuid → user_provider_accounts.id
  provider_service_id text
  priority int default 1
  is_active bool default true
  created_at, updated_at
  unique(user_bundle_item_id, user_provider_account_id)
```

RLS: only owner can CRUD (`auth.uid() = user_id`), plus GRANTs. `user_bundle_items.ratio_percent` ko optional/null-able rakhenge (drop nahi karenge data ke liye), use band kar denge UI me.

`user_bundles` me 2 naye flags:
- `ai_organic_mode` bool default true
- `ai_organic_ratios` bool default true

## Edge function changes

`user-process-engagement-order/index.ts`:
- `items[]` ab ratio_percent ignore karega; jab `ai_organic_ratios=true` ho to `DEFAULT_RATIOS[platform]` se per-type quantity compute karega (admin ki tarah).
- Har item ke liye `user_bundle_item_providers` se priority-ordered list lo; provider #1 pe order try → fail/balance kam → next priority. Existing single-provider path ko backwards-compatible rakho jab koi mapping nahi hai (current `user_provider_account_id` ko fallback).

## Frontend changes

- `src/pages/MyBundles.tsx` poora rewrite: platform tabs, engagement-type cards, ProviderRotationDialog component, AI toggles. Manual ratio input hata do.
- `src/pages/UserEngagementOrder.tsx`: ratio inputs aur "enable per item" switches hata do. Sirf base quantity + link + organic toggle. Breakdown read-only auto-computed dikhao.
- New small component: `UserProviderRotationDialog.tsx`.

## Files to touch

- (new migration) `user_bundle_item_providers` table + bundle flags
- `src/pages/MyBundles.tsx` (rewrite)
- `src/pages/UserEngagementOrder.tsx` (simplify)
- `supabase/functions/user-process-engagement-order/index.ts` (auto-ratios + multi-provider rotation)
- (new) `src/components/bundles/UserProviderRotationDialog.tsx`

## Out of scope

- Admin panel — koi change nahi.
- Existing orders/data — preserved; old bundles with manual ratios will still work (legacy field stays but hidden).

Approve karo to migration + code dono ek saath bhej dunga.
