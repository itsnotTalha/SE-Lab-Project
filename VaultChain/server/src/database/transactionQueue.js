let transactionQueue = Promise.resolve();

function serializeTransaction(work) {
	const result = transactionQueue.then(work, work);
	transactionQueue = result.catch(() => {});
	return result;
}

module.exports = { serializeTransaction };
