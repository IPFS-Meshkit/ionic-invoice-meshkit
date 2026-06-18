import React, { useState } from "react";
import * as AppGeneral from "../socialcalc/index.js";
import { File, Local } from "../Storage/LocalStorage";
import { isPlatform, IonToast } from "@ionic/react";
import { EmailComposer } from "capacitor-email-composer";
import { Printer } from "@ionic-native/printer";
import { IonActionSheet, IonAlert } from "@ionic/react";
import { saveOutline, save, mail, print, cloudUploadOutline, cloudDownloadOutline } from "ionicons/icons";
import { APP_NAME } from "../../app-data.js";
import { backupInvoiceToIPFS, restoreInvoiceFromIPFS } from "../../services/MeshkitService";
import { BackupSuccessModal } from "../Modals/BackupSuccessModal";

const Menu: React.FC<{
  showM: boolean;
  setM: Function;
  file: string;
  updateSelectedFile: Function;
  store: Local;
  bT: number;
}> = (props) => {
  const [showAlert1, setShowAlert1] = useState(false);
  const [showAlert2, setShowAlert2] = useState(false);
  const [showAlert3, setShowAlert3] = useState(false);
  const [showAlert4, setShowAlert4] = useState(false);
  const [showToast1, setShowToast1] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  const [showAlertBackupMissingFile, setShowAlertBackupMissingFile] = useState(false);
  const [showAlertBackupError, setShowAlertBackupError] = useState(false);
  const [backupCid, setBackupCid] = useState("");
  const [backupErrorMessage, setBackupErrorMessage] = useState("");

  const [showAlertRestore, setShowAlertRestore] = useState(false);
  const [showAlertRestoreSuccess, setShowAlertRestoreSuccess] = useState(false);
  const [showAlertRestoreError, setShowAlertRestoreError] = useState(false);

  /* Utility functions */
  const _validateName = async (filename) => {
    filename = filename.trim();
    if (filename === "default" || filename === "Untitled") {
      setToastMessage("Cannot update default file!");
      return false;
    } else if (filename === "" || !filename) {
      setToastMessage("Filename cannot be empty");
      return false;
    } else if (filename.length > 30) {
      setToastMessage("Filename too long");
      return false;
    } else if (/^[a-zA-Z0-9- ]*$/.test(filename) === false) {
      setToastMessage("Special Characters cannot be used");
      return false;
    } else if (await props.store._checkKey(filename)) {
      setToastMessage("Filename already exists");
      return false;
    }
    return true;
  };
  const getCurrentFileName = () => {
    return props.file;
  };
  const _formatString = (filename) => {
    /* Remove whitespaces */
    while (filename.indexOf(" ") !== -1) {
      filename = filename.replace(" ", "");
    }
    return filename;
  };
  const doPrint = () => {
    if (isPlatform("hybrid")) {
      const printer = Printer;
      printer.print(AppGeneral.getCurrentHTMLContent());
    } else {
      const content = AppGeneral.getCurrentHTMLContent();
      const printWindow = window.open("/printwindow", "Print Invoice");
      printWindow.document.write(content);
      printWindow.print();
    }
  };
  const doSave = () => {
    if (props.file === "default") {
      setShowAlert1(true);
      return;
    }
    const content = encodeURIComponent(AppGeneral.getSpreadsheetContent());
    const data = props.store._getFile(props.file);
    const file = new File(
      (data as any).created,
      new Date().toString(),
      content,
      props.file,
      props.bT
    );
    props.store._saveFile(file);
    props.updateSelectedFile(props.file);
    setShowAlert2(true);
  };
  const doSaveAs = async (filename) => {
    if (filename) {
      if (await _validateName(filename)) {
        const content = encodeURIComponent(AppGeneral.getSpreadsheetContent());
        const file = new File(
          new Date().toString(),
          new Date().toString(),
          content,
          filename,
          props.bT
        );
        props.store._saveFile(file);
        props.updateSelectedFile(filename);
        setShowAlert4(true);
      } else {
        setShowToast1(true);
      }
    }
  };
  const doBackupToIPFS = async () => {
    if (props.file === "default") {
      setShowAlertBackupMissingFile(true);
      return;
    }
    try {
      const data = await props.store._getFile(props.file);
      const content = encodeURIComponent(AppGeneral.getSpreadsheetContent());
      const record = await backupInvoiceToIPFS({
        name: props.file,
        created: (data as any).created,
        modified: new Date().toString(),
        billType: props.bT,
        content,
      });
      setBackupCid(record.cid);
      
      // Update local file metadata
      const file = new File(
        (data as any).created,
        (data as any).modified, // Keep original modified date
        (data as any).content,
        props.file,
        props.bT,
        true, // backedUp
        record.cid,
        new Date().toISOString()
      );
      await props.store._saveFile(file);
      
      // Add to backup history
      await props.store._addBackupHistory({
        cid: record.cid,
        timestamp: new Date().toISOString(),
        name: props.file
      });

    } catch (error) {
      setBackupErrorMessage(error instanceof Error ? error.message : String(error));
      setShowAlertBackupError(true);
    }
  };
  
  const doRestoreFromIPFS = async (cid) => {
    if (!cid) return;
    try {
      const backup = await restoreInvoiceFromIPFS(cid);
      let filename = backup.name;
      
      let counter = 1;
      while (await props.store._checkKey(filename)) {
        filename = `${backup.name}_restored_${counter}`;
        counter++;
      }
      
      const file = new File(
        backup.created || new Date().toString(),
        new Date().toString(),
        backup.content,
        filename,
        backup.billType
      );
      
      await props.store._saveFile(file);
      AppGeneral.viewFile(filename, decodeURIComponent(backup.content));
      props.updateSelectedFile(filename);
      setShowAlertRestoreSuccess(true);
    } catch (error) {
      setBackupErrorMessage(error instanceof Error ? error.message : String(error));
      setShowAlertRestoreError(true);
    }
  };

  const sendEmail = () => {
    if (isPlatform("hybrid")) {
      const content = AppGeneral.getCurrentHTMLContent();
      const base64 = btoa(content);
      EmailComposer.open({
        to: ["jackdwell08@gmail.com"],
        cc: [],
        bcc: [],
        body: "PFA",
        attachments: [{ type: "base64", path: base64, name: "Invoice.html" }],
        subject: `${APP_NAME} attached`,
        isHtml: true,
      });
    } else {
      alert("This Functionality works on Anroid/IOS devices");
    }
  };
  return (
    <React.Fragment>
      <IonActionSheet
        animated
        keyboardClose
        isOpen={props.showM}
        onDidDismiss={() => props.setM()}
        buttons={[
          {
            text: "Save",
            icon: saveOutline,
            handler: () => {
              doSave();
            },
          },
          {
            text: "Save As",
            icon: save,
            handler: () => {
              setShowAlert3(true);
            },
          },
          {
            text: "Backup to IPFS",
            icon: cloudUploadOutline,
            handler: () => {
              doBackupToIPFS();
            },
          },
          {
            text: "Restore from IPFS",
            icon: cloudDownloadOutline,
            handler: () => {
              setShowAlertRestore(true);
            },
          },
          {
            text: "Print",
            icon: print,
            handler: () => {
              doPrint();
            },
          },
          {
            text: "Email",
            icon: mail,
            handler: () => {
              sendEmail();
            },
          },
        ]}
      />
      <IonAlert
        animated
        isOpen={showAlert1}
        onDidDismiss={() => setShowAlert1(false)}
        header="Alert Message"
        message={"Cannot update <strong>" + getCurrentFileName() + "</strong> file!"}
        buttons={["Ok"]}
      />
      <IonAlert
        animated
        isOpen={showAlert2}
        onDidDismiss={() => setShowAlert2(false)}
        header="Save"
        message={"File <strong>" + getCurrentFileName() + "</strong> updated successfully"}
        buttons={["Ok"]}
      />
      <IonAlert
        animated
        isOpen={showAlert3}
        onDidDismiss={() => setShowAlert3(false)}
        header="Save As"
        inputs={[{ name: "filename", type: "text", placeholder: "Enter filename" }]}
        buttons={[
          {
            text: "Ok",
            handler: (alertData) => {
              doSaveAs(alertData.filename);
            },
          },
        ]}
      />
      <IonAlert
        animated
        isOpen={showAlert4}
        onDidDismiss={() => setShowAlert4(false)}
        header="Save As"
        message={"File <strong>" + getCurrentFileName() + "</strong> saved successfully"}
        buttons={["Ok"]}
      />
      <IonAlert
        animated
        isOpen={showAlertBackupMissingFile}
        onDidDismiss={() => setShowAlertBackupMissingFile(false)}
        header="Backup to IPFS"
        message="Please save the file first using Save or Save As before backing it up to IPFS."
        buttons={["Ok"]}
      />
      <BackupSuccessModal
        isOpen={!!backupCid}
        onClose={() => setBackupCid("")}
        cid={backupCid}
      />
      <IonAlert
        animated
        isOpen={showAlertBackupError}
        onDidDismiss={() => setShowAlertBackupError(false)}
        header="Backup to IPFS"
        message={"Backup failed: " + backupErrorMessage}
        buttons={["Ok"]}
      />
      <IonAlert
        animated
        isOpen={showAlertRestore}
        onDidDismiss={() => setShowAlertRestore(false)}
        header="Restore from IPFS"
        inputs={[{ name: "cid", type: "text", placeholder: "Enter CID" }]}
        buttons={[
          {
            text: "Cancel",
            role: "cancel"
          },
          {
            text: "Restore",
            handler: (alertData) => {
              doRestoreFromIPFS(alertData.cid);
            },
          },
        ]}
      />
      <IonAlert
        animated
        isOpen={showAlertRestoreSuccess}
        onDidDismiss={() => setShowAlertRestoreSuccess(false)}
        header="Restore from IPFS"
        message={"Invoice restored successfully and opened!"}
        buttons={["Ok"]}
      />
      <IonAlert
        animated
        isOpen={showAlertRestoreError}
        onDidDismiss={() => setShowAlertRestoreError(false)}
        header="Restore from IPFS"
        message={"Restore failed: " + backupErrorMessage}
        buttons={["Ok"]}
      />
      <IonToast
        animated
        isOpen={showToast1}
        onDidDismiss={() => {
          setShowToast1(false);
          setShowAlert3(true);
        }}
        position="bottom"
        message={toastMessage}
        duration={500}
      />
    </React.Fragment>
  );
};
export default Menu;
