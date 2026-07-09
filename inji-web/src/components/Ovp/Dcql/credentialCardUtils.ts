import { WalletCredential } from "../../../types/data";
import { DcqlCredentialActionVariant } from "./DcqlCredentialOptionCard";

function isSdJwtCredential(credential: WalletCredential): boolean {
    return credential.format.includes("sd-jwt");
}

export function getCredentialActionVariant(
    credential: WalletCredential
): DcqlCredentialActionVariant {
    if (isSdJwtCredential(credential)) {
        return "shareableFields";
    }

    return "viewCard";
}