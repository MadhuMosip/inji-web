const DB_NAME = "inji-web-dpop";
const STORE_NAME = "issuance-sessions";
const DB_VERSION = 1;
const PROOF_LIFETIME_SECONDS = 60;
const RSA_MODULUS_LENGTH = 2048;
const RSA_PUBLIC_EXPONENT = new Uint8Array([1, 0, 1]);

/** JWA alg name selected for DPoP proofs (from AS metadata when possible). */
export type DpopAlg = string;

const DEFAULT_DPOP_ALG = "ES256";

type DpopPublicJwk =
    | {kty: string; crv: string; x: string; y: string}
    | {kty: string; e: string; n: string}
    | {kty: string; crv: string; x: string};

type DpopSession = {
    privateKey: CryptoKey;
    publicJwk: JsonWebKey;
    alg: DpopAlg;
};

type HashName = "SHA-256" | "SHA-384" | "SHA-512";

const hashForAlg = (alg: string): HashName | null => {
    if (alg.endsWith("256")) {
        return "SHA-256";
    }
    if (alg.endsWith("384")) {
        return "SHA-384";
    }
    if (alg.endsWith("512")) {
        return "SHA-512";
    }
    return null;
};

const saltLengthForHash = (hash: HashName): number => {
    if (hash === "SHA-256") {
        return 32;
    }
    if (hash === "SHA-384") {
        return 48;
    }
    return 64;
};

const memorySessions = new Map<string, DpopSession>();

const base64UrlEncode = (value: ArrayBuffer | Uint8Array): string => {
    const bytes = value instanceof Uint8Array ? value : new Uint8Array(value);
    let binary = "";
    bytes.forEach(byte => {
        binary += String.fromCharCode(byte);
    });
    return btoa(binary)
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/g, "");
};

const encodeJson = (value: object): string =>
    base64UrlEncode(new TextEncoder().encode(JSON.stringify(value)));

const openDatabase = (): Promise<IDBDatabase | null> => {
    if (typeof indexedDB === "undefined") {
        return Promise.resolve(null);
    }

    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = () => {
            if (!request.result.objectStoreNames.contains(STORE_NAME)) {
                request.result.createObjectStore(STORE_NAME);
            }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};

const persistSession = async (sessionId: string, session: DpopSession): Promise<void> => {
    memorySessions.set(sessionId, session);
    const database = await openDatabase();
    if (!database) {
        return;
    }

    await new Promise<void>((resolve, reject) => {
        const transaction = database.transaction(STORE_NAME, "readwrite");
        transaction.objectStore(STORE_NAME).put(session, sessionId);
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
    });
    database.close();
};

export const getDpopSession = async (sessionId: string): Promise<DpopSession | null> => {
    const memorySession = memorySessions.get(sessionId);
    if (memorySession) {
        return memorySession;
    }

    const database = await openDatabase();
    if (!database) {
        return null;
    }

    const session = await new Promise<DpopSession | null>((resolve, reject) => {
        const request = database.transaction(STORE_NAME, "readonly")
            .objectStore(STORE_NAME)
            .get(sessionId);
        request.onsuccess = () => resolve(request.result ?? null);
        request.onerror = () => reject(request.error);
    });
    database.close();

    if (session) {
        memorySessions.set(sessionId, session);
    }
    return session;
};

export const selectDpopAlgorithm = (supportedAlgs?: string[]): DpopAlg => {
    if (supportedAlgs && supportedAlgs.length > 0) {
        // Prefer the AS's first advertised algorithm; createDpopSession tries each in order.
        return supportedAlgs[0];
    }
    return DEFAULT_DPOP_ALG;
};

export const isUseDpopNonceError = (errorData: unknown, wwwAuthenticate = ""): boolean => {
    if (wwwAuthenticate.toLowerCase().includes("use_dpop_nonce")) {
        return true;
    }
    if (typeof errorData === "string") {
        return errorData.includes("use_dpop_nonce");
    }
    if (errorData && typeof errorData === "object") {
        const record = errorData as {error?: unknown; message?: unknown};
        if (record.error === "use_dpop_nonce") {
            return true;
        }
        return typeof record.message === "string" && record.message.includes("use_dpop_nonce");
    }
    return false;
};

const generateDpopKeyPair = async (alg: DpopAlg): Promise<CryptoKeyPair> => {
    if (alg === "EdDSA" || alg === "Ed25519") {
        return crypto.subtle.generateKey(
            {name: "Ed25519"} as AlgorithmIdentifier,
            false,
            ["sign", "verify"]
        ) as Promise<CryptoKeyPair>;
    }

    const hash = hashForAlg(alg);
    if (!hash) {
        throw new Error(`Unsupported DPoP algorithm: ${alg}`);
    }

    if (alg.startsWith("ES") && !alg.includes("K")) {
        const namedCurve = alg === "ES256"
            ? "P-256"
            : alg === "ES384"
                ? "P-384"
                : "P-521";
        return crypto.subtle.generateKey(
            {name: "ECDSA", namedCurve},
            false,
            ["sign", "verify"]
        );
    }

    if (alg.startsWith("PS")) {
        return crypto.subtle.generateKey(
            {
                name: "RSA-PSS",
                modulusLength: RSA_MODULUS_LENGTH,
                publicExponent: RSA_PUBLIC_EXPONENT,
                hash
            },
            false,
            ["sign", "verify"]
        );
    }

    if (alg.startsWith("RS")) {
        return crypto.subtle.generateKey(
            {
                name: "RSASSA-PKCS1-v1_5",
                modulusLength: RSA_MODULUS_LENGTH,
                publicExponent: RSA_PUBLIC_EXPONENT,
                hash
            },
            false,
            ["sign", "verify"]
        );
    }

    throw new Error(`Unsupported DPoP algorithm: ${alg}`);
};

const signingAlgorithm = (alg: DpopAlg): AlgorithmIdentifier | RsaPssParams | EcdsaParams => {
    if (alg === "EdDSA" || alg === "Ed25519") {
        return {name: "Ed25519"} as AlgorithmIdentifier;
    }

    const hash = hashForAlg(alg);
    if (!hash) {
        throw new Error(`Unsupported DPoP algorithm: ${alg}`);
    }

    if (alg.startsWith("ES") && !alg.includes("K")) {
        return {name: "ECDSA", hash};
    }
    if (alg.startsWith("PS")) {
        return {name: "RSA-PSS", saltLength: saltLengthForHash(hash)};
    }
    if (alg.startsWith("RS")) {
        return {name: "RSASSA-PKCS1-v1_5"};
    }
    throw new Error(`Unsupported DPoP algorithm: ${alg}`);
};

export const createDpopSession = async (
    sessionId: string,
    supportedAlgs?: string[]
): Promise<string> => {
    // When metadata is present, only use advertised algorithms (RFC 9449).
    // Default to ES256 only when dpop_signing_alg_values_supported is absent/empty.
    const candidates = supportedAlgs?.length ? supportedAlgs : [DEFAULT_DPOP_ALG];
    let alg: DpopAlg | undefined;
    let keyPair: CryptoKeyPair | undefined;

    for (const candidate of candidates) {
        try {
            keyPair = await generateDpopKeyPair(candidate);
            alg = candidate;
            break;
        } catch {
            // Try the next advertised algorithm.
        }
    }

    if (!keyPair || !alg) {
        throw new Error("No advertised DPoP signing algorithm is supported");
    }

    const publicJwk = await crypto.subtle.exportKey("jwk", keyPair.publicKey);
    const session = {privateKey: keyPair.privateKey, publicJwk, alg};
    await persistSession(sessionId, session);
    return calculateJwkThumbprint(publicJwk);
};

export const removeDpopSession = async (sessionId: string): Promise<void> => {
    memorySessions.delete(sessionId);
    const database = await openDatabase();
    if (!database) {
        return;
    }

    await new Promise<void>((resolve, reject) => {
        const transaction = database.transaction(STORE_NAME, "readwrite");
        transaction.objectStore(STORE_NAME).delete(sessionId);
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
    });
    database.close();
};

export const toDpopPublicJwk = (jwk: JsonWebKey): DpopPublicJwk => {
    if (jwk.kty === "RSA") {
        if (!jwk.e || !jwk.n) {
            throw new Error("Invalid RSA public JWK");
        }
        return {
            e: jwk.e,
            kty: jwk.kty,
            n: jwk.n
        };
    }
    if (jwk.kty === "OKP") {
        if (!jwk.crv || !jwk.x) {
            throw new Error("Invalid OKP public JWK");
        }
        return {
            crv: jwk.crv,
            kty: jwk.kty,
            x: jwk.x
        };
    }
    if (!jwk.crv || !jwk.kty || !jwk.x || !jwk.y) {
        throw new Error("Invalid EC public JWK");
    }
    return {
        crv: jwk.crv,
        kty: jwk.kty,
        x: jwk.x,
        y: jwk.y
    };
};

export const calculateJwkThumbprint = async (jwk: JsonWebKey): Promise<string> => {
    const canonicalJwk = JSON.stringify(toDpopPublicJwk(jwk));
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(canonicalJwk));
    return base64UrlEncode(digest);
};

export const normalizeDpopHtu = (endpoint: string): string => {
    const url = new URL(endpoint);
    return `${url.origin}${url.pathname || "/"}`;
};

const createJti = (): string => {
    if (typeof crypto.randomUUID === "function") {
        return crypto.randomUUID();
    }
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, "0"));
    return `${hex.slice(0, 4).join("")}-${hex.slice(4, 6).join("")}-${hex.slice(6, 8).join("")}-${hex.slice(8, 10).join("")}-${hex.slice(10).join("")}`;
};

export const calculateAccessTokenHash = async (accessToken: string): Promise<string> => {
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(accessToken));
    return base64UrlEncode(digest);
};

const resolveSessionAlg = (session: DpopSession): DpopAlg => {
    if (session.alg) {
        return session.alg;
    }
    if (session.publicJwk.kty === "RSA") {
        return "RS256";
    }
    if (session.publicJwk.kty === "OKP") {
        return "EdDSA";
    }
    return DEFAULT_DPOP_ALG;
};

export const generateDpopProof = async ({
    sessionId,
    endpoint,
    method = "POST",
    nonce,
    accessToken
}: {
    sessionId: string;
    endpoint: string;
    method?: string;
    nonce?: string;
    accessToken?: string;
}): Promise<string> => {
    const session = await getDpopSession(sessionId);
    if (!session) {
        throw new Error("DPoP session is not available");
    }

    const alg = resolveSessionAlg(session);
    const issuedAt = Math.floor(Date.now() / 1000);
    const claims: Record<string, string | number> = {
        jti: createJti(),
        htm: method.toUpperCase(),
        htu: normalizeDpopHtu(endpoint),
        iat: issuedAt,
        exp: issuedAt + PROOF_LIFETIME_SECONDS
    };
    if (nonce) {
        claims.nonce = nonce;
    }
    if (accessToken) {
        claims.ath = await calculateAccessTokenHash(accessToken);
    }

    const header = {
        typ: "dpop+jwt",
        alg,
        jwk: toDpopPublicJwk(session.publicJwk)
    };
    const signingInput = `${encodeJson(header)}.${encodeJson(claims)}`;
    const signature = await crypto.subtle.sign(
        signingAlgorithm(alg),
        session.privateKey,
        new TextEncoder().encode(signingInput)
    );
    return `${signingInput}.${base64UrlEncode(signature)}`;
};
