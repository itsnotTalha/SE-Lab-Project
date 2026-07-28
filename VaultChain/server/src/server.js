const app = require('./app');
const { initializeDatabase } = require('./database/initDatabase');

const port = process.env.PORT || 3000;

async function startServer() {
	await initializeDatabase();

	app.listen(port, () => {
		console.log(`VaultChain API running on port ${port}`);
	});
}

startServer().catch((error) => {
	console.error(error);
	process.exit(1);
});
