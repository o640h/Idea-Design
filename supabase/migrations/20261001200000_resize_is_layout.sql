-- Resizing a block is layout, like moving or formatting it.
alter table public.operations
alter column layout set expression as (
  operation ->> 'type' in (
    'component/move',
    'component/resize',
    'component/format'
  )
);
