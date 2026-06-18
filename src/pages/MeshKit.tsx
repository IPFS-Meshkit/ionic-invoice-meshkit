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
  IonGrid,
  IonRow,
  IonCol,
  IonBadge,
  IonText
} from "@ionic/react";
import { 
  copyOutline, openOutline, cloudUploadOutline, cloudDownloadOutline, 
  serverOutline, documentTextOutline, sendOutline, mailUnreadOutline, 
  trashOutline, hardwareChipOutline
} from "ionicons/icons";
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
import { Local } from "../components/Storage/LocalStorage";

const MeshKitPage: React.FC = () => {
  const store = new Local();

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
        setConnStatus("Connected");
      } else {
        setConnStatus("Failed");
      }
    } catch (error) {
      setConnStatus("Failed");
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
      await store._incrementMetric('filesUploaded');
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
      await store._incrementMetric('messagesSent');
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
        setRevokeStatus("Success");
        displayToast("Content revoked");
      } else {
        setRevokeStatus("Failed");
      }
    } catch (error) {
      setRevokeStatus("Failed");
      displayToast(error instanceof Error ? error.message : "Failed to revoke");
    } finally {
      setRevokeLoading(false);
    }
  };

  const renderCidActions = (cid: string) => (
    <div style={{ marginTop: "15px", display: "flex", gap: "10px", flexWrap: 'wrap' }}>
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
          <IonTitle>MeshKit SDK Operations</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding">
        
        {/* Core Infrastructure */}
        <IonGrid>
          <IonRow>
            <IonCol size="12">
              <h2 style={{ paddingLeft: '5px', fontWeight: 'bold' }}>Infrastructure</h2>
            </IonCol>
            <IonCol size="12" sizeMd="6">
              <IonCard>
                <IonCardHeader>
                  <IonCardTitle className="ion-align-items-center" style={{ display: 'flex', gap: '8px' }}>
                    <IonIcon icon={serverOutline} color="primary" /> Connection Status
                  </IonCardTitle>
                </IonCardHeader>
                <IonCardContent>
                  <IonButton expand="block" onClick={handleTestConnection} disabled={connLoading}>
                    {connLoading ? <IonSpinner name="crescent" /> : "Test Pinata Connection"}
                  </IonButton>
                  {connStatus && (
                    <div className="ion-margin-top ion-text-center">
                      <IonBadge color={connStatus === 'Connected' ? 'success' : 'danger'} style={{ fontSize: '1em', padding: '8px' }}>
                        {connStatus}
                      </IonBadge>
                    </div>
                  )}
                </IonCardContent>
              </IonCard>
            </IonCol>

            <IonCol size="12" sizeMd="6">
              <IonCard>
                <IonCardHeader>
                  <IonCardTitle className="ion-align-items-center" style={{ display: 'flex', gap: '8px' }}>
                    <IonIcon icon={trashOutline} color="danger" /> Revoke Content
                  </IonCardTitle>
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
                  <IonButton expand="block" color="danger" className="ion-margin-top" onClick={handleRevoke} disabled={revokeLoading}>
                    {revokeLoading ? <IonSpinner name="crescent" /> : "Revoke Pin"}
                  </IonButton>
                  {revokeStatus && (
                    <div className="ion-margin-top ion-text-center">
                      <IonBadge color={revokeStatus === 'Success' ? 'success' : 'danger'} style={{ fontSize: '1em', padding: '8px' }}>
                        {revokeStatus === 'Success' ? 'Content Unpinned' : 'Revoke Failed'}
                      </IonBadge>
                    </div>
                  )}
                </IonCardContent>
              </IonCard>
            </IonCol>
          </IonRow>

          <IonRow>
            <IonCol size="12">
              <h2 style={{ paddingLeft: '5px', fontWeight: 'bold', marginTop: '20px' }}>Data Store (JSON)</h2>
            </IonCol>
            <IonCol size="12" sizeMd="6">
              <IonCard>
                <IonCardHeader>
                  <IonCardTitle className="ion-align-items-center" style={{ display: 'flex', gap: '8px' }}>
                    <IonIcon icon={documentTextOutline} color="secondary" /> Store JSON
                  </IonCardTitle>
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
                  <IonButton expand="block" color="secondary" className="ion-margin-top" onClick={handleStoreJson} disabled={storeLoading}>
                    {storeLoading ? <IonSpinner name="crescent" /> : "Store Data"}
                  </IonButton>
                  {storedCid && (
                    <div className="ion-margin-top ion-padding" style={{ backgroundColor: 'var(--ion-color-light)', borderRadius: '8px' }}>
                      <IonText color="dark"><strong>Generated CID:</strong></IonText>
                      <p style={{ wordBreak: 'break-all', margin: '5px 0' }}>{storedCid}</p>
                      {renderCidActions(storedCid)}
                    </div>
                  )}
                </IonCardContent>
              </IonCard>
            </IonCol>

            <IonCol size="12" sizeMd="6">
              <IonCard>
                <IonCardHeader>
                  <IonCardTitle className="ion-align-items-center" style={{ display: 'flex', gap: '8px' }}>
                    <IonIcon icon={documentTextOutline} color="tertiary" /> Retrieve JSON
                  </IonCardTitle>
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
                  <IonButton expand="block" color="tertiary" className="ion-margin-top" onClick={handleRetrieveJson} disabled={retrieveLoading}>
                    {retrieveLoading ? <IonSpinner name="crescent" /> : "Retrieve Data"}
                  </IonButton>
                  {retrievedJson && (
                    <div className="ion-margin-top ion-padding" style={{ backgroundColor: 'var(--ion-color-light)', borderRadius: '8px' }}>
                      <pre style={{ margin: 0, whiteSpace: "pre-wrap", wordWrap: "break-word", color: 'var(--ion-color-dark)' }}>
                        {JSON.stringify(retrievedJson, null, 2)}
                      </pre>
                    </div>
                  )}
                </IonCardContent>
              </IonCard>
            </IonCol>
          </IonRow>

          <IonRow>
            <IonCol size="12">
              <h2 style={{ paddingLeft: '5px', fontWeight: 'bold', marginTop: '20px' }}>File Store (Blob)</h2>
            </IonCol>
            <IonCol size="12" sizeMd="6">
              <IonCard>
                <IonCardHeader>
                  <IonCardTitle className="ion-align-items-center" style={{ display: 'flex', gap: '8px' }}>
                    <IonIcon icon={cloudUploadOutline} color="warning" /> Upload File
                  </IonCardTitle>
                </IonCardHeader>
                <IonCardContent>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    style={{ display: "none" }}
                  />
                  <IonButton expand="block" color="warning" onClick={() => fileInputRef.current?.click()} disabled={uploadLoading}>
                    {uploadLoading ? <IonSpinner name="crescent" /> : "Select File"}
                  </IonButton>
                  {uploadedCid && (
                    <div className="ion-margin-top ion-padding" style={{ backgroundColor: 'var(--ion-color-light)', borderRadius: '8px' }}>
                      <p style={{ margin: '0 0 5px 0', color: 'var(--ion-color-dark)' }}><strong>File Name:</strong> {uploadedFileDetails?.name}</p>
                      <p style={{ margin: '0 0 5px 0', color: 'var(--ion-color-dark)' }}><strong>Size:</strong> {(uploadedFileDetails?.size! / 1024).toFixed(2)} KB</p>
                      <p style={{ wordBreak: 'break-all', margin: '5px 0', color: 'var(--ion-color-dark)' }}><strong>CID:</strong><br/>{uploadedCid}</p>
                      {renderCidActions(uploadedCid)}
                    </div>
                  )}
                </IonCardContent>
              </IonCard>
            </IonCol>

            <IonCol size="12" sizeMd="6">
              <IonCard>
                <IonCardHeader>
                  <IonCardTitle className="ion-align-items-center" style={{ display: 'flex', gap: '8px' }}>
                    <IonIcon icon={cloudDownloadOutline} color="success" /> Download File
                  </IonCardTitle>
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
                  <IonButton expand="block" color="success" className="ion-margin-top" onClick={handleDownloadFile} disabled={downloadLoading}>
                    {downloadLoading ? <IonSpinner name="crescent" /> : "Download File"}
                  </IonButton>
                </IonCardContent>
              </IonCard>
            </IonCol>
          </IonRow>

          <IonRow>
            <IonCol size="12">
              <h2 style={{ paddingLeft: '5px', fontWeight: 'bold', marginTop: '20px' }}>P2P Messaging</h2>
            </IonCol>
            <IonCol size="12" sizeMd="6">
              <IonCard>
                <IonCardHeader>
                  <IonCardTitle className="ion-align-items-center" style={{ display: 'flex', gap: '8px' }}>
                    <IonIcon icon={sendOutline} color="primary" /> Send Message
                  </IonCardTitle>
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
                  <IonButton expand="block" className="ion-margin-top" onClick={handleSendMessage} disabled={sendLoading}>
                    {sendLoading ? <IonSpinner name="crescent" /> : "Send Message"}
                  </IonButton>
                  {messageCid && (
                    <div className="ion-margin-top ion-padding" style={{ backgroundColor: 'var(--ion-color-light)', borderRadius: '8px' }}>
                      <IonText color="dark"><strong>Message CID:</strong></IonText>
                      <p style={{ wordBreak: 'break-all', margin: '5px 0' }}>{messageCid}</p>
                      {renderCidActions(messageCid)}
                    </div>
                  )}
                </IonCardContent>
              </IonCard>
            </IonCol>

            <IonCol size="12" sizeMd="6">
              <IonCard>
                <IonCardHeader>
                  <IonCardTitle className="ion-align-items-center" style={{ display: 'flex', gap: '8px' }}>
                    <IonIcon icon={mailUnreadOutline} color="secondary" /> Receive Message
                  </IonCardTitle>
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
                  <IonButton expand="block" color="secondary" className="ion-margin-top" onClick={handleReceiveMessage} disabled={receiveLoading}>
                    {receiveLoading ? <IonSpinner name="crescent" /> : "Receive Message"}
                  </IonButton>
                  {receivedMessage && (
                    <div className="ion-margin-top ion-padding" style={{ backgroundColor: 'var(--ion-color-light)', borderRadius: '8px' }}>
                      <pre style={{ margin: 0, whiteSpace: "pre-wrap", wordWrap: "break-word", color: 'var(--ion-color-dark)' }}>
                        {JSON.stringify(receivedMessage, null, 2)}
                      </pre>
                    </div>
                  )}
                </IonCardContent>
              </IonCard>
            </IonCol>
          </IonRow>

        </IonGrid>
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