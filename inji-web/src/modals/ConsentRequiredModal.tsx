import { ModalWrapper } from "./ModalWrapper";
import { SolidButton } from "../components/Common/Buttons/SolidButton";
import ShieldIcon from "../assets/Shield-gray.svg";
import { ModalStyles } from "./ModalStyles";

interface ConsentRequiredModalProps {
    title: string;
    description: string;
    credentialsTitle: string;
    credentialsDescription: string;
    consentButtonTitle: string;
    backButtonTitle: string;
    onConfirm?: () => void;
    onBack?: () => void;
}

function ConsentRequiredModal({
    title,
    description,
    credentialsTitle,
    credentialsDescription,
    consentButtonTitle,
    backButtonTitle,
    onConfirm,
    onBack
}: ConsentRequiredModalProps) {
    return(
        <div>
            <ModalWrapper
                zIndex={50}
                size="md"
                header={<></>}
                footer={<></>}
                content={
                    <div className={ModalStyles.consentRequiredModal.container}>
                        <h2 className={ModalStyles.consentRequiredModal.title}>{title}</h2>
                        <p className={ModalStyles.consentRequiredModal.description}>{description}</p>
                        <div className={ModalStyles.consentRequiredModal.credentialsContainer}>
                            <p className={ModalStyles.consentRequiredModal.credentialsTitle}><img src={ShieldIcon} alt="Shield icon" />{credentialsTitle}</p>
                            <p className={ModalStyles.consentRequiredModal.credentialsDescription}>{credentialsDescription}</p>
                        </div>
                        <SolidButton
                                testId="CredentialShareCard-ShareButton"
                                onClick={() => onConfirm?.()}
                                title={consentButtonTitle}
                                className={ModalStyles.consentRequiredModal.confirmButton}
                        />
                        <button type="button" className={ModalStyles.consentRequiredModal.backButton} onClick={() => onBack?.()}>{backButtonTitle}</button>
                    </div>
                }
            />
        </div>
    )
}

export default ConsentRequiredModal;