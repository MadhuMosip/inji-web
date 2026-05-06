import { ModalWrapper } from "./ModalWrapper";
import { SolidButton } from "../components/Common/Buttons/SolidButton";
import { ModalStyles } from "./ModalStyles";
import CustomButton from "../components/Common/Buttons/CustomButton";


function LeaveConfirmationModal({confirmLeave, cancelLeave, title, description, confirmBtnTitle, cancelBtnTitle}: {confirmLeave: () => void, cancelLeave: () => void, title: string, description: string, confirmBtnTitle: string, cancelBtnTitle: string}) {
    return (
        <ModalWrapper
            zIndex={50}
            size="sm"
            header={<></>}
            footer={<></>}
            content={
                <div className={ModalStyles.leaveConfirmationModal.container}>
                    <h2 className={ModalStyles.leaveConfirmationModal.title}>{title}</h2>
                    <p className={ModalStyles.leaveConfirmationModal.description}>{description}</p>
                    <SolidButton
                        testId="LeaveConfirmationModal-LeaveButton"
                        onClick={() => confirmLeave()} // Replace with actual leave logic
                        title={confirmBtnTitle}
                        className={ModalStyles.leaveConfirmationModal.leaveButton}
                    />
                    <CustomButton  testId="closeBackPopup" onClick={() => cancelLeave()} title={cancelBtnTitle} styles={ModalStyles.leaveConfirmationModal.goBackButton}/>
                </div>
            }
        />

    )
};


export default LeaveConfirmationModal;