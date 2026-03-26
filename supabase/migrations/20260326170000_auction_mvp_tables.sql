create table if not exists public.auction_events (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  status text not null default 'draft',
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  starting_bid numeric not null,
  minimum_increment numeric not null,
  winner_payment_deadline_hours integer not null default 24,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint auction_events_status_check check (
    status in (
      'draft',
      'scheduled',
      'live',
      'ended',
      'winner_pending_payment',
      'winner_paid',
      'cancelled'
    )
  ),
  constraint auction_events_time_range_check check (ends_at > starts_at),
  constraint auction_events_starting_bid_check check (starting_bid >= 0),
  constraint auction_events_minimum_increment_check check (minimum_increment > 0),
  constraint auction_events_winner_payment_deadline_hours_check check (winner_payment_deadline_hours > 0)
);

create unique index if not exists auction_events_one_open_event_per_product_idx
on public.auction_events (product_id)
where status in ('draft', 'scheduled', 'live', 'winner_pending_payment');

create index if not exists auction_events_status_starts_at_idx
on public.auction_events (status, starts_at);

create index if not exists auction_events_status_ends_at_idx
on public.auction_events (status, ends_at);

create table if not exists public.auction_bids (
  id uuid primary key default gen_random_uuid(),
  auction_event_id uuid not null references public.auction_events(id) on delete cascade,
  eligible_order_id uuid not null references public.orders(id),
  eligible_order_code text not null,
  bidder_name text not null,
  bidder_email text not null,
  bidder_email_normalized text not null,
  bidder_phone text,
  bidder_phone_normalized text,
  bid_amount numeric not null,
  created_at timestamptz not null default now(),
  constraint auction_bids_bid_amount_check check (bid_amount > 0)
);

create index if not exists auction_bids_event_amount_created_idx
on public.auction_bids (auction_event_id, bid_amount desc, created_at asc, id asc);

create index if not exists auction_bids_event_created_idx
on public.auction_bids (auction_event_id, created_at desc);

create index if not exists auction_bids_eligible_order_id_idx
on public.auction_bids (eligible_order_id);

create index if not exists auction_bids_bidder_email_normalized_idx
on public.auction_bids (bidder_email_normalized);

comment on table public.auction_events is
  'Auction listings for one-of-a-kind Artiani products. Public product visibility stays in products; auction sale mode is driven from this table.';

comment on table public.auction_bids is
  'Immutable accepted bids for Artiani auction events, keyed to an existing paid-order proof instead of a user-account system.';

comment on column public.auction_events.status is
  'Draft/scheduled/live lifecycle plus post-close payment states for the winning bidder.';

comment on column public.auction_bids.eligible_order_id is
  'Existing paid Artiani order used later as the bidder eligibility proof anchor.';

comment on column public.auction_bids.eligible_order_code is
  'Snapshot of the qualifying order code supplied by the bidder at the time of bid placement.';
