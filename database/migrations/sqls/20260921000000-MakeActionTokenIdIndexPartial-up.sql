-- Almost every token has action_token_id NULL. Indexing only the flagged rows
-- keeps the index tiny and off the write path of ordinary token updates.
DROP INDEX IF EXISTS token_action_token_id_idx;

CREATE INDEX token_action_token_id_idx ON token (action_token_id)
  WHERE action_token_id IS NOT NULL;
