import { Link, Stack } from 'expo-router';
import React from 'react';
import { Text, View } from 'react-native';

import { useTranslation } from 'react-i18next';
import { createStyles } from '@/theme';

const useStyles = createStyles((token) => ({
  container: {
    alignItems: 'center',
    backgroundColor: token.colorBgContainer,
    flex: 1,
    justifyContent: 'center',
    padding: token.paddingLG,
  },
  link: {
    marginTop: token.marginLG,
    paddingVertical: token.paddingLG,
  },
  linkText: {
    color: token.colorPrimary,
    fontSize: token.fontSizeLG,
    textDecorationLine: 'underline',
  },
  title: {
    color: token.colorText,
    fontSize: token.fontSizeHeading3,
    fontWeight: token.fontWeightStrong,
  },
}));

export default function NotFoundScreen() {
  const { styles } = useStyles();
  const { t } = useTranslation(['error', 'common']);

  return (
    <>
      <Stack.Screen options={{ title: t('page.notFoundTitle', { ns: 'error' }) }} />
      <View style={styles.container}>
        <Text style={styles.title}>{t('page.notFoundMessage', { ns: 'error' })}</Text>
        <Link href="/" style={styles.link}>
          <Text style={styles.linkText}>{t('navigation.goToHomeScreen', { ns: 'common' })}</Text>
        </Link>
      </View>
    </>
  );
}
