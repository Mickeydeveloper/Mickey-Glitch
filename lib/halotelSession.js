const pendingHalotelOrder = new Map();

function setPendingHalotelOrder(chatId, orderRef) {
    if (!chatId || !orderRef) return;
    pendingHalotelOrder.set(chatId, orderRef);
}

function getPendingHalotelOrder(chatId) {
    if (!chatId) return null;
    return pendingHalotelOrder.get(chatId) || null;
}

function clearPendingHalotelOrder(chatId) {
    if (!chatId) return;
    pendingHalotelOrder.delete(chatId);
}

module.exports = {
    setPendingHalotelOrder,
    getPendingHalotelOrder,
    clearPendingHalotelOrder
};