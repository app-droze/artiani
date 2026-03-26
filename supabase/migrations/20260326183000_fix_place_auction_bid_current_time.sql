create or replace function public.place_auction_bid(
  p_auction_event_id uuid,
  p_order_code text,
  p_email text,
  p_bid_amount numeric
)
returns table (
  ok boolean,
  failure_reason text,
  auction_event_id uuid,
  bid_id uuid,
  current_effective_bid numeric,
  auction_end_time timestamptz,
  minimum_next_valid_bid numeric
)
language plpgsql
security definer
set search_path = public
as $$
declare
  event_row public.auction_events%rowtype;
  order_row public.orders%rowtype;
  highest_bid_amount numeric;
  effective_current_bid numeric;
  minimum_next_bid numeric;
  normalized_email text;
  normalized_phone text;
  new_bid_id uuid;
  resolved_end_time timestamptz;
  current_ts timestamptz := now();
begin
  if
    p_auction_event_id is null or
    p_order_code is null or
    btrim(p_order_code) = '' or
    p_email is null or
    btrim(p_email) = '' or
    p_bid_amount is null or
    p_bid_amount <= 0
  then
    return query
    select false, 'invalid_payload', p_auction_event_id, null::uuid, null::numeric, null::timestamptz, null::numeric;
    return;
  end if;

  normalized_email := lower(btrim(p_email));

  select *
  into event_row
  from public.auction_events
  where id = p_auction_event_id
  for update;

  if not found or event_row.status <> 'live' then
    return query
    select false, 'auction_not_live', p_auction_event_id, null::uuid, null::numeric, null::timestamptz, null::numeric;
    return;
  end if;

  if current_ts >= event_row.ends_at then
    return query
    select false, 'auction_ended', event_row.id, null::uuid, null::numeric, event_row.ends_at, null::numeric;
    return;
  end if;

  select *
  into order_row
  from public.orders
  where upper(order_code) = upper(btrim(p_order_code))
  limit 1;

  if not found then
    return query
    select false, 'order_not_found', event_row.id, null::uuid, null::numeric, event_row.ends_at, null::numeric;
    return;
  end if;

  if lower(btrim(coalesce(order_row.email, ''))) <> normalized_email then
    return query
    select false, 'email_mismatch', event_row.id, null::uuid, null::numeric, event_row.ends_at, null::numeric;
    return;
  end if;

  if order_row.status not in ('paid', 'processing', 'shipped', 'completed') then
    return query
    select false, 'order_not_eligible', event_row.id, null::uuid, null::numeric, event_row.ends_at, null::numeric;
    return;
  end if;

  select bids.bid_amount
  into highest_bid_amount
  from public.auction_bids as bids
  where bids.auction_event_id = event_row.id
  order by bids.bid_amount desc, bids.created_at asc, bids.id asc
  limit 1;

  effective_current_bid := coalesce(highest_bid_amount, event_row.starting_bid);
  minimum_next_bid := effective_current_bid + event_row.minimum_increment;

  if p_bid_amount < minimum_next_bid then
    return query
    select false, 'bid_too_low', event_row.id, null::uuid, effective_current_bid, event_row.ends_at, minimum_next_bid;
    return;
  end if;

  normalized_phone := nullif(regexp_replace(coalesce(order_row.phone, ''), '\D', '', 'g'), '');

  insert into public.auction_bids (
    auction_event_id,
    eligible_order_id,
    eligible_order_code,
    bidder_name,
    bidder_email,
    bidder_email_normalized,
    bidder_phone,
    bidder_phone_normalized,
    bid_amount
  )
  values (
    event_row.id,
    order_row.id,
    order_row.order_code,
    order_row.customer_name,
    order_row.email,
    normalized_email,
    order_row.phone,
    normalized_phone,
    p_bid_amount
  )
  returning id into new_bid_id;

  if event_row.ends_at - current_ts <= interval '10 minutes' then
    resolved_end_time := event_row.ends_at + interval '10 minutes';

    update public.auction_events
    set
      ends_at = resolved_end_time,
      updated_at = now()
    where id = event_row.id;
  else
    resolved_end_time := event_row.ends_at;
  end if;

  return query
  select
    true,
    null::text,
    event_row.id,
    new_bid_id,
    p_bid_amount,
    resolved_end_time,
    p_bid_amount + event_row.minimum_increment;
end;
$$;
