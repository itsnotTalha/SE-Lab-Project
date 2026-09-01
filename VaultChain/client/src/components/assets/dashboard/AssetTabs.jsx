import { motion } from 'framer-motion';

/**
 * Enhanced Tabs interface for asset inspection
 * Professional tab navigation with smooth transitions
 */
export default function AssetTabs({ tabs, activeTab, onTabChange, children }) {
	const container = {
		hidden: { opacity: 0 },
		show: {
			opacity: 1,
			transition: {
				staggerChildren: 0.05,
				delayChildren: 0.05,
			},
		},
	};

	const item = {
		hidden: { opacity: 0, y: -10 },
		show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
	};

	return (
		<motion.section className="asset-tabs-section" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
			{/* Tab Navigation */}
			<motion.div className="tabs-navigation" role="tablist" variants={container} initial="hidden" animate="show">
				{tabs.map((tab) => {
					const Icon = tab.icon;
					const isActive = activeTab === tab.id;

					return (
						<motion.button
							key={tab.id}
							role="tab"
							aria-selected={isActive}
							aria-controls={`tab-panel-${tab.id}`}
							className={`tab-button ${isActive ? 'is-active' : ''}`}
							onClick={() => onTabChange(tab.id)}
							variants={item}
							whileHover={{ y: -2 }}
							whileTap={{ y: 0 }}
						>
							{Icon && <Icon size={16} />}
							<span>{tab.label}</span>
							{isActive && (
								<motion.div
									className="tab-indicator"
									layoutId="tab-indicator"
									initial={{ opacity: 0 }}
									animate={{ opacity: 1 }}
									transition={{ duration: 0.3 }}
								/>
							)}
						</motion.button>
					);
				})}
			</motion.div>

			{/* Tab Content */}
			<motion.div
				className="tabs-content"
				key={activeTab}
				initial={{ opacity: 0, y: 10 }}
				animate={{ opacity: 1, y: 0 }}
				exit={{ opacity: 0, y: -10 }}
				transition={{ duration: 0.3 }}
			>
				{children}
			</motion.div>
		</motion.section>
	);
}
