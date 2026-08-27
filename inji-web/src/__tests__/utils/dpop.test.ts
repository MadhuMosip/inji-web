import {webcrypto} from "crypto";
import {TextDecoder, TextEncoder} from "util";
import {
    calculateAccessTokenHash,
    createDpopSession,
    generateDpopProof,
    isUseDpopNonceError,
    normalizeDpopHtu,
    removeDpopSession,
    selectDpopAlgorithm
} from "../../utils/dpop";

const decodeJwtPart = (value: string) => {
    const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(Buffer.from(base64, "base64").toString("utf8"));
};

describe("DPoP utilities", () => {
    beforeAll(() => {
        Object.defineProperty(global, "crypto", {
            value: webcrypto,
            configurable: true
        });
        Object.defineProperty(global, "TextEncoder", {
            value: TextEncoder,
            configurable: true
        });
        Object.defineProperty(global, "TextDecoder", {
            value: TextDecoder,
            configurable: true
        });
    });

    test("normalizes htu without query or fragment", () => {
        expect(normalizeDpopHtu("HTTPS://Issuer.Example:443/token?x=1#part"))
            .toBe("https://issuer.example/token");
    });

    test("selects the first AS algorithm and defaults to ES256 when absent", () => {
        expect(selectDpopAlgorithm(undefined)).toBe("ES256");
        expect(selectDpopAlgorithm([])).toBe("ES256");
        expect(selectDpopAlgorithm(["RS256", "PS256", "ES256"])).toBe("RS256");
        expect(selectDpopAlgorithm(["PS256", "ES256"])).toBe("PS256");
        expect(selectDpopAlgorithm(["ES512", "RS256"])).toBe("ES512");
        expect(selectDpopAlgorithm(["EdDSA", "ES256", "RS256"])).toBe("EdDSA");
        expect(selectDpopAlgorithm(["ES256K"])).toBe("ES256K");
        expect(selectDpopAlgorithm(["RS384"])).toBe("RS384");
    });

    test("falls back to ES256 when the first AS algorithm cannot be generated", async () => {
        const sessionId = "fallback-alg-session";
        const thumbprint = await createDpopSession(sessionId, ["ES256K", "RS256"]);
        const proof = await generateDpopProof({
            sessionId,
            endpoint: "https://issuer.example/token"
        });
        const header = decodeJwtPart(proof.split(".")[0]);

        expect(thumbprint).toMatch(/^[A-Za-z0-9_-]{43}$/);
        expect(header.alg).toBe("ES256");
        expect(header.jwk).toMatchObject({kty: "EC", crv: "P-256"});

        await removeDpopSession(sessionId);
    }, 15000);

    test("detects use_dpop_nonce from JSON, XML, and WWW-Authenticate", () => {
        expect(isUseDpopNonceError({error: "use_dpop_nonce"})).toBe(true);
        expect(isUseDpopNonceError(
            "<OAuthError><error>use_dpop_nonce</error></OAuthError>"
        )).toBe(true);
        expect(isUseDpopNonceError(
            {message: "<error>use_dpop_nonce</error>"}
        )).toBe(true);
        expect(isUseDpopNonceError(undefined, "DPoP error=\"use_dpop_nonce\"")).toBe(true);
        expect(isUseDpopNonceError({error: "invalid_dpop_proof"})).toBe(false);
    });

    test("creates an ES256 token proof and JWK thumbprint by default", async () => {
        const sessionId = "token-proof-session";
        const thumbprint = await createDpopSession(sessionId);
        const proof = await generateDpopProof({
            sessionId,
            endpoint: "https://issuer.example/token?ignored=true"
        });

        const [encodedHeader, encodedClaims] = proof.split(".");
        const header = decodeJwtPart(encodedHeader);
        const claims = decodeJwtPart(encodedClaims);

        expect(thumbprint).toMatch(/^[A-Za-z0-9_-]{43}$/);
        expect(header).toMatchObject({
            typ: "dpop+jwt",
            alg: "ES256",
            jwk: {kty: "EC", crv: "P-256"}
        });
        expect(Object.keys(header.jwk).sort()).toEqual(["crv", "kty", "x", "y"]);
        expect(header.jwk.ext).toBeUndefined();
        expect(header.jwk.key_ops).toBeUndefined();
        expect(claims).toMatchObject({
            htm: "POST",
            htu: "https://issuer.example/token"
        });
        expect(claims.ath).toBeUndefined();
        expect(claims.exp - claims.iat).toBe(60);

        await removeDpopSession(sessionId);
    }, 15000);

    test.each([
        ["ES384", "P-384"],
        ["ES512", "P-521"],
        ["RS256", undefined],
        ["RS384", undefined],
        ["PS256", undefined],
        ["PS384", undefined]
    ])("creates a %s proof when the authorization server supports it", async (alg, curve) => {
        const sessionId = `${alg.toLowerCase()}-proof-session`;
        await createDpopSession(sessionId, [alg]);
        const proof = await generateDpopProof({
            sessionId,
            endpoint: "https://issuer.example/token"
        });

        const header = decodeJwtPart(proof.split(".")[0]);
        expect(header.alg).toBe(alg);
        if (curve) {
            expect(header.jwk).toMatchObject({kty: "EC", crv: curve});
            expect(Object.keys(header.jwk).sort()).toEqual(["crv", "kty", "x", "y"]);
        } else {
            expect(header.jwk.kty).toBe("RSA");
            expect(Object.keys(header.jwk).sort()).toEqual(["e", "kty", "n"]);
        }

        await removeDpopSession(sessionId);
    }, 15000);

    test("adds nonce and ath to a credential proof", async () => {
        const sessionId = "credential-proof-session";
        await createDpopSession(sessionId);
        const proof = await generateDpopProof({
            sessionId,
            endpoint: "https://issuer.example/credential",
            nonce: "issuer-nonce",
            accessToken: "access-token"
        });

        const claims = decodeJwtPart(proof.split(".")[1]);
        expect(claims.nonce).toBe("issuer-nonce");
        expect(claims.ath).toBe(await calculateAccessTokenHash("access-token"));

        await removeDpopSession(sessionId);
    }, 15000);

    test("fails after the DPoP session is removed", async () => {
        const sessionId = "removed-session";
        await createDpopSession(sessionId);
        await removeDpopSession(sessionId);

        await expect(generateDpopProof({
            sessionId,
            endpoint: "https://issuer.example/token"
        })).rejects.toThrow("DPoP session is not available");
    }, 15000);
});
