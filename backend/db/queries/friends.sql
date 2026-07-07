-- name: ListFriends :many
select *
from public.friends
where profile_id = sqlc.arg(profile_id)::uuid
order by created_at desc;

-- name: AddFriend :exec
insert into public.friends (profile_id, friend_profile_id, status)
values (sqlc.arg(profile_id)::uuid, sqlc.arg(friend_profile_id)::uuid, sqlc.arg(status))
on conflict (profile_id, friend_profile_id) do update set status = excluded.status;
