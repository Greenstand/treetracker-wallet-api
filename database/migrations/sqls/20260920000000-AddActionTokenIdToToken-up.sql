ALTER TABLE token ADD COLUMN action_token_id uuid NULL;

CREATE INDEX token_action_token_id_idx ON token (action_token_id);
