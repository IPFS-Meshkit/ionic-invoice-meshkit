import { Preferences } from "@capacitor/preferences";

export interface BackupRecord {
  cid: string;
  timestamp: string;
  name: string;
}

export interface ActivityLog {
  id: string;
  type: 'CREATE' | 'BACKUP' | 'DELETE' | 'RESTORE' | 'SHARE';
  description: string;
  timestamp: string;
  cid?: string;
}

export interface AppMetrics {
  invoicesCreated: number;
  invoicesBackedUp: number;
  successfulRestores: number;
  filesUploaded: number;
  messagesSent: number;
}

export class File {
  created: string;
  modified: string;
  name: string;
  content: string;
  billType: number;
  backedUp?: boolean;
  cid?: string;
  lastBackupAt?: string;

  constructor(
    created: string,
    modified: string,
    content: string,
    name: string,
    billType: number,
    backedUp?: boolean,
    cid?: string,
    lastBackupAt?: string
  ) {
    this.created = created;
    this.modified = modified;
    this.content = content;
    this.name = name;
    this.billType = billType;
    this.backedUp = backedUp;
    this.cid = cid;
    this.lastBackupAt = lastBackupAt;
  }
}

export class Local {
  _saveFile = async (file: File) => {
    let data = {
      created: file.created,
      modified: file.modified,
      content: file.content,
      name: file.name,
      billType: file.billType,
      backedUp: file.backedUp,
      cid: file.cid,
      lastBackupAt: file.lastBackupAt,
    };
    await Preferences.set({
      key: file.name,
      value: JSON.stringify(data),
    });
  };

  _getFile = async (name: string) => {
    const rawData = await Preferences.get({ key: name });
    return JSON.parse(rawData.value);
  };

  _getAllFiles = async () => {
    let arr = {};
    const { keys } = await Preferences.keys();
    for (let i = 0; i < keys.length; i++) {
      let fname = keys[i];
      if (fname === "_MeshKit_BackupHistory" || fname === "_MeshKit_ActivityLogs" || fname === "_MeshKit_Metrics") continue;
      const data = await this._getFile(fname);
      arr[fname] = {
        modified: (data as any).modified,
        backedUp: (data as any).backedUp,
        cid: (data as any).cid,
        lastBackupAt: (data as any).lastBackupAt,
      };
    }
    return arr;
  };

  _deleteFile = async (name: string) => {
    await Preferences.remove({ key: name });
  };

  _checkKey = async (key: string) => {
    const { keys } = await Preferences.keys();
    if (keys.includes(key, 0)) {
      return true;
    } else {
      return false;
    }
  };

  _getBackupHistory = async (): Promise<BackupRecord[]> => {
    const rawData = await Preferences.get({ key: "_MeshKit_BackupHistory" });
    if (rawData.value) {
      return JSON.parse(rawData.value);
    }
    return [];
  };

  _addBackupHistory = async (record: BackupRecord) => {
    const history = await this._getBackupHistory();
    history.push(record);
    await Preferences.set({
      key: "_MeshKit_BackupHistory",
      value: JSON.stringify(history)
    });
  };

  _getMetrics = async (): Promise<AppMetrics> => {
    const raw = await Preferences.get({ key: "_MeshKit_Metrics" });
    if (raw.value) return JSON.parse(raw.value);
    return { invoicesCreated: 0, invoicesBackedUp: 0, successfulRestores: 0, filesUploaded: 0, messagesSent: 0 };
  };

  _incrementMetric = async (metric: keyof AppMetrics) => {
    const m = await this._getMetrics();
    m[metric]++;
    await Preferences.set({ key: "_MeshKit_Metrics", value: JSON.stringify(m) });
  };

  _getActivityLogs = async (): Promise<ActivityLog[]> => {
    const raw = await Preferences.get({ key: "_MeshKit_ActivityLogs" });
    if (raw.value) return JSON.parse(raw.value);
    return [];
  };

  _logActivity = async (log: Omit<ActivityLog, 'id' | 'timestamp'>) => {
    const logs = await this._getActivityLogs();
    logs.push({
      ...log,
      id: Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toISOString()
    });
    // Keep only last 50 activities to avoid bloat
    if (logs.length > 50) logs.shift();
    await Preferences.set({ key: "_MeshKit_ActivityLogs", value: JSON.stringify(logs) });
  };
}
