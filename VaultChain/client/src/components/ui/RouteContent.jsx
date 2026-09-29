import { Suspense } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import LoadingState from './LoadingState';
import '../../styles/page-transition.css';

export default function RouteContent() {
	const { pathname } = useLocation();
	return <Suspense fallback={<LoadingState label="Loading page"/>}>
		<div key={pathname} className="page-transition page-transition--quick"><Outlet/></div>
	</Suspense>;
}
