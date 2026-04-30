import { HiXMark } from "react-icons/hi2";
import { CancelActionButtonStyles } from "./CancelActionButtonStyles";

interface CancelActionButtonProps {
    onClick?: () => void;
    title: string;
    disabled?: boolean;
    testId?: string;
}

export function CancelActionButton({ title, onClick, disabled = false, testId }: CancelActionButtonProps) {
    return(
        <button
            data-testid={testId ?? "cancel-action-button"}
            type="button"
            onClick={onClick}
            disabled={disabled}
            className={`${CancelActionButtonStyles.baseStyles} ${
                disabled ? CancelActionButtonStyles.disabled : ""
            }`}
        >
            <HiXMark className="w-4 h-4"/>{title}
        </button>
    )
}