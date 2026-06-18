import React, { useState, useRef } from "react";
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonButton,
  IonInput,
  IonTextarea,
  IonItem,
  IonLabel,
  IonToast,
  IonSpinner,
  IonButtons,
  IonBackButton,
  IonIcon,
} from "@ionic/react";
import { copyOutline, openOutline } from "ionicons/icons";
import {
  testConnection,
  storeJSON,
  retrieveJSON,
  uploadFile,
  downloadFile,
  sendMessage,
  receiveMessage,
  revokeCID,
} from "../services/MeshkitService";

const MeshKitPage: React.FC = () => {
  const [toastMessage, setToastMessage] = useState("");
  const [showToast, setShowToast] = useState(false);

  // Connection
  const [connStatus, setConnStatus] = useState<string | null>(null);
  const [connLoading, setConnLoading] = useState(false);

  // Store JSON
  const [jsonInput, setJsonInput] = useState("");
  const [storedCid, setStoredCid] = useState("");
  const [storeLoading, setStoreLoading] = useState(false);

  // Retrieve JSON
  const [retrieveCid, setRetrieveCid] = useState("");
  const [retrievedJson, setRetrievedJson] = useState<any>(null);
  const [retrieveLoading, setRetrieveLoading] = useState(false);

  // Upload File
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadedCid, setUploadedCid] = useState("");
  const [uploadedFileDetails, setUploadedFileDetails] = useState<{name: string, size: number} | null>(null);

  // Download File
  const [downloadCid, setDownloadCid] = useState("");
  const [downloadLoading, setDownloadLoading] = useState(false);

  // Messaging (Send)
  const [recipientId, setRecipientId] = useState("");
  const [messagePayload, setMessagePayload] = useState("");
  const [messageCid, setMessageCid] = useState("");
  const [sendLoading, setSendLoading] = useState(false);

  // Messaging (Receive)
  const [receiveCid, setReceiveCid] = useState("");
  const [receivedMessage, setReceivedMessage] = useState<any>(null);
  const [receiveLoading, setReceiveLoading] = useState(false);

  // Revoke CID
  const [revokeCidInput, setRevokeCidInput] = useState("");
  const [revokeStatus, setRevokeStatus] = useState<string | null>(null);
  const [revokeLoading, setRevokeLoading] = useState(false);

  const displayToast = (msg: string) => {
    setToastMessage(msg);
    setShowToast(true);
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      displayToast("Copied to clipboard!");
    } catch (err) {
      displayToast("Failed to copy");
    }
  };

  const openGateway = (cid: string) => {
    window.open(`https://gateway.pinata.cloud/ipfs/${cid}`, "_blank");
  };

  const handleTestConnection = async () => {
    setConnLoading(true);
    setConnStatus(null);
    try {
      const isConnected = await testConnection();
      if (isConnected) {
        setConnStatus("Connected to Pinata");
      } else {
        setConnStatus("Connection Failed");
      }
    } catch (error) {
      setConnStatus("Connection Failed");
      displayToast(error instanceof Error ? error.message : "Network Error");
    } finally {
      setConnLoading(false);
    }
  };

  const handleStoreJson = async () => {
    if (!jsonInput) return displayToast("Please enter JSON payload");
    setStoreLoading(true);
    try {
      const parsed = JSON.parse(jsonInput);
      const record = await storeJSON(parsed);
      setStoredCid(record.cid);
      displayToast("JSON stored successfully");
    } catch (error) {
      displayToast(error instanceof Error ? error.message : "Store failed");
    } finally {
      setStoreLoading(false);
    }
  };

  const handleRetrieveJson = async () => {
    if (!retrieveCid) return displayToast("Please enter a valid CID");
    setRetrieveLoading(true);
    try {
      const data = await retrieveJSON(retrieveCid);
      setRetrievedJson(data);
      displayToast("JSON retrieved successfully");
    } catch (error) {
      displayToast(error instanceof Error ? error.message : "Invalid CID or Network Error");
    } finally {
      setRetrieveLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadLoading(true);
    try {
      const record = await uploadFile(file);
      setUploadedCid(record.cid);
      setUploadedFileDetails({ name: file.name, size: file.size });
      displayToast("File uploaded successfully");
    } catch (error) {
      displayToast(error instanceof Error ? error.message : "Upload Failed");
    } finally {
      setUploadLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDownloadFile = async () => {
    if (!downloadCid) return displayToast("Please enter a valid CID");
    setDownloadLoading(true);
    try {
      const blob = await downloadFile(downloadCid);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `downloaded-${downloadCid.substring(0, 8)}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      displayToast("File downloaded successfully");
    } catch (error) {
      displayToast(error instanceof Error ? error.message : "Download Failed");
    } finally {
      setDownloadLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!recipientId || !messagePayload) return displayToast("Please fill all fields");
    setSendLoading(true);
    try {
      const record = await sendMessage(recipientId, JSON.parse(messagePayload));
      setMessageCid(record.cid);
      displayToast("Message sent successfully");
    } catch (error) {
      displayToast(error instanceof Error ? error.message : "Failed to send message");
    } finally {
      setSendLoading(false);
    }
  };

  const handleReceiveMessage = async () => {
    if (!receiveCid) return displayToast("Please enter a valid CID");
    setReceiveLoading(true);
    try {
      const data = await receiveMessage(receiveCid);
      setReceivedMessage(data);
      displayToast("Message received successfully");
    } catch (error) {
      displayToast(error instanceof Error ? error.message : "Failed to receive message");
    } finally {
      setReceiveLoading(false);
    }
  };

  const handleRevoke = async () => {
    if (!revokeCidInput) return displayToast("Please enter a valid CID");
    setRevokeLoading(true);
    setRevokeStatus(null);
    try {
      const success = await revokeCID(revokeCidInput);
      if (success) {
        setRevokeStatus("Content Unpinned Successfully");
        displayToast("Content revoked");
      } else {
        setRevokeStatus("Revoke Failed");
      }
    } catch (error) {
      setRevokeStatus("Revoke Failed");
      displayToast(error instanceof Error ? error.message : "Failed to revoke");
    } finally {
      setRevokeLoading(false);
    }
  };

  const renderCidActions = (cid: string) => (
    <div style={{ marginTop: "10px", display: "flex", gap: "10px" }}>
      <IonButton size="small" fill="outline" onClick={() => copyToClipboard(cid)}>
        <IonIcon icon={copyOutline} slot="start" /> Copy CID
      </IonButton>
      <IonButton size="small" fill="outline" onClick={() => openGateway(cid)}>
        <IonIcon icon={openOutline} slot="start" /> Open Gateway
      </IonButton>
    </div>
  );

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar color="primary">
          <IonButtons slot="start">
            <IonBackButton defaultHref="/home" />
          </IonButtons>
          <IonTitle>MeshKit SDK Demo</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding">
        {/* Connection Testing */}
        <IonCard>
          <IonCardHeader>
            <IonCardTitle>Connection Status</IonCardTitle>
          </IonCardHeader>
          <IonCardContent>
            <IonButton onClick={handleTestConnection} disabled={connLoading}>
              {connLoading ? <IonSpinner name="crescent" /> : "Test Connection"}
            </IonButton>
            {connStatus && (
              <p style={{ marginTop: "10px", fontWeight: "bold", color: connStatus.includes("Failed") ? "red" : "green" }}>
                {connStatus}
              </p>
            )}
          </IonCardContent>
        </IonCard>

        {/* Store JSON */}
        <IonCard>
          <IonCardHeader>
            <IonCardTitle>Store JSON</IonCardTitle>
          </IonCardHeader>
          <IonCardContent>
            <IonItem>
              <IonLabel position="stacked">JSON Payload</IonLabel>
              <IonTextarea
                placeholder='{"key": "value"}'
                value={jsonInput}
                onIonChange={(e) => setJsonInput(e.detail.value!)}
                rows={4}
              />
            </IonItem>
            <IonButton className="ion-margin-top" onClick={handleStoreJson} disabled={storeLoading}>
              {storeLoading ? <IonSpinner name="crescent" /> : "Store"}
            </IonButton>
            {storedCid && (
              <div style={{ marginTop: "15px" }}>
                <strong>Generated CID:</strong> {storedCid}
                {renderCidActions(storedCid)}
              </div>
            )}
          </IonCardContent>
        </IonCard>

        {/* Retrieve JSON */}
        <IonCard>
          <IonCardHeader>
            <IonCardTitle>Retrieve JSON</IonCardTitle>
          </IonCardHeader>
          <IonCardContent>
            <IonItem>
              <IonLabel position="stacked">CID</IonLabel>
              <IonInput
                placeholder="Enter CID"
                value={retrieveCid}
                onIonChange={(e) => setRetrieveCid(e.detail.value!)}
              />
            </IonItem>
            <IonButton className="ion-margin-top" onClick={handleRetrieveJson} disabled={retrieveLoading}>
              {retrieveLoading ? <IonSpinner name="crescent" /> : "Retrieve"}
            </IonButton>
            {retrievedJson && (
              <div style={{ marginTop: "15px", backgroundColor: "#f4f5f8", padding: "10px", borderRadius: "8px" }}>
                <pre style={{ margin: 0, whiteSpace: "pre-wrap", wordWrap: "break-word" }}>
                  {JSON.stringify(retrievedJson, null, 2)}
                </pre>
              </div>
            )}
          </IonCardContent>
        </IonCard>

        {/* File Upload */}
        <IonCard>
          <IonCardHeader>
            <IonCardTitle>Upload File</IonCardTitle>
          </IonCardHeader>
          <IonCardContent>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              style={{ display: "none" }}
            />
            <IonButton onClick={() => fileInputRef.current?.click()} disabled={uploadLoading}>
              {uploadLoading ? <IonSpinner name="crescent" /> : "Select File"}
            </IonButton>
            {uploadedCid && (
              <div style={{ marginTop: "15px" }}>
                <strong>File Name:</strong> {uploadedFileDetails?.name} <br />
                <strong>File Size:</strong> {(uploadedFileDetails?.size! / 1024).toFixed(2)} KB <br />
                <strong>CID:</strong> {uploadedCid}
                {renderCidActions(uploadedCid)}
              </div>
            )}
          </IonCardContent>
        </IonCard>

        {/* File Download */}
        <IonCard>
          <IonCardHeader>
            <IonCardTitle>Download File</IonCardTitle>
          </IonCardHeader>
          <IonCardContent>
            <IonItem>
              <IonLabel position="stacked">CID</IonLabel>
              <IonInput
                placeholder="Enter CID"
                value={downloadCid}
                onIonChange={(e) => setDownloadCid(e.detail.value!)}
              />
            </IonItem>
            <IonButton className="ion-margin-top" onClick={handleDownloadFile} disabled={downloadLoading}>
              {downloadLoading ? <IonSpinner name="crescent" /> : "Download File"}
            </IonButton>
          </IonCardContent>
        </IonCard>

        {/* Messaging (Send) */}
        <IonCard>
          <IonCardHeader>
            <IonCardTitle>Messaging - Send</IonCardTitle>
          </IonCardHeader>
          <IonCardContent>
            <IonItem>
              <IonLabel position="stacked">Recipient ID</IonLabel>
              <IonInput
                placeholder="Enter Recipient ID"
                value={recipientId}
                onIonChange={(e) => setRecipientId(e.detail.value!)}
              />
            </IonItem>
            <IonItem>
              <IonLabel position="stacked">Message (JSON)</IonLabel>
              <IonTextarea
                placeholder='{"text": "Hello"}'
                value={messagePayload}
                onIonChange={(e) => setMessagePayload(e.detail.value!)}
                rows={3}
              />
            </IonItem>
            <IonButton className="ion-margin-top" onClick={handleSendMessage} disabled={sendLoading}>
              {sendLoading ? <IonSpinner name="crescent" /> : "Send Message"}
            </IonButton>
            {messageCid && (
              <div style={{ marginTop: "15px" }}>
                <strong>Message CID:</strong> {messageCid}
                {renderCidActions(messageCid)}
              </div>
            )}
          </IonCardContent>
        </IonCard>

        {/* Messaging (Receive) */}
        <IonCard>
          <IonCardHeader>
            <IonCardTitle>Messaging - Receive</IonCardTitle>
          </IonCardHeader>
          <IonCardContent>
            <IonItem>
              <IonLabel position="stacked">Message CID</IonLabel>
              <IonInput
                placeholder="Enter CID"
                value={receiveCid}
                onIonChange={(e) => setReceiveCid(e.detail.value!)}
              />
            </IonItem>
            <IonButton className="ion-margin-top" onClick={handleReceiveMessage} disabled={receiveLoading}>
              {receiveLoading ? <IonSpinner name="crescent" /> : "Receive Message"}
            </IonButton>
            {receivedMessage && (
              <div style={{ marginTop: "15px", backgroundColor: "#f4f5f8", padding: "10px", borderRadius: "8px" }}>
                <pre style={{ margin: 0, whiteSpace: "pre-wrap", wordWrap: "break-word" }}>
                  {JSON.stringify(receivedMessage, null, 2)}
                </pre>
              </div>
            )}
          </IonCardContent>
        </IonCard>

        {/* Revoke Content */}
        <IonCard>
          <IonCardHeader>
            <IonCardTitle>Revoke Content</IonCardTitle>
          </IonCardHeader>
          <IonCardContent>
            <IonItem>
              <IonLabel position="stacked">CID to Revoke</IonLabel>
              <IonInput
                placeholder="Enter CID"
                value={revokeCidInput}
                onIonChange={(e) => setRevokeCidInput(e.detail.value!)}
              />
            </IonItem>
            <IonButton color="danger" className="ion-margin-top" onClick={handleRevoke} disabled={revokeLoading}>
              {revokeLoading ? <IonSpinner name="crescent" /> : "Revoke"}
            </IonButton>
            {revokeStatus && (
              <p style={{ marginTop: "10px", fontWeight: "bold", color: revokeStatus.includes("Failed") ? "red" : "green" }}>
                {revokeStatus}
              </p>
            )}
          </IonCardContent>
        </IonCard>

      </IonContent>

      <IonToast
        isOpen={showToast}
        onDidDismiss={() => setShowToast(false)}
        message={toastMessage}
        duration={3000}
        position="bottom"
      />
    </IonPage>
  );
};

export default MeshKitPage;