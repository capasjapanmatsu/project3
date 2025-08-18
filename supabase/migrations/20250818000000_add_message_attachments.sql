-- メッセージ添付ファイル用テーブルとポリシー

-- バケット作成（初回のみ）: 公開にして簡易運用。非公開にしたい場合は public:=false にし、署名付きURLを使ってください。
select storage.create_bucket('message-attachments', public := true);

create table if not exists public.message_attachments (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages(id) on delete cascade,
  file_url text not null,
  file_type text not null check (file_type in ('image','pdf','other')),
  file_name text,
  created_at timestamptz not null default now()
);

create index if not exists idx_msg_att_message on public.message_attachments(message_id);

alter table public.message_attachments enable row level security;

-- 参照ポリシー: 親メッセージの当事者（または管理者）のみ閲覧可
drop policy if exists sel_msg_att on public.message_attachments;
create policy sel_msg_att on public.message_attachments
for select using (
  exists (
    select 1 from public.messages m
    join public.profiles p on p.id = auth.uid()
    where m.id = message_id
      and (
        m.sender_id = auth.uid() or m.receiver_id = auth.uid() or p.user_type = 'admin'
      )
  )
);

-- 追加ポリシー: 親メッセージの当事者のみ作成可（管理者も可）
drop policy if exists ins_msg_att on public.message_attachments;
create policy ins_msg_att on public.message_attachments
for insert with check (
  exists (
    select 1 from public.messages m
    join public.profiles p on p.id = auth.uid()
    where m.id = message_id
      and (
        m.sender_id = auth.uid() or m.receiver_id = auth.uid() or p.user_type = 'admin'
      )
  )
);


