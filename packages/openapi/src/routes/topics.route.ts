import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';

import { getScopePermissions } from '@/utils/rbac';

import { TopicController } from '../controllers';
import { requireAuth } from '../middleware';
import { requireAnyPermission } from '../middleware/permission-check';
import {
  TopicCreateRequestSchema,
  TopicDeleteParamSchema,
  TopicGetParamSchema,
  TopicListParamSchema,
  TopicListQuerySchema,
  TopicSummaryParamSchema,
  TopicUpdateParamSchema,
  TopicUpdateRequestSchema,
} from '../types/topic.type';

// Topic 相关路由
const TopicsRoutes = new Hono();

// POST /api/v1/topics - 创建新的话题
TopicsRoutes.post(
  '/',
  requireAuth,
  requireAnyPermission(
    getScopePermissions('TOPIC_CREATE', ['ALL', 'WORKSPACE', 'OWNER']),
    'You do not have permission to create topics',
  ),
  zValidator('json', TopicCreateRequestSchema),
  (c) => {
    const controller = new TopicController();
    return controller.handleCreateTopic(c);
  },
);

// GET /api/v1/topics/:id - 获取指定话题
TopicsRoutes.get(
  '/:id',
  requireAuth,
  requireAnyPermission(
    getScopePermissions('TOPIC_READ', ['ALL', 'WORKSPACE', 'OWNER']),
    'You do not have permission to read topics',
  ),
  zValidator('param', TopicGetParamSchema),
  (c) => {
    const controller = new TopicController();
    return controller.handleGetTopicById(c);
  },
);

// PUT /api/v1/topics/:id - 更新话题
TopicsRoutes.put(
  '/:id',
  requireAuth,
  requireAnyPermission(
    getScopePermissions('TOPIC_UPDATE', ['ALL', 'WORKSPACE', 'OWNER']),
    'You do not have permission to update topics',
  ),
  zValidator('param', TopicUpdateParamSchema),
  zValidator('json', TopicUpdateRequestSchema),
  (c) => {
    const controller = new TopicController();
    return controller.handleUpdateTopic(c);
  },
);

// DELETE /api/v1/topics/:id - 删除话题
TopicsRoutes.delete(
  '/:id',
  requireAuth,
  requireAnyPermission(
    getScopePermissions('TOPIC_DELETE', ['ALL', 'WORKSPACE', 'OWNER']),
    'You do not have permission to delete topics',
  ),
  zValidator('param', TopicDeleteParamSchema),
  (c) => {
    const controller = new TopicController();
    return controller.handleDeleteTopic(c);
  },
);

// GET /api/v1/topics/session/:sessionId - 获取指定会话的所有话题
TopicsRoutes.get(
  '/session/:sessionId',
  requireAuth,
  requireAnyPermission(
    getScopePermissions('TOPIC_READ', ['ALL', 'WORKSPACE', 'OWNER']),
    'You do not have permission to read topics',
  ),
  zValidator('param', TopicListParamSchema),
  zValidator('query', TopicListQuerySchema),
  (c) => {
    const controller = new TopicController();
    return controller.handleGetTopicsBySession(c);
  },
);

// POST /api/v1/topics/:id/summary-title - 总结对应的话题标题
TopicsRoutes.post(
  '/summary-title',
  requireAuth,
  requireAnyPermission(
    getScopePermissions('TOPIC_UPDATE', ['ALL', 'WORKSPACE', 'OWNER']),
    'You do not have permission to summarize topics',
  ),
  zValidator('json', TopicSummaryParamSchema),
  (c) => {
    const controller = new TopicController();
    return controller.handleSummarizeTopicTitle(c);
  },
);

export default TopicsRoutes;
