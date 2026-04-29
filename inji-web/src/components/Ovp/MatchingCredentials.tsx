import { useNavigate } from "react-router-dom";
import {VCCardView} from "../VC/VCCardView";
import {WalletCredential} from "../../types/data";
import { NoMatchingCredentialsModal } from "../../modals/NoMatchingCredentialsModal";
import { ROUTES } from "../../utils/constants";
import checkCircle from "../../assets/checkCircleTwo.svg";
import { useTranslation } from "react-i18next";
import { MatchingCredentialsStyles } from "./OvpPageStyles"

interface MatchingCredentialsProps {
    credentials?: WalletCredential[] | null;
    refreshCredentials?: () => void;
    selectedCredentialIds?: string[];
    onCredentialSelect?: (id: string, isSelected: boolean) => void;
    presentationId?: string;
    redirectUri?: string | null;
    missingClaims?: string[];
}

function MatchingCredentials({
    credentials,
    refreshCredentials,
    selectedCredentialIds = [],
    onCredentialSelect,
    presentationId,
    redirectUri,
    missingClaims = [],
}: MatchingCredentialsProps) {
    const navigate = useNavigate();
    const { t } = useTranslation("VerifierTrustPage");

    return (
        <div className="my-[20px]">
            {credentials?.length === 0 ? (
                <NoMatchingCredentialsModal
                    isVisible
                    missingClaims={missingClaims}
                    onGoToHome={() => navigate(ROUTES.ROOT)}
                    redirectUri={redirectUri ?? null}
                    presentationId={presentationId}
                />
             ) : 
                <div className={MatchingCredentialsStyles.mainContainer}>
                    {credentials?.map((credential, index) => {
                        const isSelected = selectedCredentialIds.includes(credential.credentialId);
                        return (
                            <div key={credential.credentialId || index} className={`${MatchingCredentialsStyles.outerCredentialTile} ${isSelected ? 'border-iw-successBg' : 'border-iw-lightGrayBorder'}`}>
                                <div
                                    className={MatchingCredentialsStyles.innerCredentialTile}
                                    onClick={() => {
                                        if (onCredentialSelect) {
                                            onCredentialSelect(credential.credentialId, !isSelected);
                                        }
                                    }}
                                >
                                    {isSelected ? (
                                        <>  
                                            <div className={MatchingCredentialsStyles.credentialCheckbox}>
                                              <img src={checkCircle} alt="success" className="w-[14px] h-[14px]" />
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
        </div>
    )
};

export default MatchingCredentials;