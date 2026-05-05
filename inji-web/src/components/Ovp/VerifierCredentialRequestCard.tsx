import React, { useState } from "react";
import { SharedCredentialInfoTile } from "./SharedCredentialInfoTile";
import { SolidButton } from "../Common/Buttons/SolidButton";
import { CancelActionButton } from "../Common/Buttons/CancelActionButton";
import { useTranslation } from "react-i18next";
import unknownVerifierLogo from "../../assets/unknown_verifier_logo.png";
import shieldIcon from "../../assets/Sheild.svg";
import arrowRight from "../../assets/arrowRight.svg";
import { useApi } from "../../hooks/useApi";
import { rejectVerifierRequest } from "../../utils/verifierUtils";
import { WalletCredential } from "../../types/data";
import { VerifierCredentialsRequestCardStyles } from "./OvpPageStyles";
import ConsentRequiredModal from "../../modals/ConsentRequiredModal";

export interface Verifier {
    id: string;
    logo?: string | null;
    name: string;
    preregisteredWithWallet?: boolean;
    redirectUri?: string | null;
    trusted?: boolean;
}

interface CredentialShareCardProps {
    verifier: Verifier | null;
    presentationId: string | null;
    credentials?: WalletCredential[] | null;
    selectedCredentialIds?: string[];
    onShareCredentials?: () => void;
}

function VerifierCredentialsRequestCard({ verifier, presentationId, credentials, selectedCredentialIds = [], onShareCredentials }: CredentialShareCardProps) {
    const { t } = useTranslation("VerifierTrustPage");
    const { fetchData } = useApi();
    const [declineDisabled, setDeclineDisabled] = useState(false);
    const [showConsentRequiredModal, setConsentRequiredModal] = useState(false);
    const credentialCount = selectedCredentialIds.length;

    const handleDecline = async () => {
        if (!presentationId || declineDisabled) return;
        setDeclineDisabled(true);

        // If redirectUri exists, follow it directly (same behavior as CredentialRequestModal utility).
        if (verifier?.redirectUri) {
            window.location.href = verifier.redirectUri;
            return;
        }

        try {
            const ok = await rejectVerifierRequest({
                presentationId,
                fetchData,
                redirectUri: verifier?.redirectUri || null
            });
            if (!ok) {
                setDeclineDisabled(false);
            }
        } catch {
            setDeclineDisabled(false);
        }
    };

    const consentModalLabels = {
        title: t("consentRequiredModal.title"),
        description: t("consentRequiredModal.description", {
            verifierName: verifier?.name || t("mainPage.unknownVerifier")
        }),
        credentialsTitle: t("consentRequiredModal.credentialsTitle", { count: credentialCount }),
        credentialsDescription: t("consentRequiredModal.credentialsDescription"),
        consentButtonTitle: t("consentRequiredModal.consentButtonTitle"),
        backButtonTitle: t("consentRequiredModal.backButtonTitle")
    };

    return (
        <div className={VerifierCredentialsRequestCardStyles.mainContainer} data-testid="verifier-credentials-request-card">
            <div className={VerifierCredentialsRequestCardStyles.requestDetails}>
                <div className={VerifierCredentialsRequestCardStyles.verifierDetails}>
                    <img
                        src={verifier?.logo || unknownVerifierLogo}
                        alt={verifier?.name || "Verifier Logo"}
                        className="h-12 w-12 rounded"
                        data-testid="verifier-logo"
                    />
                    <div className="w-full">
                        <h1 data-testid="verifier-name" className={VerifierCredentialsRequestCardStyles.verifierName}>{verifier?.name || t(`mainPage.unknownVerifier`)}</h1>
                        <p className={VerifierCredentialsRequestCardStyles.credentialReqDesc}>{t('mainPage.description')}</p>
                    </div>
                </div>
                <div className="w-full lg:pl-14">
                    <div className={VerifierCredentialsRequestCardStyles.sharedCredentialsTiles} data-testid="shared-credentials-tiles">
                        {credentials?.map((cred, idx) => {
                            const isSelected = selectedCredentialIds.includes(cred.credentialId);
                            return (
                                <SharedCredentialInfoTile key={cred.credentialId || idx} title={cred.credentialTypeDisplayName || 'Credential'} isSelected={isSelected} />
                            );
                        })}
                    </div>
                    <div className={VerifierCredentialsRequestCardStyles.actionButtons}>
                        <div className={VerifierCredentialsRequestCardStyles.shareButtonCard}>
                            <SolidButton
                                testId="show-consent-modal-button"
                                onClick={() => setConsentRequiredModal(true)}
                                title={t("credentialTile.shareCredentialsButton")}
                                className="h-12 py-0 break-words min-w-0 w-full"
                                icon={
                                    <div className="flex items-center gap-2">
                                        <img src={shieldIcon} alt="shield" className="w-5 h-5" />
                                    </div>
                                }
                                fullWidth
                                disabled={selectedCredentialIds.length === 0}
                                iconTwo={
                                    <div className="flex items-center gap-2">
                                        <img src={arrowRight} alt="arrow" className="w-5 h-5" />
                                    </div>
                                }
                            />
                        </div>
                        <div className={VerifierCredentialsRequestCardStyles.declineButton}>
                            <CancelActionButton
                                testId="verifier-decline-button"
                                title={t("credentialTile.shareCredentialsDeclineButton")}
                                onClick={handleDecline}
                                disabled={declineDisabled}

                            />
                        </div>

                    </div>
                </div>
            </div>
            <div className={VerifierCredentialsRequestCardStyles.footer}>
                {t('mainPage.footerInfo')}
            </div>
            {showConsentRequiredModal && (
                <ConsentRequiredModal
                    title={consentModalLabels.title}
                    description={consentModalLabels.description}
                    credentialsTitle={consentModalLabels.credentialsTitle}
                    credentialsDescription={consentModalLabels.credentialsDescription}
                    consentButtonTitle={consentModalLabels.consentButtonTitle}
                    backButtonTitle={consentModalLabels.backButtonTitle}
                    onConfirm={() => onShareCredentials?.()}
                    onBack={() => setConsentRequiredModal(false)}
                />
            )}
        </div>
    );
}

export default VerifierCredentialsRequestCard;