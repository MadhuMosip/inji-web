import { HiXMark } from "react-icons/hi2";
import { CancelActionButtonStyles } from "./CancelActionButtonStyles";

interface CancelActionButtonProps {
    onClick?: () => void;
    title: string;
    disabled?: boolean;
}

export function CancelActionButton({ title, onClick, disabled = false }: CancelActionButtonProps) {
    return(
        <button
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