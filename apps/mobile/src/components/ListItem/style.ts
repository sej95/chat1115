import { createStyles } from '@/theme';

export const useStyles = createStyles(
  (token, hasDescription: boolean = false, active: boolean = false) => ({
    avatar: {
      borderRadius: 20,
      height: 40,
      marginRight: token.marginSM,
      width: 40,
    },
    description: {
      color: token.colorTextSecondary,
      fontSize: token.fontSize,
    },
    emoji: {
      fontSize: 40,
    },
    emojiContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: token.marginSM,
    },
    extra: {
      overflow: 'hidden',
    },
    info: {
      flex: 1,
      justifyContent: hasDescription ? 'flex-start' : 'center',
    },
    sessionItem: {
      alignItems: 'center',
      backgroundColor: active ? token.colorPrimaryBg : token.colorBgContainer,
      borderColor: active ? token.colorPrimary : 'transparent',
      borderRadius: token.borderRadius,
      borderWidth: active ? 1 : 0,
      flexDirection: 'row',
      gap: token.marginSM,
      marginBottom: token.marginXS,
      padding: token.paddingSM,
    },
    title: {
      color: token.colorText,
      fontSize: token.fontSizeLG,
      fontWeight: '600',
      marginBottom: hasDescription ? token.marginXS : 0,
    },
  }),
);
