import { WalletCredential } from "../../../../types/data";
import { getCredentialActionVariant } from "../../../../components/Ovp/Dcql/credentialCardUtils";

const makeCredential = (format: string): WalletCredential => ({
    credentialId: "cred-1",
    credentialTypeDisplayName: "Test Credential",
    credentialTypeLogo: "",
    issuerDisplayName: "Issuer",
    issuerLogo: "",
    format,
});

describe("credentialCardUtils", () => {
    test("returns shareableFields for SD-JWT credentials", () => {
        expect(
            getCredentialActionVariant(makeCredential("dc+sd-jwt"))
        ).toBe("shareableFields");
        expect(
            getCredentialActionVariant(makeCredential("vc+sd-jwt"))
        ).toBe("shareableFields");
    });

    test("returns viewCard for LDP-VC credentials", () => {
        expect(getCredentialActionVariant(makeCredential("ldp_vc"))).toBe(
            "viewCard"
        );
    });
});
