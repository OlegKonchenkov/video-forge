-- Refund a credit when video generation fails and log to ledger
create or replace function refund_credit(p_user_id uuid, p_video_id uuid)
returns void as $$
begin
  update profiles set credits = credits + 1 where id = p_user_id;
  insert into credit_ledger (user_id, delta, reason, reference_id)
  values (p_user_id, 1, 'refund', p_video_id);
end;
$$ language plpgsql security definer;
