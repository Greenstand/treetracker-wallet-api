DROP INDEX IF EXISTS token_action_token_id_idx;

CREATE INDEX token_action_token_id_idx ON token (action_token_id);
