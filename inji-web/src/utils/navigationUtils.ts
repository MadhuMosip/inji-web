import {ROUTES} from "./constants";

export const navigateToUserHome = (navigate: any) =>
    navigate(ROUTES.USER_HOME);

export type PopstateLeaveGuard = {
    remove: () => void;
};

/**
 * Installs a "stay on this page until user confirms" guard for browser back/forward.
 * Typical usage: show a leave-confirmation modal when the user presses browser back,
 * and keep them on the same URL until they explicitly confirm.
 *
 * NOTE: This is best-effort; if the user refreshes/closes the tab, use beforeunload separately.
 */
export const createPopstateLeaveGuard = (options: {
    isModalOpen: () => boolean;
    onOpenModal: () => void;
}): PopstateLeaveGuard => {
    const handler = () => {
        if (options.isModalOpen()) {
            window.history.pushState(null, "", window.location.href);
            return;
        }
        options.onOpenModal();
        window.history.pushState(null, "", window.location.href);
    };

    window.history.pushState(null, "", window.location.href);
    window.addEventListener("popstate", handler);

    return {
        remove: () => window.removeEventListener("popstate", handler),
    };
};