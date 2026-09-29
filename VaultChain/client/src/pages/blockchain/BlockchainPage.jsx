import BlockchainVisualization from '../../components/blockchain/BlockchainVisualization';
import PageHeader from '../../components/ui/PageHeader';

export default function BlockchainPage() {
	return <><PageHeader eyebrow="Learn by exploring" title="Blockchain explorer" description="Understand fingerprints, blocks, and the links that make changes visible."/><BlockchainVisualization/></>;
}
