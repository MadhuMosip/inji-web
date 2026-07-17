import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ModalWrapper } from "./ModalWrapper";
import { useTranslation } from "react-i18next";
import { SolidButton } from "../components/Common/Buttons/SolidButton";
import { CloseIconButton } from "../components/Common/Buttons/CloseIconButton";
import { useApi } from "../hooks/useApi";
import { api } from "../utils/api";
import { useApiErrorHandler } from "../hooks/useApiErrorHandler";
import { ErrorCard } from "./ErrorCard";
import { NoMatchingCredentialsModalStyles } from "./NoMatchingCredentialsModalStyles";
import RedShield from "../assets/RedShield.svg";
import TrustedIcon from "../assets/TrustedIcon.svg";
import unknownVerifierLogo from "../assets/unknown_verifier_logo.png";
import { RequirementInfoVerifier } from "./CredentialRequirementInfoModal";
import { PresentationCredential } from "../types/components";
import { MissingClaimsListModal } from "./MissingClaimsListModal";
import { formatMissingClaimLabel } from "../utils/dcqlSelectionUtils";
import { safeExternalRedirect } from "../utils/navigationUtils";
import Shield from "../assets/FullRedShield.svg";
import emptyLeftArrow from "../assets/emptyLeftArrow.svg";

const INITIAL_VISIBLE_CLAIMS = 3;

export interface NoMatchingCredentialsModalProps {
    isVisible: boolean;
    missingClaims?: string[];
    matchingCredentials?: PresentationCredential[];
    verifier?: RequirementInfoVerifier | null;
    verifierContactUrl?: string | null;
    onGoToHome?: () => void;
    onClose?: () => void;
    redirectUri?: string | null;
    presentationId?: string;
}

export const NoMatchingCredentialsModal: React.FC<NoMatchingCredentialsModalProps> = ({
    isVisible,
    missingClaims = [],
    matchingCredentials = [],
    verifier,
    verifierContactUrl,
    onGoToHome,
    onClose,
    redirectUri,
    presentationId,
}) => {
    const { t } = useTranslation("NoMatchingCredentialsModal");
    const styles = NoMatchingCredentialsModalStyles;
    const { fetchData: rejectVerifier } = useApi<{
        success: boolean;
        redirectUri?: string | null;
    }>();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showFullClaimsList, setShowFullClaimsList] = useState(false);

    useEffect(() => {
        if (!isVisible) {
            setShowFullClaimsList(false);
        }
    }, [isVisible]);

    const {
        showError,
        errorDescription,
        errorTitle,
        isRetrying,
        handleApiError,
        onClose: handleModalClose,
        onRetry,
    } = useApiErrorHandler({ onClose: onGoToHome });

    const verifierName = verifier?.name?.trim() || t("unknownVerifier");

    const visibleClaims = useMemo(() => {
        if (missingClaims.length <= INITIAL_VISIBLE_CLAIMS) {
            return missingClaims;
        }
        return missingClaims.slice(0, INITIAL_VISIBLE_CLAIMS);
    }, [missingClaims]);

    const hiddenClaimsCount = Math.max(
        missingClaims.length - INITIAL_VISIBLE_CLAIMS,
        0
    );

    const hasMatchingCredentials = matchingCredentials.length > 0;

    const handleExit = useCallback(
        (nextRedirectUri = "") => {
            if (nextRedirectUri) {
                safeExternalRedirect(nextRedirectUri);
            } else if (onGoToHome) {
                onGoToHome();
            }
        },
        [onGoToHome]
    );

    const rejectVerifierCallback = useCallback(async () => {
        const rejectPayload = {
            errorCode: "invalid_transaction_data",
            errorMessage: "No matching credentials found to fulfill the request",
        };

        const response = await rejectVerifier({
            url: api.userRejectVerifier.url(presentationId!),
            apiConfig: api.userRejectVerifier,
            body: rejectPayload,
        });

        return response;
    }, [rejectVerifier, presentationId]);

    const handleContinueWithAvailableCredentials = useCallback(() => {
        if (onClose) {
            onClose();
            return;
        }
        onGoToHome?.();
    }, [onClose, onGoToHome]);

    const handleGoToHome = useCallback(async () => {
        if (isSubmitting || isRetrying) {
            return;
        }

        if (hasMatchingCredentials) {
            handleContinueWithAvailableCredentials();
            return;
        }

        setIsSubmitting(true);

        if (!presentationId) {
            handleExit();
            if (!redirectUri) setIsSubmitting(false);
            return;
        }

        try {
            const response = await rejectVerifierCallback();
            const responseRedirectUri = response?.data?.redirectUri || "";
            if (response.ok()) {
                handleExit(responseRedirectUri);
            } else {
                throw response.error || new Error("Failed to reject verifier");
            }
            if (!responseRedirectUri) setIsSubmitting(false);
        } catch (err) {
            handleApiError(err, "rejectVerifier", rejectVerifierCallback, handleExit);
            setIsSubmitting(false);
        }
    }, [
        isSubmitting,
        isRetrying,
        hasMatchingCredentials,
        handleContinueWithAvailableCredentials,
        presentationId,
        rejectVerifierCallback,
        handleExit,
        handleApiError,
        redirectUri,
    ]);

    const handleClose = useCallback(() => {
        if (onClose) {
            onClose();
            return;
        }
        void handleGoToHome();
    }, [onClose, handleGoToHome]);

    if (!isVisible) return null;

    if (showError) {
        return (
            <ErrorCard
                isOpen={true}
                title={errorTitle}
                description={errorDescription}
                onClose={handleModalClose}
                onRetry={onRetry}
                isRetrying={isRetrying}
                testId="modal-error-handler-no-matching"
            />
        );
    }

    if (showFullClaimsList) {
        return (
            <MissingClaimsListModal
                isVisible
                missingClaims={missingClaims}
                onBack={() => setShowFullClaimsList(false)}
            />
        );
    }

    return (
        <div
            data-testid="card-no-matching-credentials-modal"
            className="w-full transition-all duration-300 ease-in-out"
        >
            <ModalWrapper
                zIndex={50}
                size="3xl"
                header={<></>}
                footer={<></>}
                content={
                    <div className={styles.wrapper}>
                        <div className={styles.closeButtonContainer}>
                            <CloseIconButton
                                onClick={handleClose}
                                btnClassName={styles.closeButton}
                                iconClassName="h-4 w-4"
                                btnTestId="btn-close-no-matching-credentials"
                            />
                        </div>
                        <div className={styles.headerSection}>
                            <div className={styles.iconContainer}>
                                <img
                                    src={Shield}
                                    alt=""
                                    className={styles.iconImage}
                                    data-testid="img-no-matching-credentials-icon"
                                    aria-hidden
                                />
                            </div>

                            <h2
                                id="title-no-matching-credentials"
                                className={styles.title}
                            >
                                {t("title")}
                            </h2>
                            <p
                                data-testid="text-no-matching-credentials-description"
                                className={styles.claimsIntro}
                            >
                                {t("claimsIntro")}
                            </p>
                        </div>

                        <div className={styles.scrollArea}>
                        {missingClaims.length > 0 && (
                            <div
                                className={styles.claimsCard}
                                data-testid="no-matching-claims-list"
                            >
                                <p className={styles.sectionLabel}>
                                    {t("missingInfoLabel")}
                                </p>
                                <ul className={styles.claimsList}>
                                    {visibleClaims.map((claim) => (
                                        <li
                                            key={claim}
                                            className={styles.claimItem}
                                        >
                                            <span
                                                className={styles.claimBullet}
                                                aria-hidden
                                            />
                                            <span>{formatMissingClaimLabel(claim)}</span>
                                        </li>
                                    ))}
                                </ul>
                                {hiddenClaimsCount > 0 && (
                                    <button
                                        type="button"
                                        className={styles.showMoreButton}
                                        data-testid="btn-show-more-claims"
                                        onClick={() => setShowFullClaimsList(true)}
                                    >
                                        <span>{t("showMore", {
                                            count: hiddenClaimsCount,
                                        })}</span>
                                        <img src={emptyLeftArrow} className="h-2.5 w-2.5 mt-1" />
                                    </button>
                                )}
                            </div>
                        )}

                        <p className={styles.sectionLabel}>{t("whatYouCanDo")}</p>
                        <div
                            className={styles.actionCard}
                            data-testid="no-matching-verifier-card"
                        >
                            <div className={styles.verifierRow}>
                                <div className={styles.verifierLogoWrapper}>
                                    <img
                                        src={verifier?.logo || unknownVerifierLogo}
                                        alt=""
                                        className={styles.verifierLogo}
                                        data-testid="no-matching-verifier-logo"
                                    />
                                </div>
                                <div className="min-w-0 flex flex-col">
                                    <div className="flex items-center gap-1">
                                        <p
                                            className={styles.verifierName}
                                            data-testid="no-matching-verifier-name"
                                        >
                                            {verifierName}
                                        </p>
                                        {verifier?.trusted && (
                                            <img
                                                src={TrustedIcon}
                                                alt=""
                                                className="h-3 w-3 shrink-0"
                                                data-testid="no-matching-verifier-trusted-badge"
                                                aria-hidden
                                            />
                                        )}
                                    </div>
                                </div>
                            </div>
                            <p className={styles.verifierHelp}>{t("verifierHelp")}</p>
                        </div>

                        {matchingCredentials.length > 0 && (
                            <>
                                <p className={styles.sectionLabel}>
                                    {t("matchingCards")}
                                </p>
                                <div
                                    className={styles.matchingCardsCard}
                                    data-testid="no-matching-cards-list"
                                >
                                    <ul className="flex flex-col">
                                        {matchingCredentials.map((credential) => (
                                            <li
                                                key={credential.credentialId}
                                                className={styles.matchingCardRow}
                                                data-testid={`no-matching-card-${credential.credentialId}`}
                                            >
                                                <div
                                                    className={
                                                        styles.matchingCardLogoWrapper
                                                    }
                                                >
                                                    <img
                                                        src={
                                                            credential.credentialTypeLogo
                                                        }
                                                        alt={
                                                            credential.credentialTypeDisplayName
                                                        }
                                                        className={
                                                            styles.matchingCardLogo
                                                        }
                                                    />
                                                </div>
                                                <span
                                                    className={styles.matchingCardName}
                                                >
                                                    {
                                                        credential.credentialTypeDisplayName
                                                    }
                                                </span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </>
                        )}
                        </div>

                        <SolidButton
                            testId="btn-go-to-home"
                            onClick={handleGoToHome}
                            title={
                                hasMatchingCredentials
                                    ? t("continueWithAvailableButton")
                                    : t("goToHomeButton")
                            }
                            fullWidth
                            disabled={isSubmitting || isRetrying}
                            className={styles.footerButton}
                        />
                    </div>
                }
            />
        </div>
    );
};
