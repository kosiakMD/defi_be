# migrate transactions to ETH transfers
create table public.asset_transfers
(
    "from"       varchar(64) default NULL::character varying,
    "to"         varchar(64) default NULL::character varying,
    value        numeric(256),
    timestamp    bigint,
    tx_hash      varchar(128),
    block_number integer
);

alter table asset_transfers
    owner to devdashuser;

insert into public.asset_transfers
select "from", "to", value, timestamp, hash, block_number
from public.eth_transactions t
left join public.eth_blocks b
on t.block_number = b.number