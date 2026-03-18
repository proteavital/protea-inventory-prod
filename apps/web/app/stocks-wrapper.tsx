'use client';

import dynamic from 'next/dynamic';

const StocksClient = dynamic(() => import('./stocks-client'), { ssr: false });

export default function StocksWrapper() {
  return <StocksClient />;
}
