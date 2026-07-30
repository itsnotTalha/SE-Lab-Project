const dashboardRepository = require('../../repositories/dashboardRepository');

async function getSummary(userId) {
	return dashboardRepository.getSummary(userId);
}

module.exports = {
	getSummary,
};
