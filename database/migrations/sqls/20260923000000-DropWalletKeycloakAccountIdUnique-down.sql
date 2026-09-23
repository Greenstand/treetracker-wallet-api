DROP INDEX IF EXISTS wallet_keycloak_account_id_idx;

ALTER TABLE wallet ADD CONSTRAINT wallet_keycloak_account_id_key UNIQUE (keycloak_account_id);
