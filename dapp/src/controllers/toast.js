export function showSuccessToast(toast, msg, ms) {
    toast.success(msg, {
        position: "top-center",
        autoClose: ms,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
    });
}
  
export function showFailureToast(toast, msg, ms) {
    toast.error(msg, {
        position: "bottom-center",
        autoClose: ms,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
    });
}