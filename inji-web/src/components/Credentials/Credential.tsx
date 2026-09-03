import React, {useState} from "react";
import {getCredentialTypeDisplayObjectForCurrentLanguage,} from "../../utils/i18n";
import {ItemBox} from "../Common/ItemBox";
import {createAuthorizationUrl, generateCodeChallenge, generateRandomString} from "../../utils/misc";
import {api} from "../../utils/api";
import {addNewSession} from "../../utils/sessions";
import {useSelector} from "react-redux";
import {CredentialProps} from "../../types/components";
import {CredentialConfigurationObject} from "../../types/data";

import {RootState} from "../../types/redux";
import {DataShareExpiryModal} from "../../modals/DataShareExpiryModal";
import {useUser} from "../../hooks/User/useUser";

export const Credential: React.FC<CredentialProps> = (props) => {
    const credentials = useSelector(
        (state: RootState) => state.credentials.credentials
    );

    const grantTypesSupported = credentials?.grant_types_supported;

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
        if (!selectedIssuer?.issuer_id || !filteredCredentialConfig.scope) {
            props.setErrorObj({
                code: "errors.dpopInitializationFailed.code",
                message: "errors.dpopInitializationFailed.message"
            });
            return;
        }

        const state = generateRandomString();
        const {codeChallenge} = generateCodeChallenge(state);

        try {
            const authorizationUrl = await createAuthorizationUrl(selectedIssuer.issuer_id, {
                state,
                codeChallenge,
                codeChallengeMethod: "S256",
                redirectUri: api.authorizationRedirectionUrl,
                scope: filteredCredentialConfig.scope,
                responseType: "code",
                uiLocales: language
            });
            addNewSession({
                selectedIssuer: selectedIssuer,
                selectedCredentialType: {type: filteredCredentialConfig.name, displayObj: filteredCredentialConfig.display},
                codeVerifier: state,
                vcStorageExpiryLimitInTimes: isNaN(defaultVCStorageExpiryLimit)
                    ? vcStorageExpiryLimitInTimes
                    : defaultVCStorageExpiryLimit,
                state: state
            });
            window.open(authorizationUrl, "_self", "noopener");
        } catch (error) {
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
