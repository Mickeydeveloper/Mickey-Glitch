const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(process.cwd(), 'data', 'donations.json');

function ensureDataFile() {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, '[]', 'utf8');
  }
}

function loadTransactions() {
  try {
    ensureDataFile();
    const raw = fs.readFileSync(DATA_FILE, 'utf8') || '[]';
    return JSON.parse(raw);
  } catch (error) {
    console.error('[paymentStore] loadTransactions failed:', error.message);
    return [];
  }
}

function saveTransactions(transactions) {
  try {
    ensureDataFile();
    fs.writeFileSync(DATA_FILE, JSON.stringify(transactions, null, 2), 'utf8');
    return transactions;
  } catch (error) {
    console.error('[paymentStore] saveTransactions failed:', error.message);
    return [];
  }
}

function addTransaction(transaction) {
  const transactions = loadTransactions();
  transactions.push(transaction);
  saveTransactions(transactions);
  return transaction;
}

function updateTransaction(orderId, status, updateData = {}) {
  const transactions = loadTransactions();
  const index = transactions.findIndex((item) =>
    item.orderId === orderId ||
    item.reference === orderId ||
    item.transactionId === orderId ||
    item.metadata?.orderId === orderId ||
    item.metadata?.transactionId === orderId ||
    item.metadata?.reference === orderId
  );

  if (index === -1) return null;

  transactions[index] = {
    ...transactions[index],
    status,
    updatedAt: new Date().toISOString(),
    ...updateData,
  };
  saveTransactions(transactions);
  return transactions[index];
}

function findTransaction(query) {
  if (!query) return null;
  const transactions = loadTransactions();
  return transactions.find((item) =>
    item.orderId === query ||
    item.reference === query ||
    item.transactionId === query ||
    item.metadata?.orderId === query ||
    item.metadata?.transactionId === query ||
    item.metadata?.reference === query
  );
}

function getTransactionHistory(userId) {
  return loadTransactions()
    .filter((item) => item.userId === userId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function getSummary() {
  const transactions = loadTransactions();
  const summary = {
    total: 0,
    confirmed: 0,
    pending: 0,
    failed: 0,
    providers: {},
    statuses: {},
    transactions: transactions.length,
  };

  transactions.forEach((item) => {
    const amount = Number(item.amount) || 0;
    summary.total += amount;
    summary[item.status] = (summary[item.status] || 0) + 1;

    const provider = item.provider || item.paymentMethod || 'unknown';
    if (!summary.providers[provider]) {
      summary.providers[provider] = { count: 0, total: 0 };
    }
    summary.providers[provider].count += 1;
    summary.providers[provider].total += amount;
  });

  return summary;
}

module.exports = {
  loadTransactions,
  saveTransactions,
  addTransaction,
  updateTransaction,
  findTransaction,
  getTransactionHistory,
  getSummary,
};
