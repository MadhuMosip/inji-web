function CustomButton({ testId, onClick, title, styles }: { testId: string; onClick: () => void; title: string, styles?: string }) {
    return (
        <button
            type="button"
            id={testId}
            data-testid={testId}
            onClick={onClick}
            className={styles ? styles : "px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"}
        >
            {title}
        </button>
    );
}

export default CustomButton;