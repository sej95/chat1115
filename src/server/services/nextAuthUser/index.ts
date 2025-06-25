import { eq } from 'drizzle-orm';
import type { AdapterAccount } from 'next-auth/adapters';
import { NextResponse } from 'next/server';

import { UserModel } from '@/database/models/user';
import { UserItem, nextauthAccounts, nextauthSessions } from '@/database/schemas';
import { serverDB } from '@/database/server';
import { pino } from '@/libs/logger';
import { LobeNextAuthDbAdapter } from '@/libs/next-auth/adapter';

/**
 * @class NextAuthUserService
 * @description Methods prefixed with `safe` are designed to handle operations (e.g., webhook events) without re-verifying the userId.
 * If `userId` is required, it should be passed from middleware context to prevent Cross-User attacks.
 */
export class NextAuthUserService {
  adapter;
  serverDB;

  constructor() {
    this.adapter = LobeNextAuthDbAdapter(serverDB);
    this.serverDB = serverDB;
  }

  safeUpdateUser = async (
    { providerAccountId, provider }: { provider: string; providerAccountId: string },
    data: Partial<UserItem>,
  ) => {
    pino.info(`updating user "${JSON.stringify({ provider, providerAccountId })}" due to webhook`);
    // 1. Find User by account
    // @ts-expect-error: Already impl in `LobeNextauthDbAdapter`
    const user = await this.adapter.getUserByAccount({
      provider,
      providerAccountId,
    });

    // 2. If found, Update user data from provider
    if (user?.id) {
      const userModel = new UserModel(this.serverDB, user.id);

      // Perform update
      await userModel.updateUser({
        avatar: data?.avatar,
        email: data?.email,
        fullName: data?.fullName,
      });
    } else {
      pino.warn(
        `[${provider}]: Webhooks handler user "${JSON.stringify({ provider, providerAccountId })}" update for "${JSON.stringify(data)}", but no user was found by the providerAccountId.`,
      );
      // Do not return error to the webhook, as it may be attack by keyword guess
      return NextResponse.json({ message: 'safeUpdateUser', success: true }, { status: 200 });
    }
    return NextResponse.json({ message: 'safeUpdateUser', success: true }, { status: 200 });
  };

  safeDeleteSession = async ({
    providerAccountId,
    provider,
  }: {
    provider: string;
    providerAccountId: string;
  }) => {
    // 1. Find User by account
    // @ts-expect-error: Already impl in `LobeNextauthDbAdapter`
    const account = await this.adapter.getAccount(providerAccountId, provider);
    // 2. If found, Invalidate user session
    if (account?.userId) {
      await this.serverDB
        .delete(nextauthSessions)
        .where(eq(nextauthSessions.userId, account.userId));
      pino.info(
        `Invoke user session "${JSON.stringify({ provider, providerAccountId })}" due to webhook`,
      );
    } else {
      pino.warn(
        `[${provider}]: Webhooks handler user "${JSON.stringify({ provider, providerAccountId })}" session invoke, but no user was found by the providerAccountId.`,
      );
      return NextResponse.json({ message: 'safeDeleteSession', success: true }, { status: 200 });
    }
    return NextResponse.json({ message: 'safeDeleteSession', success: true }, { status: 200 });
  };

  unlinkSSOProvider = async ({
    provider,
    providerAccountId,
    userId,
  }: {
    provider: string;
    providerAccountId: string;
    userId: string;
  }) => {
    if (
      this.adapter?.unlinkAccount &&
      typeof this.adapter.unlinkAccount === 'function' &&
      this.adapter?.getAccount &&
      typeof this.adapter.getAccount === 'function'
    ) {
      const account = await this.adapter.getAccount(providerAccountId, provider);
      // The userId can either get from ctx.nextAuth?.id or ctx.userId
      if (!account || account.userId !== userId) throw new Error('The account does not exist');
      await this.adapter.unlinkAccount({ provider, providerAccountId });
    } else {
      throw new Error('Adapter does not support unlinking accounts');
    }
  };

  getUserSSOProviders = async (userId: string) => {
    const result = await this.serverDB
      .select({
        expiresAt: nextauthAccounts.expires_at,
        provider: nextauthAccounts.provider,
        providerAccountId: nextauthAccounts.providerAccountId,
        scope: nextauthAccounts.scope,
        type: nextauthAccounts.type,
        userId: nextauthAccounts.userId,
      })
      .from(nextauthAccounts)
      .where(eq(nextauthAccounts.userId, userId));
    return result as unknown as AdapterAccount[];
  };

  getUserSSOSessions = async (userId: string) => {
    const result = await this.serverDB
      .select({
        expiresAt: nextauthSessions.expires,
        userId: nextauthSessions.userId,
      })
      .from(nextauthSessions)
      .where(eq(nextauthSessions.userId, userId));
    return result;
  };

  deleteUserSSOSessions = async (userId: string) => {
    await serverDB.delete(nextauthSessions).where(eq(nextauthSessions.userId, userId));
  };
}
