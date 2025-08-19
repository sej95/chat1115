import { Stack } from 'expo-router';

import { NavigateBack } from '@/components';

import { useThemedScreenOptions } from '@/const/navigation';

export default function RoutesLayout() {
  const themedScreenOptions = useThemedScreenOptions();
  return (
    <Stack
      screenOptions={{
        ...themedScreenOptions,
        headerLeft: () => <NavigateBack />,
        headerTitle: 'Playground',
      }}
    />
  );
}
