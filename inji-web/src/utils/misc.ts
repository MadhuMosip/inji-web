import sha256 from 'crypto-js/sha256';
import Base64 from 'crypto-js/enc-base64';
import {api} from "./api";
import {
    CodeChallengeObject,
    CredentialConfigurationObject,
    CredentialRequestBody,
    IssuerObject,
    TokenRequestBody,
    TokenResponse
} from '../types/data';

export const generateCodeChallenge = (verifier = generateRandomString()) => {
    const hashedVerifier = sha256(verifier);
    const base64Verifier = Base64.stringify(hashedVerifier);
    return {
        codeChallenge: base64Verifier
            .replace(/=/g, '')
            .replace(/\+/g, '-')
            .replace(/\//g, '_'),
        codeVerifier: verifier
    };
}

export const generateRandomString = (length = 43, charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~') => {
    const charsetLength = charset.length;
    const randomString = [];
    const maxValidSelector = Math.floor(0x100000000 / charsetLength) * charsetLength;
    
    while (randomString.length < length) {
        const array = new Uint32Array(1);
        const randomValue = crypto.getRandomValues(array)[0];

        // Reject values outside the max valid range to avoid bias
        if (randomValue < maxValidSelector) {
            const index = randomValue % charsetLength;
            randomString.push(charset[index]);
        }
    }

    return randomString.join('');
};

export const isObjectEmpty = (object: any) => {
    return object === null || object === undefined || Object.keys(object).length === 0;
}

export const buildAuthorizationUrl = (
    selectedIssuer: IssuerObject,
    filteredCredentialConfig: CredentialConfigurationObject,
    state: string,
    codeChallenge: CodeChallengeObject,
    authorizationEndpoint: string,
    dpopJkt?: string
  ): string => {
    return api.authorization(
      selectedIssuer,
      filteredCredentialConfig,
      state,
      codeChallenge,
      authorizationEndpoint,
      dpopJkt
    );
  };
  
export const getTokenRequestBody = (code: string, codeVerifier: string): TokenRequestBody => {
    return {
        'grant_type': 'authorization_code',
        'code': code,
        'redirect_uri': api.authorizationRedirectionUrl,
        'code_verifier': codeVerifier
    };
};

export const getCredentialRequestBody = (
    issuerId: string,
    credentialConfigurationId: string,
    vcStorageExpiryLimitInTimes: string,
    tokenResponse: TokenResponse,
    isLoggedIn: boolean
): CredentialRequestBody => {
    if (isLoggedIn) {
        return {
            issuer: issuerId,
            credentialConfigurationId,
            accessToken: tokenResponse.access_token,
            tokenType: tokenResponse.token_type,
            cNonce: tokenResponse.c_nonce
        };
    }
    return {
        issuer: issuerId,
        credential: credentialConfigurationId,
        vcStorageExpiryLimitInTimes,
        access_token: tokenResponse.access_token,
        ...(tokenResponse.token_type ? {token_type: tokenResponse.token_type} : {}),
        ...(tokenResponse.c_nonce ? {c_nonce: tokenResponse.c_nonce} : {})
    };
}

export const downloadCredentialPDF = async (
    response: Blob,
    fileName: string
) => {
    const url = window.URL.createObjectURL(response);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", fileName);
    link.setAttribute("target", "_blank");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
};

export const getErrorObject = (downloadResponse: any) => {
    const errorCode = downloadResponse?.errors ? downloadResponse?.errors[0]?.errorCode : "";
    if([
        "errMissingIssuanceDate",
        "errInvalidIssuanceDate",
        "errIssuanceDateIsFutureDate",
        "errInvalidExpirationDate",
        "errVcExpired",
        "errInvalidValidFrom",
        "errValidFromIsFutureDate",
        "errInvalidValidUntil"
    ].indexOf(errorCode) !== -1 ){
        return {
            code: `error.verification.${errorCode}.title`,
            message: `error.verification.${errorCode}.subTitle`
        }
    }
    return {
        code: "error.generic.title",
        message: "error.generic.subTitle"
    }
}
export const convertStringIntoPascalCase = (text: string | undefined) => {
    return (
        text?.toLocaleLowerCase()
            .split(' ')
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ')
    );
};

/** Aligned with mobile wallet `formatKeyLabel` for consistent claim/key display names. */
export const formatKeyLabel = (key: string): string => {
    return key
        .replace(/\[\d+\]/g, '')
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .split(/[_\s]+/)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
};