import React, {useState} from "react";
import {getCredentialTypeDisplayObjectForCurrentLanguage,} from "../../utils/i18n";
import {ItemBox} from "../Common/ItemBox";
import {buildAuthorizationUrl, generateCodeChallenge, generateRandomString} from "../../utils/misc";
import {addNewSession} from "../../utils/sessions";
import {useSelector} from "react-redux";
import {CredentialProps} from "../../types/components";
import {CodeChallengeObject, CredentialConfigurationObject} from "../../types/data";

import {RootState} from "../../types/redux";
import {DataShareExpiryModal} from "../../modals/DataShareExpiryModal";
import {useUser} from "../../hooks/User/useUser";
import {createDpopSession, removeDpopSession} from "../../utils/dpop";

export const Credential: React.FC<CredentialProps> = (props) => {
    const credentials = useSelector(
        (state: RootState) => state.credentials.credentials
    );

    const authorizationEndpoint = credentials?.authorization_endpoint;
    const grantTypesSupported = credentials?.grant_types_supported;
    const dpopTokenEndpoint = credentials?.token_endpoint;
    const dpopCredentialEndpoint = credentials?.credential_endpoint;
    const dpopSigningAlgs = credentials?.dpop_signing_alg_values_supported;

    const selectedIssuer = useSelector(
        (state: RootState) => state.issuers.selected_issuer
    );
    const [credentialExpiry, setCredentialExpiry] = useState<boolean>(false);
    const language = useSelector((state: RootState) => state.common.language);
    const filteredCredentialConfig: CredentialConfigurationObject =
        props.credentialWellknown;
    const credentialObject = getCredentialTypeDisplayObjectForCurrentLanguage(
        filteredCredentialConfig.display,
        language
    );
    const vcStorageExpiryLimitInTimes = useSelector(
        (state: RootState) => state.common.vcStorageExpiryLimitInTimes
    );
    const {isUserLoggedIn} = useUser();

    const onSuccess = async (
        defaultVCStorageExpiryLimit: number = vcStorageExpiryLimitInTimes
    ) => {
        if (!validateIfAuthServerSupportRequiredGrantTypes(grantTypesSupported)) {
            props.setErrorObj({
                code: "errors.authorizationGrantTypeNotSupportedByWallet.code",
                message:
                    "errors.authorizationGrantTypeNotSupportedByWallet.message"
            });
            return;
        }
        if (!dpopTokenEndpoint || !dpopCredentialEndpoint) {
            props.setErrorObj({
                code: "errors.dpopInitializationFailed.code",
                message: "errors.dpopInitializationFailed.message"
            });
            return;
        }

        const state = generateRandomString();
        const code_challenge: CodeChallengeObject =
            generateCodeChallenge(state);

        try {
            const dpopJkt = await createDpopSession(state, dpopSigningAlgs);
            addNewSession({
                selectedIssuer: selectedIssuer,
                selectedCredentialType: {type: filteredCredentialConfig.name, displayObj: filteredCredentialConfig.display},
                codeVerifier: state,
                vcStorageExpiryLimitInTimes: isNaN(defaultVCStorageExpiryLimit)
                    ? vcStorageExpiryLimitInTimes
                    : defaultVCStorageExpiryLimit,
                state: state,
                dpopTokenEndpoint,
                dpopCredentialEndpoint
            });
            const url = buildAuthorizationUrl(
                selectedIssuer,
                filteredCredentialConfig,
                state,
                code_challenge,
                authorizationEndpoint!,
                dpopJkt
            );
            window.open(url, "_self", "noopener");
        } catch (error) {
            await removeDpopSession(state);
            props.setErrorObj({
                code: "errors.dpopInitializationFailed.code",
                message: "errors.dpopInitializationFailed.message"
            });
        }
    };

    const validateIfAuthServerSupportRequiredGrantTypes = (
        grantTypesSupported: string[] | undefined
    ) => {
        const supportedGrantTypes = ["authorization_code"];

        if (grantTypesSupported) {
            return grantTypesSupported.some((grantType: string) =>
                supportedGrantTypes.includes(grantType)
            );
        }
        return false;
    };

    return (
        <React.Fragment>
            <ItemBox
                index={props.index}
                url={credentialObject.logo}
                title={credentialObject.name}
                onClick={() => {
                    isUserLoggedIn() || selectedIssuer.qr_code_type !== "OnlineSharing"
                                                    ? onSuccess(-1)
                                                    : setCredentialExpiry(true);
                }}
                testId={filteredCredentialConfig.name}
            />
            {credentialExpiry && (
                <DataShareExpiryModal
                    onCancel={() => setCredentialExpiry(false)}
                    onSuccess={onSuccess}
                    credentialName={credentialObject.name}
                    credentialLogo={credentialObject.logo}
                />
            )}
        </React.Fragment>
    );
};
