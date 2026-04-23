import { SharedCredentialInfoTile } from "../Common/SharedCredentialInfoTile";
import { SolidButton } from "../Common/Buttons/SolidButton";
import { CancelActionButton } from "../Common/Buttons/CancelActionButton";
import { useTranslation } from "react-i18next";
import unknownVerifierLogo from "../../assets/unknown_verifier_logo.png";
import { useApi } from "../../hooks/useApi";
import { rejectVerifierRequest } from "../../utils/verifierUtils";

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
}

function CredentialShareCard({ verifier, presentationId }: CredentialShareCardProps) {
    const { t } = useTranslation("VerifierTrustPage");
    const { fetchData } = useApi();

    const handleDecline = async () => {
        if (!presentationId) return;

        // If redirectUri exists, follow it directly (same behavior as CredentialRequestModal utility).
        if (verifier?.redirectUri) {
            window.location.href = verifier.redirectUri;
            return;
        }

        await rejectVerifierRequest({
            presentationId,
            fetchData,
            redirectUri: verifier?.redirectUri || null
        });
    };

    return (
        <div className="w-full overflow-hidden rounded-xl border-iw-brand-gradient lg:max-w-[1143px]">
            <div className="h-full w-full rounded-lg">
                <div className="px-4 pt-4 pb-1 flex gap-4">
                    <div className="relative h-12 w-12">
                        <img
                            src={verifier?.logo || unknownVerifierLogo}
                            alt={verifier?.name || "Verifier Logo"}
                            className="h-full w-full rounded"
                        />
                    </div>
                    <div className="w-full">
                        <h1 className="text-[#101828] text-lg font-semibold">{verifier?.name || t(`mainPage.unknownVerifier`)}</h1>
                        <p className="text-[#4A5565] text-md">{t('mainPage.description')}</p>
                        <div className="mt-4 flex justify-between gap-2">
                            <SharedCredentialInfoTile title="enfjenjk"  />
                            <SharedCredentialInfoTile title="enfjenjk" />
                        </div>
                        <div className="flex gap-2 mt-4">
                            <CancelActionButton title="Decline" onClick={handleDecline} />
                            <SolidButton testId="CredentialShareCard-ShareButton" onClick={() => { }} title="Share" fullWidth />
                        </div>
                    </div>
                </div>
                <div className="bg-iw-lightGrayBg text-iw-mediumGrayText h-[37px] border-iw-lightGrayBorder border-t px-4 text-sm flex items-center">
                    {t('mainPage.footerInfo')}
                </div>
            </div>
        </div>
    );
}

export default CredentialShareCard;