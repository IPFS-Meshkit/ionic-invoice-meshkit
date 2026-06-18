import React from 'react';
import { IonModal, IonContent, IonButton, IonIcon, IonText } from '@ionic/react';
import { checkmarkCircle, copyOutline, openOutline } from 'ionicons/icons';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  cid: string;
}

export const BackupSuccessModal: React.FC<Props> = ({ isOpen, onClose, cid }) => {
  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(cid);
    } catch (err) {}
  };

  const openGateway = () => {
    window.open(`https://gateway.pinata.cloud/ipfs/${cid}`, "_blank");
  };

  return (
    <IonModal isOpen={isOpen} onDidDismiss={onClose} className="backup-success-modal">
      <IonContent className="ion-padding ion-text-center">
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '20px' }}>
          <IonIcon icon={checkmarkCircle} color="success" style={{ fontSize: '80px', marginBottom: '20px' }} />
          <IonText color="success">
            <h2>Backup Successful!</h2>
          </IonText>
          <p style={{ margin: '20px 0', color: 'var(--ion-color-medium)', wordBreak: 'break-all' }}>
            Your invoice has been securely backed up to IPFS.
            <br/><br/>
            <strong>CID:</strong><br/>
            {cid}
          </p>
          <IonButton expand="block" fill="outline" onClick={copyToClipboard} style={{ width: '100%', marginBottom: '10px' }}>
            <IonIcon icon={copyOutline} slot="start" />
            Copy CID
          </IonButton>
          <IonButton expand="block" fill="outline" onClick={openGateway} style={{ width: '100%', marginBottom: '20px' }}>
            <IonIcon icon={openOutline} slot="start" />
            Open Gateway
          </IonButton>
          <IonButton expand="block" onClick={onClose} style={{ width: '100%' }}>
            Done
          </IonButton>
        </div>
      </IonContent>
    </IonModal>
  );
};
