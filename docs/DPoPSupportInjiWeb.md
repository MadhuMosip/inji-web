# DPoP Support — Inji Web Required Changes

Ref: [Issue #680](https://github.com/inji/inji-web/issues/680)

## Target Flow

1. Generate DPoP key pair (Web Crypto)
2. Build DPoP proof JWT (`htu` = real upstream URL, not Mimoto proxy)
3. `POST /v2/get-token/{issuer}` + header `DPoP: <proof>`
4. On `DPoP-Nonce` / `use_dpop_nonce` → rebuild proof with nonce → retry
5. Credential download: send `access_token` + new DPoP proof to Mimoto

## Current Gap

Inji Web uses one combined call (no get-token, no access token in browser, no DPoP):

| Mode | Endpoint |
|------|----------|
| Guest | `POST /credentials/download` |
| Logged-in | `POST /wallets/{walletId}/credentials` |

## Required Changes

### 1. Split issuance (`RedirectionPage.tsx`, `api.ts`, `misc.ts`)

- Token: `POST /v2/get-token/{issuer}` + `DPoP`
- Credential: existing download/store APIs with `access_token` + new `DPoP` proof

### 2. DPoP utilities (new)

- ES256 key pair via Web Crypto
- DPoP JWT: `jti`, `htm`, `htu`, `iat`, optional `nonce`, optional `ath`
- JOSE signing dependency (none present today)

### 3. `htu` values (from session `selectedIssuer`)

| Request | Field |
|---------|--------|
| Token | `proxy_token_endpoint` |
| Credential | `credentials_endpoint` |

Do not use `token_endpoint` (Mimoto proxy URL).

### 4. Header + nonce retry (`useApi.ts` / issuance helper)

- Send `DPoP` header on token and credential requests
- Read `DPoP-Nonce` / `WWW-Authenticate: use_dpop_nonce` from Mimoto response
- Rebuild proof and retry (bounded)

### 5. Session lifecycle (`sessions.ts`, `SessionObject`)

- Hold DPoP key pair for the issuance transaction
- Hold access token after get-token
- Reuse same key for token and credential proofs
- Clear on success or failure

### 6. Types

- Token response: `access_token`, `token_type`, `expires_in`
- Credential request: include `access_token`; remove code/PKCE from credential call once Mimoto contract is split

### 7. Tests + dependency

- Add JOSE library
- Cover proof generation, header attachment, nonce retry, split guest/logged-in flows

## Out of Scope (Inji Web)

- Authorize redirect / PKCE
- OVP flows
- Pre-authorized code flow (not implemented)
- Mimoto-side forwarding (token/credential/DPoP-Nonce propagation)
