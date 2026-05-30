
# Per-User API / Services / Bundles Feature

## Goal
Abhi system admin-only hai: admin provider API key daalta hai → sab users wahi services use karte hain → admin ke provider balance se kat-ta hai.

Naya behaviour: **har subscribed user apna khud ka provider API key daale, apni services import kare, apne bundles banaye, aur orders sirf uske hi API/balance se chale.** User A ka data User B ko bilkul na dikhe.

Admin-managed (global) system bhi parallel chalta rahega (jo users API nahi laga rahe unke liye fallback / public mode).

---

## Scope (A to Z, jaisa tune bola)

### 1. User Provider Accounts
- User Settings me naya "My Provider" section
- User apna provider URL + API key add kar sake (multiple allowed, with priority)
- Balance fetch button (uske API se balance dikhaye)
- Sirf wahi user apna key dekh/edit kar sake

### 2. User Services (Import)
- "My Services" page — user apne provider se services import kare (jaise admin abhi karta hai)
- Apni pricing markup laga sake apni services pe
- Enable/disable kar sake
- Sirf uski services use karte time dikhe

### 3. User Bundles
- "My Bundles" page — user apne services se bundles banaye (Instagram likes+views+comments etc.)
- Existing admin bundle UI ka clone, but user-scoped

### 4. Order Placement
- Jab user order place kare:
  - Agar usne apna API laga rakha hai → uske provider account se order ja-ye, uske wallet se nahi (uske provider ke balance se direct)
  - Agar nahi laga rakha → existing admin/global flow (fallback)
- Engagement orders bhi same — user ke bundles + user ke services + user ke API

### 5. Access Control
- Ye sab features sirf **active subscription** wale user ko milein (existing SubscriptionGuard reuse)
- RLS: har table pe `user_id` based policy — apna data hi dikhe

### 6. Admin Panel
- Admin sab users ke provider accounts dekh/manage kar sake (existing admin pattern)

---

## Technical Changes

### Database (migration)
Naye tables (sab `user_id` column ke saath + RLS):
- `user_provider_accounts` — user ke provider API keys (url, key, balance, priority, is_active)
- `user_services` — user ki imported services (provider_service_id, name, category, price, markup)
- `user_bundles` + `user_bundle_items` — user ke custom bundles
- `user_service_provider_mapping` — user service → user provider mapping

RLS policies har table pe:
- User: apna `user_id = auth.uid()` ka CRUD
- Admin: `has_role(auth.uid(), 'admin')` se sab kuch

Subscription check: insert policies me `EXISTS (SELECT 1 FROM subscriptions WHERE user_id=auth.uid() AND status='active')`

### Edge Functions (naye / updated)
- `user-import-services` — user ke API se services fetch karke `user_services` me daale
- `user-check-balance` — user ke provider ka balance fetch
- `user-place-order` — order user ke provider pe place kare, response store kare
- `user-process-engagement-order` — engagement orders user ke API se chalaye
- Existing `place-order` / `process-engagement-order` me branching: agar order user-scoped hai to user API use kare

### Frontend (naye pages / components)
- `/my-providers` — user provider account management
- `/my-services` — user services import & list
- `/my-bundles` — user bundle builder
- Existing order/engagement pages me toggle: "Use my API" vs "Use platform services"
- Sidebar me ye new section sirf subscribed users ko dikhe

### Wallet behaviour
- User-API orders me wallet se paisa nahi katega (kyunki user ka apna provider account hai)
- Sirf platform/admin services wale orders me wallet kate (existing behaviour)
- Subscription fee alag rahegi

---

## Build Order (phases)

```text
Phase 1: DB schema + RLS for user_provider_accounts, user_services
Phase 2: User provider management UI + balance check edge function
Phase 3: Service import (user-side) + my services UI
Phase 4: User bundles DB + UI
Phase 5: Order placement routing (user API vs platform)
Phase 6: Engagement orders with user bundles + user API
Phase 7: Admin oversight panel
Phase 8: QA + polish
```

---

## Important Considerations
- API keys sensitive hain — sirf edge functions me decrypt/use, frontend pe kabhi expose nahi
- Existing admin flow break nahi hoga — purely additive
- UI/design same theme rahegi (orange + white)
- Subscription guard sab user-scoped pages pe lagega

---

Bhai bata — **start kar du Phase 1 (DB + provider management) se?** Ya kuch change karna hai plan me? Ye 6-8 alag steps me banega, ek hi message me poora nahi hoga.
