import { CategoryBar, useThemeColorRange } from '@lobehub/charts';
import { ModelIcon, ProviderIcon } from '@lobehub/icons';
import { Collapse, Tag } from '@lobehub/ui';
import { Skeleton } from 'antd';
import { useTheme } from 'antd-style';
import { memo, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Flexbox } from 'react-layout-kit';

import InlineTable from '@/components/InlineTable';

import { UsageChartProps, GroupBy } from '../../../Client'
import { UsageLog } from '@/types/usage';
import { formatPrice } from '@/utils/format';

interface WeightGroup {
    id: string;
    weight: number;
    spend: number | string;
}

const formatData = (data: UsageLog[], groupBy: GroupBy): {
    id: string;
    childrens: WeightGroup[]
    totalSpend: number;
}[] => {
    if (!data || data.length === 0) return []

    const requestLogs = data.flatMap(log => log.records)
    const groupedLogs = requestLogs.reduce((acc, log) => {
        const key = groupBy === GroupBy.Model ? log.model : log.provider;
        if (!acc.has(key)) {
            acc.set(key, []);
        }
        acc.get(key)?.push(log);
        return acc;
    }, new Map<string, UsageLog['records']>());

    return Array.from(groupedLogs.entries()).map(([key, logs]) => {
        // 此处的 logs 为多日的 log，需要进行 sum
        // 如果当前的 groupBy 是 Model，则 logs 应该按照 Provider 进行分组
        const spend = logs.reduce((acc, log) => {
            const key = groupBy === GroupBy.Model ? log.provider : log.model;
            acc.set(key, (acc.get(key) || 0) + log.spend);
            return acc;
        }, new Map<string, number>())

        const totalSpend = logs.reduce((total, log) => total + (log.spend || 0), 0);

        const spendWithWeight = Array.from(spend.entries().map(([key, value]) => {
            return {
                id: key,
                weight: totalSpend > 0 ? value / totalSpend : 0,
                spend: value,
            };
        }))

        return {
            id: key,
            childrens: spendWithWeight.sort((a, b) => b.weight - a.weight),
            totalSpend: totalSpend,
        };
    }).sort((a, b) => b.totalSpend - a.totalSpend);
}

const ModelTable = memo<UsageChartProps>(({ data, isLoading, groupBy }) => {
    const { t } = useTranslation('common');
    const theme = useTheme();
    const themeColorRange = useThemeColorRange();

    if (isLoading) return <Skeleton active paragraph={{ rows: 8 }} title={false} />;

    const formattedData = useMemo(
        () => formatData(data || [], groupBy || GroupBy.Model),
        [data, groupBy]
    );

    console.log('ModelTable', groupBy, formattedData)

    return (
        <Collapse
            defaultActiveKey={formattedData.map((item) => item.id)}
            expandIconPosition={'end'}
            gap={16}
            items={formattedData.map((item) => {
                const key = item.id
                return {
                    children: (
                        <Flexbox>
                            <CategoryBar
                                colors={themeColorRange}
                                showLabels={false}
                                size={2}
                                values={item.childrens.map((item) => item.weight)}
                            />
                            <InlineTable
                                columns={[
                                    {
                                        key: 'id',
                                        dataIndex: 'id',
                                        render: (value, record, index) => {
                                            return (
                                                <Flexbox align={'center'} gap={12} horizontal key={value}>
                                                    {groupBy === GroupBy.Provider ?
                                                        <ProviderIcon
                                                            provider={record.id}
                                                            style={{
                                                                boxShadow: `0 0 0 2px ${theme.colorBgContainer}, 0 0 0 4px ${themeColorRange[index]}`,
                                                                boxSizing: 'content-box',
                                                            }}
                                                        /> :
                                                        <ModelIcon
                                                            model={record.id}
                                                            style={{
                                                                boxShadow: `0 0 0 2px ${theme.colorBgContainer}, 0 0 0 4px ${themeColorRange[index]}`,
                                                                boxSizing: 'content-box',
                                                            }}
                                                        />
                                                    }
                                                    {value}
                                                </Flexbox>
                                            );
                                        },
                                        title: groupBy === GroupBy.Model ? 'Provider' : 'Model',
                                        width: 200,
                                    },
                                    {
                                        key: 'spend',
                                        title: 'Spend',
                                        dataIndex: 'spend',
                                        render: (value) => {
                                            return `$${formatPrice(value / 1000_000)}`;
                                        }
                                    }
                                ]}
                                dataSource={item.childrens}
                                hoverToActive={false}
                                loading={isLoading}
                                rowKey={(record) => record.id}
                            />
                        </Flexbox>
                    ),
                    extra: <Tag>{item.childrens.length}</Tag>,
                    key,
                    label: (
                        <Flexbox align={'center'} gap={8} horizontal>
                            {groupBy === GroupBy.Model ? <ModelIcon model={key} size={24} /> : <ProviderIcon provider={key} size={24} />}
                            {key}
                        </Flexbox>
                    ),
                };
            })}
            padding={{
                body: 0,
            }}
        />
    );
});

export default ModelTable;
