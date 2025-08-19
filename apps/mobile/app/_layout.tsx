import { ActionSheetProvider } from '@expo/react-native-action-sheet';
import { PortalProvider } from '@gorhom/portal';
import { Slot, Stack, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import React, { useEffect, useRef, useState, PropsWithChildren } from 'react';

import { ToastProvider } from '@/components';
import '@/i18n';
import { useAuth, useUserStore } from '@/store/user';
import { ThemeProvider } from '@/theme';
import { authLogger } from '@/utils/logger';
import { tokenRefreshManager } from '@/services/_auth/tokenRefresh';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { trpcClient, TRPCProvider } from '@/services/_auth/trpc';

import '../polyfills';

// Prevent the splash screen from auto-hiding before asset loading is complete
SplashScreen.preventAutoHideAsync();

function AuthProvider({ children }: PropsWithChildren) {
  const { isAuthenticated, isInitialized, error } = useAuth();
  const router = useRouter();
  const hasRedirectedRef = useRef(false);
  const [isInitializing, setIsInitializing] = useState(false);

  // 初始化认证状态和令牌刷新管理器
  useEffect(() => {
    const initializeAuth = async () => {
      // 避免重复初始化
      if (isInitialized || isInitializing) {
        return;
      }

      authLogger.info('Initializing auth in RootLayout');
      setIsInitializing(true);

      try {
        // 启动令牌刷新管理器
        tokenRefreshManager.start();

        // 初始化用户认证状态
        await useUserStore.getState().initialize();
        authLogger.info('Auth initialization completed');
      } catch (error) {
        authLogger.error('Failed to initialize auth in RootLayout', error);
        console.error('Failed to initialize auth in RootLayout:', error);
      } finally {
        setIsInitializing(false);
        // Hide splash screen after auth initialization
        await SplashScreen.hideAsync();
      }
    };

    initializeAuth();

    // 清理函数
    return () => {
      tokenRefreshManager.stop();
    };
  }, [isInitialized, isInitializing]);

  // 只在真正需要重新认证时才重定向
  useEffect(() => {
    if (!isInitialized || isInitializing || hasRedirectedRef.current) {
      return;
    }

    const shouldRedirectToLogin = async (): Promise<boolean> => {
      // 如果已认证，不需要重定向
      if (isAuthenticated) {
        return false;
      }

      // 检查是否是因为 refresh token 过期导致的未认证
      if (error?.includes('refresh_token') || error?.includes('Refresh token expired')) {
        authLogger.info('Refresh token expired, need to redirect to login');
        return true;
      }

      // 如果没有任何错误且未认证，检查是否有有效token
      if (!error) {
        const { TokenStorage } = await import('@/services/_auth/tokenStorage');
        const hasToken = await TokenStorage.hasValidToken();
        if (!hasToken) {
          authLogger.info('No valid token found, need to redirect to login');
          return true;
        }
      }

      return false;
    };

    const handleAuthCheck = async () => {
      try {
        const needsLogin = await shouldRedirectToLogin();
        if (needsLogin) {
          authLogger.info('Auth state requires login, redirecting');
          hasRedirectedRef.current = true;
          // 使用 setTimeout 确保在 Root Layout 挂载完成后进行导航
          setTimeout(() => {
            router.replace('/login');
          }, 0);
        }
      } catch (checkError) {
        authLogger.error('Error checking auth state:', checkError);
      }
    };

    handleAuthCheck();

    // 重置重定向标志当用户重新认证时
    if (isAuthenticated && hasRedirectedRef.current) {
      authLogger.info('User authenticated, resetting redirect flag');
      hasRedirectedRef.current = false;
    }
  }, [isInitialized, isInitializing, isAuthenticated, error, router]);

  return children;
}

const QueryProvider = ({ children }: PropsWithChildren) => {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <TRPCProvider queryClient={queryClient} trpcClient={trpcClient}>
        {children}
      </TRPCProvider>
    </QueryClientProvider>
  );
};

export default function RootLayout() {
  return (
    <ThemeProvider
      theme={{
        token: {
          colorPrimary: '#00b96b',
        },
      }}
    >
      <AuthProvider>
        <QueryProvider>
          <ActionSheetProvider>
            <PortalProvider>
              <ToastProvider>
                <Stack screenOptions={{ headerShown: false }}>
                  {/* auth page should not have animation  */}
                  <Stack.Screen name="(auth)" options={{ animation: 'none' }} />
                  <Stack.Screen name="(main)/chat" options={{ animation: 'none' }} />
                  <Slot />
                </Stack>
              </ToastProvider>
            </PortalProvider>
          </ActionSheetProvider>
        </QueryProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
