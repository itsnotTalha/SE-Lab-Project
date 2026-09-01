export default function SimilarityChart({ score }) {
	const normalized = Math.max(0, Math.min(100, Number(score) || 0));
	return <div className="similarity-chart" aria-label={`Confidence ${normalized.toFixed(1)} percent`}><div className="similarity-chart__labels"><span>Low</span><span>Review</span><span>Strong</span></div><div className="similarity-chart__track"><span className="is-low"/><span className="is-medium"/><span className="is-high"/><i style={{ left: `calc(${normalized}% - 7px)` }}/></div><div className="similarity-chart__thresholds"><span>0%</span><span>70% review threshold</span><span>95% strong threshold</span><span>100%</span></div></div>;
}
