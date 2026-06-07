import dynamic from 'next/dynamic';

const CosmicVoyage = dynamic(() => import('../components/CosmicVoyage'), {
  ssr: false
});

export default function Page() {
  return <CosmicVoyage />;
}
