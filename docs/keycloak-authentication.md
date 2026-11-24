# Keycloak Authentication and Account Recovery

This document describes the Keycloak authentication flow used by the wallet API's
`keycloak` branch. It is intentionally separate from the repository README so the
README can remain focused on general project setup.

## Branches and deployed paths

The wallet API has two authentication variants:

| Variant | Authentication | Typical deployed path |
| --- | --- | --- |
| `master` | Legacy wallet-api JWT and API-key authentication | `/wallet/v2` |
| `keycloak` | Keycloak bearer-token authentication | `/wallet/keycloak` |

The variants use the same codebase family and database, but they do not use the same
authentication flow. New wallet-app work should use the `keycloak` branch and the
`/wallet/keycloak` deployment. Changes involving shared database tables or migrations
must be reviewed for compatibility with both variants.

## Keycloak endpoints

The development realm is hosted at:

```text
https://dev-k8s.treetracker.org/keycloak/realms/treetracker
```

The deployed wallet API endpoint is:

```text
https://dev-k8s.treetracker.org/wallet/keycloak
```

The API verifies tokens against the realm's JWKS endpoint:

```text
<KEYCLOAK_URL>/protocol/openid-connect/certs
```

Do not place development credentials, client secrets, or bearer tokens in this
repository. Obtain access details from the maintainers through the approved team
channel.

## Required configuration

The Keycloak branch reads the following settings from the environment:

```dotenv
DATABASE_URL=postgresql://<user>:<password>@<host>:<port>/<database>
DATABASE_SCHEMA=wallet
KEYCLOAK_URL=https://dev-k8s.treetracker.org/keycloak/realms/treetracker
ACTION_TOKEN_SECRET=<long-random-secret>
```

`KEYCLOAK_URL` controls where the API retrieves signing keys. The verifier currently
accepts the configured development, test, and production realm issuers from the
issuer allowlist in `server/services/enums.js`; the token issuer must match one of
those values.

The `.env.example` file contains additional variables used by particular deployment
or legacy configurations. Confirm their usage in the target branch before adding
them to a local setup. Never commit real values.

## How bearer-token verification works

For a protected request, the API:

1. Reads the `Authorization: Bearer <token>` header.
2. Retrieves the Keycloak signing key from the realm JWKS endpoint.
3. Verifies the token signature, `RS256` algorithm, issuer, and `sub` claim.
4. Uses the token `sub` value as the Keycloak account ID.
5. Resolves wallets whose `keycloak_account_id` matches that account.

The account ID is not a wallet name. A single Keycloak account may own multiple
wallets, and those wallets share the same `keycloak_account_id`.

## Wallet and admin authorization

Most wallet routes require both a valid Keycloak token and an associated wallet. The
exception is `POST /wallets`, which is allowed to create the first wallet for a valid
account.

Admin wallet routes are mounted below `/admin` and use Keycloak role authorization.
The wallet-admin role is required for operations that list or inspect wallets without
scoping the request to the caller's own wallet. An admin account may therefore have a
valid Keycloak session without having a wallet of its own.

## Common responses

| Response | Meaning | Suggested action |
| --- | --- | --- |
| `401` no token supplied | The request did not include a bearer token | Sign in and send the access token in the `Authorization` header |
| `401` token not verified | Signature, issuer, token format, or token lifetime validation failed | Confirm the realm, client, token issuer, and system clock; obtain a fresh token |
| `401` invalid token | The token is malformed or does not contain the required subject | Sign in again using the correct realm and client |
| `409` `reason: no_wallet` | The token is valid, but the account has no wallet | Create a wallet, then retry the original operation |
| `403` role required | The token is valid but does not contain the required Keycloak role | Ask a maintainer to verify the account's realm/client roles |
| `404` not found | The requested wallet or resource does not exist | Check the resource ID/name and the selected environment |

The `409` no-wallet response is not an authentication failure. The account is
authenticated; it only needs its first wallet.

## Local development

1. Start PostgreSQL with the repository's Docker Compose setup, or use a local
   PostgreSQL instance.
2. Create the `wallet` schema and run the database migrations described in the main
   README.
3. Create a local environment file with the database settings and `KEYCLOAK_URL`.
4. Start the API with `npm run server`.
5. Use a token issued by the configured Keycloak realm. A local API can use the shared
   development Keycloak realm if the machine can reach the development JWKS endpoint.

For a quick connectivity check, a request without a token should return a protected
path authentication error:

```bash
curl -i https://dev-k8s.treetracker.org/wallet/keycloak/wallets
```

With a valid token:

```bash
curl -i \
  -H "Authorization: Bearer ${KEYCLOAK_ACCESS_TOKEN}" \
  "https://dev-k8s.treetracker.org/wallet/keycloak/wallets?limit=10"
```

## Account recovery checklist

When authentication fails, check the following in order:

1. Confirm that the client and realm are the intended environment (`dev`, `test`, or
   `prod`).
2. Sign in again and copy a fresh access token from a request to the same environment.
3. Check that the token issuer matches the API's allowed Keycloak realm issuer.
4. Check whether the account has a wallet. A valid token with no wallet returns
   `409` with `reason: no_wallet`; create the wallet through `POST /wallets` or the
   wallet app flow.
5. For admin endpoints, confirm that the account has the `wallet-admin` role.
6. If the account is locked, the wrong realm was used, or a role cannot be restored,
   contact a maintainer with the environment, endpoint, status code, and request
   timestamp. Do not send the bearer token or client secret.

Avoid repeated login attempts when the realm or client configuration is uncertain;
verify the environment first or ask a maintainer to confirm the correct account and
role configuration.

## Related documentation

The wallet app has a related Keycloak setup and recovery documentation issue:
[treetracker-wallet-app #934](https://github.com/Greenstand/treetracker-wallet-app/issues/934).
