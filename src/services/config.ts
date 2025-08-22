import dayjs from 'dayjs';

import { BRANDING_NAME } from '@/const/branding';
import { isServerMode } from '@/const/version';
import { ImportPgDataStructure } from '@/types/export';
import { downloadFile } from '@/utils/client/downloadFile';
import { exportJSONFile } from '@/utils/client/exportFile';

import { exportService } from './export';

class ConfigService {
  exportAll = async () => {
    const { data, url } = await exportService.exportData();
    const filename = `${dayjs().format('YYYY-MM-DD-hh-mm')}_${BRANDING_NAME}-data.json`;

    // if url exists, means export data from server and upload the data to S3
    // just need to download the file
    if (url) {
      await downloadFile(url, filename);
      return;
    }

    // or export to file with the data
    const result = await this.createDataStructure(data, isServerMode ? 'postgres' : 'pglite');

    exportJSONFile(result, filename);
  };

  exportSingleAgent = async (agentId: string) => {
    console.log(agentId);
  };

  exportSettings = async () => {};

  exportSingleSession = async (sessionId: string) => {
    console.log(sessionId);
  };

  private createDataStructure = async (
    data: any,
    mode: 'pglite' | 'postgres',
  ): Promise<ImportPgDataStructure> => {
    const { default: json } = await import('@/database/core/migrations.json');
    const latestHash = json.at(-1)?.hash;
    if (!latestHash) {
      throw new Error('Not find database sql hash');
    }

    return { data, mode, schemaHash: latestHash };
  };
}

export const configService = new ConfigService();
