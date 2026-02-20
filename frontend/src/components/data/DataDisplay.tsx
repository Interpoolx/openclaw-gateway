import { DataTable, DataTableProps } from './DataTable';
import { DataCard, DataCardProps } from './DataCard';
import { DataList, DataListProps } from './DataList';
import { DataEmpty, DataEmptyProps } from './DataEmpty';

type TableItem = Record<string, unknown>;

interface DataDisplayProps {
  type: 'table' | 'cards' | 'list';
  data: TableItem[];
  loading?: boolean;
  config: {
    table?: Omit<DataTableProps<TableItem>, 'data'>;
    cards?: Omit<DataCardProps, 'title' | 'description' | 'badges' | 'metadata' | 'status' | 'timestamp'> & {
      getTitle: (item: TableItem) => string;
      getDescription?: (item: TableItem) => string;
      getBadges?: (item: TableItem) => DataCardProps['badges'];
      getMetadata?: (item: TableItem) => DataCardProps['metadata'];
      getStatus?: (item: TableItem) => DataCardProps['status'];
      getTimestamp?: (item: TableItem) => string;
    };
    list?: Omit<DataListProps, 'items'> & {
      mapItem: (item: TableItem) => DataListProps['items'][0];
    };
    empty?: Omit<DataEmptyProps, 'title'> & {
      getTitle?: () => string;
      getDescription?: () => string;
    };
  };
  onItemClick?: (item: TableItem) => void;
}

export function DataDisplay({ type, data, loading, config, onItemClick }: DataDisplayProps) {
  if (loading) {
    return (
      <div className="bg-white/[0.02] border border-white/5 rounded-xl p-[60px] text-center">
        <div className="text-[#666]">Loading...</div>
      </div>
    );
  }

  if (data.length === 0) {
    const emptyProps = config.empty ?? {};
    return (
      <DataEmpty
        icon={emptyProps.icon}
        title={emptyProps.getTitle?.() ?? 'No data available'}
        description={emptyProps.getDescription?.() ?? emptyProps.description}
        action={emptyProps.action}
      />
    );
  }

  switch (type) {
    case 'table': {
      const tableConfig = config.table as (Omit<DataTableProps<TableItem>, 'data'> | undefined);
      if (!tableConfig?.columns || !tableConfig?.keyExtractor) {
        return null;
      }
      return (
        <DataTable
          data={data}
          columns={tableConfig.columns}
          keyExtractor={tableConfig.keyExtractor}
          onRowClick={onItemClick}
          {...(tableConfig.searchPlaceholder && { searchPlaceholder: tableConfig.searchPlaceholder })}
          {...(tableConfig.pagination && { pagination: tableConfig.pagination })}
          {...(tableConfig.actions && { actions: tableConfig.actions })}
        />
      );
    }

    case 'cards':
      return (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-4">
          {data.map((item) => (
            <DataCard
              key={item.id as string}
              title={config.cards!.getTitle(item)}
              description={config.cards!.getDescription?.(item)}
              badges={config.cards!.getBadges?.(item)}
              metadata={config.cards!.getMetadata?.(item)}
              status={config.cards!.getStatus?.(item)}
              timestamp={config.cards!.getTimestamp?.(item)}
              actions={config.cards?.actions}
              onClick={() => onItemClick?.(item)}
            />
          ))}
        </div>
      );

    case 'list':
      return (
        <DataList
          items={data.map(item => config.list!.mapItem(item))}
          onItemClick={(item) => onItemClick?.(data.find(d => d.id === item.id)!)}
        />
      );

    default:
      return null;
  }
}
