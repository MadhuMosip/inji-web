import { HiXMark } from "react-icons/hi2";

interface CancelActionButtonProps {
    onClick?: () => void;
    title: string;
}

export function CancelActionButton({ title, onClick }: CancelActionButtonProps) {
    return(
        <button
            type="button"
            onClick={onClick}
            className="border border-[#D1D5DC] text-[#364153] rounded-lg h-[49px] w-[133px] flex items-center justify-center gap-1 font-semibold text-[14px]"
        >
            <HiXMark className="w-4 h-4"/>{title}
        </button>
    )
}