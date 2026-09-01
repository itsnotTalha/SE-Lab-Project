export const dashboardTrend = [
	{ month: 'Jan', revenue: 62000, transactions: 1120, users: 18400, assets: 131000 },
	{ month: 'Feb', revenue: 71000, transactions: 1280, users: 19600, assets: 141500 },
	{ month: 'Mar', revenue: 84500, transactions: 1490, users: 20800, assets: 151800 },
	{ month: 'Apr', revenue: 93000, transactions: 1680, users: 21950, assets: 162400 },
	{ month: 'May', revenue: 106000, transactions: 1840, users: 23200, assets: 174200 },
	{ month: 'Jun', revenue: 124500, transactions: 2130, users: 24532, assets: 185420 },
];

export const revenueSources = [
	{ name: 'Marketplace commission', value: 85, color: '#635bff' },
	{ name: 'Verification fees', value: 10, color: '#20b486' },
	{ name: 'Other', value: 5, color: '#f5a524' },
];

export const transactions = [
	{ id: 'TX-10292', asset: 'Artwork #332', seller: 'Rahman Hossain', buyer: 'Ahmed Karim', amount: 1000, fee: 50, date: 'Sep 02, 2026', status: 'Completed' },
	{ id: 'TX-10291', asset: 'Neon Horizon #18', seller: 'Maya Chen', buyer: 'Noah Wilson', amount: 2480, fee: 124, date: 'Sep 02, 2026', status: 'Completed' },
	{ id: 'TX-10290', asset: 'Photo Collection #44', seller: 'Karim Uddin', buyer: 'Sofia Rahman', amount: 1200, fee: 60, date: 'Sep 01, 2026', status: 'Pending' },
	{ id: 'TX-10289', asset: 'Architectural Study', seller: 'Liam Martin', buyer: 'Emma Lee', amount: 760, fee: 38, date: 'Sep 01, 2026', status: 'Completed' },
	{ id: 'TX-10288', asset: 'Genesis Audio #09', seller: 'Aisha Islam', buyer: 'Oliver Smith', amount: 3400, fee: 170, date: 'Aug 31, 2026', status: 'Refunded' },
	{ id: 'TX-10287', asset: 'Portrait Series #51', seller: 'Nadia Ali', buyer: 'Ethan Brown', amount: 890, fee: 44.5, date: 'Aug 31, 2026', status: 'Completed' },
];

export const users = [
	{ id: 'USR-2841', name: 'Rahman Hossain', email: 'rahman@studio.co', role: 'USER', assets: 48, transactions: 31, revenue: 12400, status: 'Active', initials: 'RH' },
	{ id: 'USR-2840', name: 'Maya Chen', email: 'maya@northlight.io', role: 'USER', assets: 112, transactions: 86, revenue: 28900, status: 'Active', initials: 'MC' },
	{ id: 'USR-2839', name: 'Nadia Ali', email: 'nadia@formlab.design', role: 'VERIFICATION_ADMIN', assets: 21, transactions: 14, revenue: 8200, status: 'Active', initials: 'NA' },
	{ id: 'USR-2838', name: 'Karim Uddin', email: 'karim@exposure.art', role: 'USER', assets: 67, transactions: 42, revenue: 17750, status: 'Review', initials: 'KU' },
	{ id: 'USR-2837', name: 'John Miller', email: 'john@vaultchain.io', role: 'MODERATOR', assets: 3, transactions: 0, revenue: 0, status: 'Active', initials: 'JM' },
];

export const assets = [
	{ id: 'AST-93321', title: 'Neon Horizon #18', owner: 'Maya Chen', category: 'Digital art', score: 98.7, market: 'Listed', status: 'Verified', color: '#685cf6' },
	{ id: 'AST-93320', title: 'Dhaka After Rain', owner: 'Karim Uddin', category: 'Photography', score: 96.4, market: 'Sold', status: 'Verified', color: '#13a77b' },
	{ id: 'AST-93319', title: 'Portrait Series #51', owner: 'Nadia Ali', category: 'Illustration', score: 91.2, market: 'Unlisted', status: 'Review', color: '#ef9f27' },
	{ id: 'AST-93318', title: 'Synthetic Bloom', owner: 'Liam Martin', category: 'Generative', score: 72.8, market: 'Frozen', status: 'Suspicious', color: '#e0526f' },
	{ id: 'AST-93317', title: 'Genesis Audio #09', owner: 'Aisha Islam', category: 'Audio', score: 99.1, market: 'Listed', status: 'Verified', color: '#278bd9' },
];

export const listings = [
	{ asset: 'Digital Art #102', owner: 'Rahman Hossain', price: 500, listed: '2h ago', status: 'Active' },
	{ asset: 'Photo Collection #233', owner: 'Karim Uddin', price: 1200, listed: '5h ago', status: 'Sold' },
	{ asset: 'Neon Horizon #18', owner: 'Maya Chen', price: 2480, listed: 'Yesterday', status: 'Active' },
	{ asset: 'Synthetic Bloom', owner: 'Liam Martin', price: 680, listed: 'Yesterday', status: 'Review' },
	{ asset: 'Genesis Audio #09', owner: 'Aisha Islam', price: 3400, listed: 'Aug 31', status: 'Sold' },
];

export const securityEvents = [
	{ time: '10:42 PM', title: 'Suspicious login detected', detail: 'New device · Frankfurt, Germany', level: 'high', type: 'Login' },
	{ time: '10:20 PM', title: 'Multiple failed verification attempts', detail: '12 attempts from user USR-2838', level: 'medium', type: 'Verification' },
	{ time: '09:30 PM', title: 'Admin permission changed', detail: 'John Miller granted MODERATOR', level: 'low', type: 'Access' },
	{ time: '08:14 PM', title: 'Rate limit threshold reached', detail: 'API key ending in ••7A31', level: 'medium', type: 'API' },
];

export const activityLogs = [
	{ admin: 'John Miller', initials: 'JM', action: 'Suspended user', target: 'User #2231', time: 'Sep 02, 10:48 PM', ip: '103.96.104.22' },
	{ admin: 'Nadia Ali', initials: 'NA', action: 'Approved verification', target: 'Asset AST-93321', time: 'Sep 02, 10:31 PM', ip: '103.108.22.10' },
	{ admin: 'Sara Khan', initials: 'SK', action: 'Processed payout', target: 'Payout PY-8802', time: 'Sep 02, 09:56 PM', ip: '45.64.132.18' },
	{ admin: 'John Miller', initials: 'JM', action: 'Resolved dispute', target: 'Case DSP-201', time: 'Sep 02, 09:22 PM', ip: '103.96.104.22' },
	{ admin: 'Alex Morgan', initials: 'AM', action: 'Changed commission rate', target: '5.00% global fee', time: 'Sep 01, 06:10 PM', ip: '192.168.1.2' },
];

export const regions = [
	{ country: 'United States', users: 8234, share: 34 },
	{ country: 'Bangladesh', users: 4960, share: 20 },
	{ country: 'United Kingdom', users: 3312, share: 14 },
	{ country: 'Germany', users: 2495, share: 10 },
	{ country: 'Singapore', users: 1920, share: 8 },
];
