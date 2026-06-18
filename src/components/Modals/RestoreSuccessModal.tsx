import React from 'react';
import { IonModal, IonContent, IonButton, IonIcon, IonText } from '@ionic/react';
import { cloudDoneOutline, checkmarkCircle } from 'ionicons/icons';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  filename: string;
}

export const RestoreSuccessModal: React.FC<Props> = ({ isOpen, onClose, filename }) => {
  return (
    <IonModal isOpen={isOpen} onDidDismiss={onClose} className="restore-success-modal">
      <IonContent className="ion-padding ion-text-center">
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '20px' }}>
          <div style={{ position: 'relative', marginBottom: '20px' }}>
            <IonIcon icon={cloudDoneOutline} color="secondary" style={{ fontSize: '100px' }} />
            <IonIcon icon={checkmarkCircle} color="success" style={{ fontSize: '30px', position: 'absolute', bottom: 0, right: 0, backgroundColor: 'white', borderRadius: '50%' }} />
          </div>
          
          <IonText color="dark">
            <h2 style={{ fontWeight: 'bold' }}>Recovery Successful!</h2>
          </IonText>
          
          <div style={{ margin: '20px 0', padding: '15px', backgroundColor: 'var(--ion-color-light)', borderRadius: '10px' }}>
            <p style={{ margin: 0, color: 'var(--ion-color-dark)', fontSize: '1.1em', fontWeight: '500' }}>
              "Invoice recovered successfully from decentralized storage."
            </p>
          </div>

          <p style={{ color: 'var(--ion-color-medium)' }}>
            The file <strong>{filename}</strong> has been fully restored from the IPFS network and is ready for editing.
          </p>

          <IonButton expand="block" onClick={onClose} style={{ width: '100%', marginTop: '20px' }}>
            Continue
          </IonButton>
        </div>
      </IonContent>
    </IonModal>
  );
};
