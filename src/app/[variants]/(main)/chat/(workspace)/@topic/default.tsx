import React, { Suspense, lazy } from 'react';

import { DynamicLayoutProps } from '@/types/next';
import { RouteVariants } from '@/utils/server/routeVariants';

import Desktop from './_layout/Desktop';
import Mobile from './_layout/Mobile';
import SkeletonList from './features/SkeletonList';

const SidebarSelector = lazy(() => import('./SidebarSelector'));

const Topic = async (props: DynamicLayoutProps) => {
  const isMobile = await RouteVariants.getIsMobile(props);

  const Layout = isMobile ? Mobile : Desktop;

  return (
    <Layout>
      <Suspense fallback={<SkeletonList />}>
        <SidebarSelector />
      </Suspense>
    </Layout>
  );
};

Topic.displayName = 'ChatTopic';

export default Topic;
