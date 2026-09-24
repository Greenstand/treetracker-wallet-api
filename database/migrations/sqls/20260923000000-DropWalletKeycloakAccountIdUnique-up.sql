ALTER TABLE wallet DROP CONSTRAINT IF EXISTS wallet_keycloak_account_id_key;

CREATE INDEX IF NOT EXISTS wallet_keycloak_account_id_idx ON wallet (keycloak_account_id);
