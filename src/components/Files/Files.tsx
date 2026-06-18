import React, { useState, useEffect } from "react";
import "./Files.css";
import * as AppGeneral from "../socialcalc/index.js";
import { DATA } from "../../app-data.js";
import { File as LocalFile, Local, BackupRecord } from "../Storage/LocalStorage";
import {
  IonIcon,
  IonModal,
  IonItem,
  IonButton,
  IonList,
  IonLabel,
  IonAlert,
  IonItemGroup,
  IonActionSheet,
  IonBadge,
  IonToast,
  IonSpinner,
  ActionSheetButton,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButtons
} from "@ionic/react";
import { fileTrayFull, ellipsisVertical, cloudUploadOutline, cloudDownloadOutline, shareSocialOutline, trash, folderOpenOutline, timeOutline } from "ionicons/icons";
import { backupInvoiceToIPFS, restoreInvoiceFromIPFS } from "../../services/MeshkitService";

const Files: React.FC<{
  store: Local;
  file: string;
  updateSelectedFile: Function;
  updateBillType: Function;
}> = (props) => {
  const [modal, setModal] = useState<JSX.Element | null>(null);
  const [listFiles, setListFiles] = useState(false);
  const [showAlertDelete, setShowAlertDelete] = useState(false);
  const [currentKey, setCurrentKey] = useState<string | null>(null);
  
  const [fileList, setFileList] = useState<{ [key: string]: any }>({});
  
  const [actionSheetOpen, setActionSheetOpen] = useState(false);
  const [selectedActionFile, setSelectedActionFile] = useState<string | null>(null);

  const [toastMessage, setToastMessage] = useState("");
  const [showToast, setShowToast] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [backupHistory, setBackupHistory] = useState<BackupRecord[]>([]);

  const loadFiles = async () => {
    const files = await props.store._getAllFiles();
    setFileList(files);
  };

  const loadHistory = async () => {
    const history = await props.store._getBackupHistory();
    setBackupHistory(history.reverse()); // Show newest first
  };

  useEffect(() => {
    if (listFiles) {
      loadFiles();
    }
  }, [listFiles]);

  const displayToast = (msg: string) => {
    setToastMessage(msg);
    setShowToast(true);
  };

  const editFile = (key: string) => {
    props.store._getFile(key).then((data: any) => {
      AppGeneral.viewFile(key, decodeURIComponent(data.content));
      props.updateSelectedFile(key);
      props.updateBillType(data.billType);
      setListFiles(false);
    });
  };

  const deleteFile = (key: string) => {
    setShowAlertDelete(true);
    setCurrentKey(key);
  };

  const loadDefault = () => {
    const msc = DATA["home"][AppGeneral.getDeviceType()]["msc"];
    AppGeneral.viewFile("default", JSON.stringify(msc));
    props.updateSelectedFile("default");
  };

  const _formatDate = (date: string) => {
    if (!date) return "";
    return new Date(date).toLocaleString();
  };

  const handleBackup = async (key: string) => {
    setIsLoading(true);
    try {
      const data: any = await props.store._getFile(key);
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
      await props.store._saveFile(file);
      await props.store._addBackupHistory({
        cid: record.cid,
        timestamp: new Date().toISOString(),
        name: key
      });
      displayToast("Backup successful!");
      loadFiles();
    } catch (error) {
      displayToast(error instanceof Error ? error.message : "Backup failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestore = async (key: string, cid: string) => {
    setIsLoading(true);
    try {
      const backup = await restoreInvoiceFromIPFS(cid);
      const file = new LocalFile(
        backup.created || new Date().toString(),
        backup.modified || new Date().toString(),
        backup.content,
        key,
        backup.billType,
        true,
        cid,
        new Date().toISOString()
      );
      await props.store._saveFile(file);
      displayToast(`Restored IPFS version of ${key}`);
      loadFiles();
      editFile(key); // Automatically open the restored version
    } catch (error) {
      displayToast("Restore failed: " + (error instanceof Error ? error.message : String(error)));
    } finally {
      setIsLoading(false);
    }
  };

  const handleShare = async (cid: string) => {
    try {
      await navigator.clipboard.writeText(`CID: ${cid}\nGateway: https://gateway.pinata.cloud/ipfs/${cid}`);
      displayToast("CID & Gateway Link copied to clipboard!");
    } catch (err) {
      displayToast("Failed to copy link");
    }
  };

  const getActionSheetButtons = (): ActionSheetButton[] => {
    if (!selectedActionFile) return [];
    
    const fileData = fileList[selectedActionFile];
    const isBackedUp = fileData?.backedUp && fileData?.cid;

    const buttons: ActionSheetButton[] = [
      {
        text: 'Open',
        icon: folderOpenOutline,
        handler: () => editFile(selectedActionFile)
      },
      {
        text: 'Backup to IPFS',
        icon: cloudUploadOutline,
        handler: () => handleBackup(selectedActionFile)
      }
    ];

    if (isBackedUp) {
      buttons.push({
        text: 'Restore (Overwrite Local)',
        icon: cloudDownloadOutline,
        handler: () => handleRestore(selectedActionFile, fileData.cid)
      });
      buttons.push({
        text: 'Share',
        icon: shareSocialOutline,
        handler: () => handleShare(fileData.cid)
      });
    }

    buttons.push({
      text: 'Delete',
      role: 'destructive',
      icon: trash,
      handler: () => deleteFile(selectedActionFile)
    });

    buttons.push({
      text: 'Cancel',
      role: 'cancel',
      handler: () => {}
    });

    return buttons;
  };

  const buildModalContent = () => {
    const fileElements = Object.keys(fileList).map((key) => {
      const data = fileList[key];
      return (
        <IonItemGroup key={key}>
          <IonItem button onClick={() => { setSelectedActionFile(key); setActionSheetOpen(true); }}>
            <IonLabel>
              <h2>{key}</h2>
              <p>{_formatDate(data.modified)}</p>
            </IonLabel>
            {data.backedUp ? (
              <IonBadge color="success" slot="end">Backed Up</IonBadge>
            ) : (
              <IonBadge color="medium" slot="end">Not Backed Up</IonBadge>
            )}
            <IonIcon icon={ellipsisVertical} slot="end" />
          </IonItem>
        </IonItemGroup>
      );
    });

    return (
      <IonModal isOpen={listFiles} onDidDismiss={() => setListFiles(false)}>
        <IonHeader>
          <IonToolbar color="primary">
            <IonTitle>Files</IonTitle>
            <IonButtons slot="end">
              <IonButton onClick={() => { loadHistory(); setShowHistoryModal(true); }}>
                <IonIcon icon={timeOutline} slot="icon-only" />
              </IonButton>
              <IonButton onClick={() => setListFiles(false)}>Close</IonButton>
            </IonButtons>
          </IonToolbar>
        </IonHeader>
        <IonContent>
          {isLoading && <IonSpinner style={{ margin: "auto", display: "block", marginTop: "20px" }} />}
          <IonList>{fileElements}</IonList>
          
          <IonActionSheet
            isOpen={actionSheetOpen}
            onDidDismiss={() => setActionSheetOpen(false)}
            header={`Actions for ${selectedActionFile}`}
            buttons={getActionSheetButtons()}
          />

          <IonModal isOpen={showHistoryModal} onDidDismiss={() => setShowHistoryModal(false)}>
            <IonHeader>
              <IonToolbar color="primary">
                <IonTitle>Backup History</IonTitle>
                <IonButtons slot="end">
                  <IonButton onClick={() => setShowHistoryModal(false)}>Close</IonButton>
                </IonButtons>
              </IonToolbar>
            </IonHeader>
            <IonContent>
              {backupHistory.length === 0 ? (
                <p className="ion-text-center ion-padding">No backup history available.</p>
              ) : (
                <IonList>
                  {backupHistory.map((record, index) => (
                    <IonItem key={index}>
                      <IonLabel>
                        <h2>{record.name}</h2>
                        <p>{_formatDate(record.timestamp)}</p>
                        <p style={{fontSize: "0.8em", color: "gray"}}>{record.cid}</p>
                      </IonLabel>
                      <IonButton fill="clear" onClick={() => handleShare(record.cid)}>
                        <IonIcon icon={shareSocialOutline} slot="icon-only" />
                      </IonButton>
                    </IonItem>
                  ))}
                </IonList>
              )}
            </IonContent>
          </IonModal>

        </IonContent>
      </IonModal>
    );
  };

  useEffect(() => {
    setModal(buildModalContent());
  }, [listFiles, fileList, actionSheetOpen, isLoading, showHistoryModal, backupHistory]);

  return (
    <React.Fragment>
      <IonIcon
        icon={fileTrayFull}
        className="ion-padding-end"
        slot="end"
        size="large"
        onClick={() => {
          setListFiles(true);
        }}
      />
      {modal}
      <IonAlert
        animated
        isOpen={showAlertDelete}
        onDidDismiss={() => setShowAlertDelete(false)}
        header="Delete file"
        message={"Do you want to delete the " + currentKey + " file?"}
        buttons={[
          { text: "No", role: "cancel" },
          {
            text: "Yes",
            handler: () => {
              if (currentKey) {
                props.store._deleteFile(currentKey);
                loadDefault();
                setCurrentKey(null);
                loadFiles(); // Refresh list after delete
              }
            },
          },
        ]}
      />
      <IonToast
        isOpen={showToast}
        onDidDismiss={() => setShowToast(false)}
        message={toastMessage}
        duration={3000}
        position="bottom"
      />
    </React.Fragment>
  );
};

export default Files;
