revoke execute on function public.place_auction_bid(uuid, text, text, numeric)
from public;

revoke execute on function public.place_auction_bid(uuid, text, text, numeric)
from anon;

revoke execute on function public.place_auction_bid(uuid, text, text, numeric)
from authenticated;

grant execute on function public.place_auction_bid(uuid, text, text, numeric)
to service_role;
