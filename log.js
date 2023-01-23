export const logError = (errorMessage) => {
    console.error((new Date()).toUTCString(), errorMessage);
    console.error((new Error()).stack?.split("\n")?.[2]);
}
