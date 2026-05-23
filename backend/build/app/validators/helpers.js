export function cleanEmptyStrings(payload, fields) {
    const cleaned = { ...payload };
    for (const field of fields) {
        if (cleaned[field] === '') {
            cleaned[field] = undefined;
        }
    }
    return cleaned;
}
export function isValidationError(error) {
    return (typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === 'E_VALIDATION_ERROR');
}
export function validationMessages(error) {
    if (typeof error === 'object' && error !== null && 'messages' in error) {
        return error.messages;
    }
    return undefined;
}
//# sourceMappingURL=helpers.js.map