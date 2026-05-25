import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {VCCardView} from "../VC/VCCardView";
import { SelectedSdClaimsMap, WalletCredential } from "../../types/data";
import { NoMatchingCredentialsModal } from "../../modals/NoMatchingCredentialsModal";
import { ROUTES } from "../../utils/constants";
import checkCircle from "../../assets/checkCircleTwo.svg";
import { useTranslation } from "react-i18next";
import { MatchingCredentialsStyles } from "./OvpPageStyles"
import { credentialsReducer } from "../../redux/reducers/credentialsReducer";
import SDClaimsSelectionModal from "../../modals/SDClaimsSelectionModal";

interface MatchingCredentialsProps {
    credentials?: WalletCredential[] | null;
    refreshCredentials?: () => void;
    selectedCredentialIds?: string[];
    onCredentialSelect?: (id: string, isSelected: boolean) => void;
    onSdClaimsConfirm?: (credentialId: string, selectedClaimPaths: string[]) => void;
    selectedSdClaimsByCredential?: SelectedSdClaimsMap;
    presentationId?: string;
    redirectUri?: string | null;
    missingClaims?: string[];
}

function MatchingCredentials({
    credentials,
    refreshCredentials,
    selectedCredentialIds = [],
    onCredentialSelect,
    onSdClaimsConfirm,
    selectedSdClaimsByCredential = {},
    presentationId,
    redirectUri,
    missingClaims = [],
}: MatchingCredentialsProps) {
    const navigate = useNavigate();
    const { t } = useTranslation("VerifierTrustPage");
    const [showSDClaimsSelectionModal, setShowSDClaimsSelectionModal] = useState(false);
    const [seletedSDJWT, setSelectedSDJWT] = useState<WalletCredential | null>(null);
    
    const handleCredentialSelect = (credential: WalletCredential) => {
        setSelectedSDJWT(credential);
        if(credential.format.includes("sd-jwt")){
            setShowSDClaimsSelectionModal(true);
            return;
        }
        if (onCredentialSelect) {
            const isSelected = selectedCredentialIds.includes(credential.credentialId);
            onCredentialSelect(credential.credentialId, !isSelected);
        }
    };

    return (
        <div className="my-[20px]" data-testid="matching-credentials-container">
            {credentials?.length === 0 ? (
                <NoMatchingCredentialsModal
                    isVisible
                    missingClaims={missingClaims}
                    onGoToHome={() => navigate(ROUTES.ROOT)}
                    redirectUri={redirectUri ?? null}
                    presentationId={presentationId}
                />
             ) : 
                <div className={MatchingCredentialsStyles.mainContainer} data-testid="matching-credentials-list">
                    {credentials?.map((credential, index) => {
                        const credentialKey = credential.credentialId || String(index);
                        const isSelected = selectedCredentialIds.includes(credential.credentialId);
                        return (
                            <div
                                key={credentialKey}
                                data-testid={`matching-credentials-tile-${credentialKey}`}
                                className={`${MatchingCredentialsStyles.outerCredentialTile} ${isSelected ? 'border-iw-successBg' : 'border-iw-lightGrayBorder'}`}
                            >
                                <div
                                    data-testid={`matching-credentials-tile-header-${credentialKey}`}
                                    className={MatchingCredentialsStyles.innerCredentialTile}
                                    onClick={() => handleCredentialSelect(credential)}
                                >
                                    {isSelected ? (
                                        <>  
                                            <div className={MatchingCredentialsStyles.credentialCheckbox}>
                                              <img data-testid={`matching-credentials-selected-icon-${credentialKey}`} src={checkCircle} alt="success" className="w-[14px] h-[14px]" />
                                            </div>
                                            <span className="text-iw-successText italic">{t("credentialTile.selectedTitle")}</span>
                                        </>
                                    ) : (
                                        <>
                                            <div className={MatchingCredentialsStyles.credentialEmptyCheckbox}></div>
                                            <span className="italic">{t("credentialTile.unselectedTitle")}</span>
                                        </>
                                    )}
                                </div>
                                <div className={MatchingCredentialsStyles.vcViewCard}>
                                    <VCCardView
                                        credential={credential}
                                        refreshCredentials={refreshCredentials || (() => {})}
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>
            }
            {showSDClaimsSelectionModal && (
                <SDClaimsSelectionModal
                    key={seletedSDJWT?.credentialId}
                    seletedSDJWT={seletedSDJWT}
                    closeModal={setShowSDClaimsSelectionModal}
                    initialSelectedSdClaims={
                        seletedSDJWT
                            ? selectedSdClaimsByCredential[seletedSDJWT.credentialId]
                            : undefined
                    }
                    onConfirm={(credentialId, selectedClaimPaths) => {
                        onSdClaimsConfirm?.(credentialId, selectedClaimPaths);
                        if (onCredentialSelect) {
                            onCredentialSelect(credentialId, true);
                        }
                    }}
                />
            )}
        </div>
    )
};

export default MatchingCredentials;