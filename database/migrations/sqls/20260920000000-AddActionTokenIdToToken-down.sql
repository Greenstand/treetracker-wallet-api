DROP INDEX IF EXISTS token_action_token_id_idx;

ALTER TABLE token DROP COLUMN action_token_id;
