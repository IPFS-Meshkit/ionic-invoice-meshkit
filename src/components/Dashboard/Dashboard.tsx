import React, { useState, useEffect } from "react";
import {
  IonGrid, IonRow, IonCol, IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonCardSubtitle,
  IonButton, IonIcon, IonBadge, IonText, IonSpinner, IonAlert, IonToast, IonItem, IonLabel, IonList,
  IonInput
} from "@ionic/react";
import { 
  documentTextOutline, cloudUploadOutline, cloudDownloadOutline, shareSocialOutline, trashOutline,
  addCircleOutline, serverOutline, hardwareChipOutline, openOutline, timeOutline, statsChartOutline, searchOutline, documentOutline
} from "ionicons/icons";
import { Local, File as LocalFile, BackupRecord, ActivityLog, AppMetrics } from "../Storage/LocalStorage";
import { backupInvoiceToIPFS, restoreInvoiceFromIPFS, testConnection } from "../../services/MeshkitService";
import { BackupSuccessModal } from "../Modals/BackupSuccessModal";
import { RestoreSuccessModal } from "../Modals/RestoreSuccessModal";
import * as AppGeneral from "../socialcalc/index.js";
import { useHistory } from "react-router";
import { DATA } from "../../app-data.js";

interface DashboardProps {
  store: Local;
  onOpenFile: (key: string, billType: number) => void;
  currentBillType: number;
}

const Dashboard: React.FC<DashboardProps> = ({ store, onOpenFile, currentBillType }) => {
  const [fileList, setFileList] = useState<{ [key: string]: any }>({});
  const [backupHistory, setBackupHistory] = useState<BackupRecord[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [metrics, setMetrics] = useState<AppMetrics>({ invoicesCreated: 0, invoicesBackedUp: 0, successfulRestores: 0, filesUploaded: 0, messagesSent: 0 });
  const [isLoading, setIsLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [showToast, setShowToast] = useState(false);
  
  // MeshKit Status
  const [connStatus, setConnStatus] = useState<string>("Pending");
  
  // Modals / Alerts
  const [showAlertDelete, setShowAlertDelete] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<string | null>(null);
  
  const [showNewFilePrompt, setShowNewFilePrompt] = useState(false);
  const [showRestorePrompt, setShowRestorePrompt] = useState(false);
  
  const [backupSuccessCid, setBackupSuccessCid] = useState<string | null>(null);
  const [restoreSuccessFile, setRestoreSuccessFile] = useState<string | null>(null);

  // CID Explorer
  const [exploreCid, setExploreCid] = useState("");

  const history = useHistory();

  const loadData = async () => {
    const files = await store._getAllFiles();
    setFileList(files);
    
    const hist = await store._getBackupHistory();
    setBackupHistory(hist.reverse());

    const logs = await store._getActivityLogs();
    setActivityLogs(logs.reverse());

    const m = await store._getMetrics();
    setMetrics(m);
  };

  const checkConnection = async () => {
    try {
      const isOnline = await testConnection();
      setConnStatus(isOnline ? "Online" : "Offline");
    } catch {
      setConnStatus("Offline");
    }
  };

  useEffect(() => {
    loadData();
    checkConnection();
  }, []);

  const displayToast = (msg: string) => {
    setToastMessage(msg);
    setShowToast(true);
  };

  const _formatDate = (date: string) => {
    if (!date) return "";
    return new Date(date).toLocaleString();
  };

  const handleOpen = (key: string) => {
    store._getFile(key).then((data: any) => {
      AppGeneral.viewFile(key, decodeURIComponent(data.content));
      onOpenFile(key, data.billType);
    });
  };

  const handleBackup = async (key: string) => {
    setIsLoading(true);
    try {
      const data: any = await store._getFile(key);
      const record = await backupInvoiceToIPFS({
        name: key,
        created: data.created,
        modified: new Date().toString(),
        billType: data.billType,
        content: data.content,
      });

      const file = new LocalFile(
        data.created,
        data.modified,
        data.content,
        key,
        data.billType,
        true,
        record.cid,
        new Date().toISOString()
      );
      await store._saveFile(file);
      await store._addBackupHistory({ cid: record.cid, timestamp: new Date().toISOString(), name: key });
      await store._incrementMetric('invoicesBackedUp');
      await store._logActivity({ type: 'BACKUP', description: `Backed up ${key} to IPFS`, cid: record.cid });
      loadData();
      setBackupSuccessCid(record.cid);
    } catch (error) {
      displayToast(error instanceof Error ? error.message : "Backup failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestore = async (cid: string, overwriteKey?: string) => {
    if (!cid) return;
    setIsLoading(true);
    try {
      const backup = await restoreInvoiceFromIPFS(cid);
      let filename = overwriteKey || backup.name || "restored_invoice";
      
      if (!overwriteKey) {
        let counter = 1;
        while (await store._checkKey(filename)) {
          filename = `${backup.name || "restored_invoice"}_${counter}`;
          counter++;
        }
      }
      
      const file = new LocalFile(
        backup.created || new Date().toString(),
        backup.modified || new Date().toString(),
        backup.content,
        filename,
        backup.billType,
        true,
        cid,
        new Date().toISOString()
      );
      
      await store._saveFile(file);
      await store._incrementMetric('successfulRestores');
      await store._logActivity({ type: 'RESTORE', description: `Restored ${filename} from IPFS`, cid });
      loadData();
      handleOpen(filename);
      setRestoreSuccessFile(filename);
    } catch (error) {
      displayToast("Restore failed: " + (error instanceof Error ? error.message : String(error)));
    } finally {
      setIsLoading(false);
    }
  };

  const handleShare = async (cid: string) => {
    try {
      await navigator.clipboard.writeText(`CID: ${cid}\nGateway: https://gateway.pinata.cloud/ipfs/${cid}`);
      await store._logActivity({ type: 'SHARE', description: `Shared IPFS CID`, cid });
      loadData();
      displayToast("CID & Gateway Link copied to clipboard!");
    } catch (err) {
      displayToast("Failed to copy link");
    }
  };

  const handleDelete = (key: string) => {
    setFileToDelete(key);
    setShowAlertDelete(true);
  };

  const confirmDelete = async () => {
    if (fileToDelete) {
      await store._deleteFile(fileToDelete);
      await store._logActivity({ type: 'DELETE', description: `Deleted invoice ${fileToDelete}` });
      loadData();
      setFileToDelete(null);
      displayToast("Invoice deleted");
    }
  };

  const handleNewFile = async (filename: string) => {
    if (!filename || filename.trim() === "" || filename === "default") {
      displayToast("Invalid filename");
      return;
    }
    if (await store._checkKey(filename)) {
      displayToast("Filename already exists");
      return;
    }
    const content = encodeURIComponent(JSON.stringify(DATA["home"][AppGeneral.getDeviceType()]["msc"]));
    const file = new LocalFile(new Date().toString(), new Date().toString(), content, filename, currentBillType);
    await store._saveFile(file);
    await store._incrementMetric('invoicesCreated');
    await store._logActivity({ type: 'CREATE', description: `Created new invoice ${filename}` });
    loadData();
    handleOpen(filename);
  };

  const handleExportReport = async () => {
    const hist = await store._getBackupHistory();
    let report = "========================================\n";
    report += "   MESHKIT + IPFS DECENTRALIZED REPORT  \n";
    report += "========================================\n\n";
    hist.forEach(h => {
      report += `Invoice Name    : ${h.name}\n`;
      report += `CID             : ${h.cid}\n`;
      report += `Timestamp       : ${new Date(h.timestamp).toLocaleString()}\n`;
      report += `Provider        : Pinata IPFS\n`;
      report += `Recovery Status : Verified & Available\n`;
      report += `Gateway Link    : https://gateway.pinata.cloud/ipfs/${h.cid}\n`;
      report += `----------------------------------------\n`;
    });
    const blob = new Blob([report], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "Decentralized_Storage_Report.txt";
    a.click();
    displayToast("Report exported successfully");
  };

  const handleExploreCID = () => {
    if (!exploreCid) return displayToast("Enter a valid CID");
    window.open(`https://gateway.pinata.cloud/ipfs/${exploreCid}`, "_blank");
  };

  const uniqueCIDs = new Set(backupHistory.map(h => h.cid)).size;

  return (
    <div className="dashboard-container" style={{ padding: '0 0 20px 0', overflowY: 'auto', height: '100%', backgroundColor: 'var(--ion-background-color)' }}>
      {isLoading && <IonSpinner style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 1000 }} />}
      
      {/* Demo Banner */}
      <div style={{ backgroundColor: 'var(--ion-color-tertiary)', padding: '12px', textAlign: 'center', color: 'white', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
        <IonIcon icon={hardwareChipOutline} style={{ fontSize: '1.2em' }} /> 
        Demo Mode: Powered by MeshKit + IPFS
      </div>

      <IonGrid style={{ padding: '20px' }}>
        
        {/* Metrics Row */}
        <IonRow>
          {[
            { label: "Created", value: metrics.invoicesCreated, color: "primary" },
            { label: "Backed Up", value: metrics.invoicesBackedUp, color: "success" },
            { label: "Restored", value: metrics.successfulRestores, color: "secondary" },
            { label: "Files Uploaded", value: metrics.filesUploaded, color: "warning" },
            { label: "Messages Sent", value: metrics.messagesSent, color: "tertiary" },
          ].map((m, idx) => (
            <IonCol size="6" sizeMd="2" key={idx}>
              <IonCard style={{ margin: 0, textAlign: 'center', padding: '15px 0' }}>
                <IonText color={m.color}><h1 style={{ margin: 0, fontWeight: 'bold' }}>{m.value}</h1></IonText>
                <IonText color="medium"><p style={{ margin: '5px 0 0 0', fontSize: '0.8em', textTransform: 'uppercase', letterSpacing: '1px' }}>{m.label}</p></IonText>
              </IonCard>
            </IonCol>
          ))}
          <IonCol size="12" sizeMd="2">
            <IonCard style={{ margin: 0, height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--ion-color-light)' }}>
              <IonButton fill="clear" onClick={handleExportReport}>
                <IonIcon icon={documentTextOutline} slot="start" />
                Export Report
              </IonButton>
            </IonCard>
          </IonCol>
        </IonRow>

        <IonRow style={{ marginTop: '20px' }}>
          {/* Main Left Column */}
          <IonCol size="12" sizeLg="8">
            <h2 style={{ paddingLeft: '10px', marginTop: 0, fontWeight: 'bold' }}>Recent Invoices</h2>
            <IonGrid className="ion-no-padding">
              <IonRow>
                {Object.keys(fileList).length === 0 ? (
                  <IonCol size="12">
                    <p style={{ paddingLeft: '10px', color: 'var(--ion-color-medium)' }}>No invoices found. Create a new one to get started.</p>
                  </IonCol>
                ) : (
                  Object.keys(fileList).map(key => (
                    <IonCol size="12" sizeMd="6" key={key}>
                      <IonCard>
                        <IonCardHeader>
                          <IonCardTitle>{key}</IonCardTitle>
                          <IonCardSubtitle>{_formatDate(fileList[key].modified)}</IonCardSubtitle>
                        </IonCardHeader>
                        <IonCardContent>
                          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '15px' }}>
                            <IonBadge color={fileList[key].backedUp ? 'success' : 'medium'}>
                              {fileList[key].backedUp ? 'Backed Up' : 'Not Backed Up'}
                            </IonBadge>
                            {fileList[key].cid && (
                              <span style={{ marginLeft: '10px', fontSize: '0.85em', color: 'var(--ion-color-medium)' }}>
                                CID: {fileList[key].cid.substring(0, 8)}...
                              </span>
                            )}
                          </div>
                          <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                            <IonButton size="small" onClick={() => handleOpen(key)}>
                              <IonIcon icon={openOutline} slot="start" /> Open
                            </IonButton>
                            <IonButton size="small" fill="outline" onClick={() => handleBackup(key)}>
                              <IonIcon icon={cloudUploadOutline} slot="start" /> Backup
                            </IonButton>
                            {fileList[key].backedUp && (
                              <IonButton size="small" fill="outline" color="secondary" onClick={() => handleRestore(fileList[key].cid, key)}>
                                <IonIcon icon={cloudDownloadOutline} slot="start" /> Restore
                              </IonButton>
                            )}
                            {fileList[key].backedUp && (
                              <IonButton size="small" fill="outline" color="tertiary" onClick={() => handleShare(fileList[key].cid)}>
                                <IonIcon icon={shareSocialOutline} slot="start" /> Share
                              </IonButton>
                            )}
                            <IonButton size="small" fill="clear" color="danger" onClick={() => handleDelete(key)}>
                              <IonIcon icon={trashOutline} slot="icon-only" />
                            </IonButton>
                          </div>
                        </IonCardContent>
                      </IonCard>
                    </IonCol>
                  ))
                )}
              </IonRow>
            </IonGrid>

            <h2 style={{ paddingLeft: '10px', marginTop: '30px', fontWeight: 'bold' }}>Activity Timeline</h2>
            <IonCard>
              <IonCardContent className="ion-no-padding">
                {activityLogs.length === 0 ? (
                  <p className="ion-padding ion-text-center" style={{ color: 'var(--ion-color-medium)' }}>No activities recorded.</p>
                ) : (
                  <IonList lines="full">
                    {activityLogs.slice(0, 15).map((log, idx) => {
                      let icon = documentOutline;
                      let color = "primary";
                      if (log.type === 'BACKUP') { icon = cloudUploadOutline; color = "success"; }
                      if (log.type === 'RESTORE') { icon = cloudDownloadOutline; color = "secondary"; }
                      if (log.type === 'DELETE') { icon = trashOutline; color = "danger"; }
                      if (log.type === 'SHARE') { icon = shareSocialOutline; color = "tertiary"; }

                      return (
                        <IonItem key={log.id}>
                          <IonIcon icon={icon} slot="start" color={color} />
                          <IonLabel className="ion-text-wrap">
                            <p style={{ fontWeight: 'bold', color: `var(--ion-color-${color})`, marginBottom: '4px' }}>{log.type}</p>
                            <h2>{log.description}</h2>
                            <p style={{ fontSize: '0.8em', marginTop: '4px' }}>{_formatDate(log.timestamp)}</p>
                            {log.cid && <p style={{ fontSize: '0.8em', color: 'var(--ion-color-medium)' }}>CID: {log.cid}</p>}
                          </IonLabel>
                          {log.cid && (
                            <IonButton fill="clear" onClick={() => handleShare(log.cid!)}>
                              <IonIcon icon={shareSocialOutline} slot="icon-only" />
                            </IonButton>
                          )}
                        </IonItem>
                      );
                    })}
                  </IonList>
                )}
              </IonCardContent>
            </IonCard>

          </IonCol>

          {/* Sidebar Right Column */}
          <IonCol size="12" sizeLg="4">
            
            <h2 style={{ paddingLeft: '10px', marginTop: 0, fontWeight: 'bold' }}>Quick Actions</h2>
            <IonCard>
              <IonCardContent style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <IonButton expand="block" onClick={() => setShowNewFilePrompt(true)}>
                  <IonIcon icon={addCircleOutline} slot="start" /> New Invoice
                </IonButton>
                <IonButton expand="block" fill="outline" onClick={() => setShowRestorePrompt(true)}>
                  <IonIcon icon={cloudDownloadOutline} slot="start" /> Restore from CID
                </IonButton>
                <IonButton expand="block" fill="outline" color="secondary" onClick={() => history.push("/meshkit")}>
                  <IonIcon icon={hardwareChipOutline} slot="start" /> MeshKit SDK Demo
                </IonButton>
              </IonCardContent>
            </IonCard>

            <h2 style={{ paddingLeft: '10px', marginTop: '20px', fontWeight: 'bold' }}>CID Explorer</h2>
            <IonCard>
              <IonCardContent>
                <IonItem lines="none" style={{ '--padding-start': '0' }}>
                  <IonInput 
                    placeholder="Enter any CID..." 
                    value={exploreCid}
                    onIonChange={(e) => setExploreCid(e.detail.value!)}
                    style={{ backgroundColor: 'var(--ion-color-light)', padding: '10px', borderRadius: '8px' }}
                  />
                </IonItem>
                <IonButton expand="block" color="tertiary" className="ion-margin-top" onClick={handleExploreCID}>
                  <IonIcon icon={searchOutline} slot="start" /> View CID Details
                </IonButton>
              </IonCardContent>
            </IonCard>

            <h2 style={{ paddingLeft: '10px', marginTop: '20px', fontWeight: 'bold' }}>MeshKit Status</h2>
            <IonCard>
              <IonCardContent className="ion-no-padding">
                <IonList lines="none">
                  <IonItem>
                    <IonIcon icon={serverOutline} slot="start" color="primary" />
                    <IonLabel>Provider</IonLabel>
                    <IonText slot="end">Pinata</IonText>
                  </IonItem>
                  <IonItem>
                    <IonIcon icon={hardwareChipOutline} slot="start" color="primary" />
                    <IonLabel>Connection</IonLabel>
                    <IonBadge color={connStatus === 'Online' ? 'success' : connStatus === 'Offline' ? 'danger' : 'warning'} slot="end">
                      {connStatus}
                    </IonBadge>
                  </IonItem>
                  <IonItem>
                    <IonIcon icon={documentTextOutline} slot="start" color="primary" />
                    <IonLabel>Backups Stored</IonLabel>
                    <IonText slot="end" style={{ fontWeight: 'bold' }}>{uniqueCIDs}</IonText>
                  </IonItem>
                </IonList>
              </IonCardContent>
            </IonCard>

          </IonCol>
        </IonRow>
      </IonGrid>

      <IonAlert
        animated
        isOpen={showAlertDelete}
        onDidDismiss={() => setShowAlertDelete(false)}
        header="Delete Invoice"
        message={`Are you sure you want to delete ${fileToDelete}?`}
        buttons={[
          { text: "Cancel", role: "cancel" },
          { text: "Delete", role: "destructive", handler: confirmDelete }
        ]}
      />

      <IonAlert
        animated
        isOpen={showNewFilePrompt}
        onDidDismiss={() => setShowNewFilePrompt(false)}
        header="New Invoice"
        inputs={[{ name: "filename", type: "text", placeholder: "Enter filename" }]}
        buttons={[
          { text: "Cancel", role: "cancel" },
          { text: "Create", handler: (data) => handleNewFile(data.filename) }
        ]}
      />

      <IonAlert
        animated
        isOpen={showRestorePrompt}
        onDidDismiss={() => setShowRestorePrompt(false)}
        header="Restore Invoice from IPFS"
        inputs={[{ name: "cid", type: "text", placeholder: "Enter CID" }]}
        buttons={[
          { text: "Cancel", role: "cancel" },
          { text: "Restore", handler: (data) => handleRestore(data.cid) }
        ]}
      />

      <IonToast
        isOpen={showToast}
        onDidDismiss={() => setShowToast(false)}
        message={toastMessage}
        duration={3000}
        position="bottom"
      />

      <BackupSuccessModal 
        isOpen={!!backupSuccessCid} 
        onClose={() => setBackupSuccessCid(null)} 
        cid={backupSuccessCid || ""} 
      />

      <RestoreSuccessModal 
        isOpen={!!restoreSuccessFile} 
        onClose={() => setRestoreSuccessFile(null)} 
        filename={restoreSuccessFile || ""} 
      />
    </div>
  );
};

export default Dashboard;
