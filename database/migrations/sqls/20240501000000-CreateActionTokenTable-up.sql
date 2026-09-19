CREATE TABLE action_token (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  sender_wallet_id uuid NOT NULL,
  recipient_email varchar,
  token_ids jsonb NOT NULL,
  token_count integer NOT NULL,
  state varchar NOT NULL DEFAULT 'active',
  expires_at timestamptz NOT NULL,
  redeemed_by_wallet_id uuid,
  redeemed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT action_token_pkey PRIMARY KEY (id)
);

CREATE INDEX action_token_sender_wallet_id_idx ON action_token (sender_wallet_id);
