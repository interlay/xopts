export function showSuccessToast(toast: any, msg: string, ms: number) {
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
  
export function showFailureToast(toast: any, msg: string, ms: number) {
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