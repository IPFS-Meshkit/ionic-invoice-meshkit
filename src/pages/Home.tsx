import {
  IonButton,
  IonContent,
  IonFab,
  IonFabButton,
  IonHeader,
  IonIcon,
  IonPage,
  IonPopover,
  IonTitle,
  IonToolbar,
  IonButtons,
  IonAlert,
  IonToast
} from "@ionic/react";
import { APP_NAME, DATA } from "../app-data";
import * as AppGeneral from "../components/socialcalc/index.js";
import { useEffect, useState } from "react";
import { Local, File as LocalFile } from "../components/Storage/LocalStorage";
import { menu, settings, hardwareChipOutline, cloudDownloadOutline, arrowBack } from "ionicons/icons";
import "./Home.css";
import Menu from "../components/Menu/Menu";
import NewFile from "../components/NewFile/NewFile";
import Dashboard from "../components/Dashboard/Dashboard";
import { useHistory } from "react-router";

const Home: React.FC = () => {
  const [view, setView] = useState<'dashboard' | 'editor'>('dashboard');

  const [showMenu, setShowMenu] = useState(false);
  const [showPopover, setShowPopover] = useState<{
    open: boolean;
    event: Event | undefined;
  }>({ open: false, event: undefined });
  const [selectedFile, updateSelectedFile] = useState("default");
  const [billType, updateBillType] = useState(1);
  const [device] = useState("default");
  const history = useHistory();

  const store = new Local();

  const closeMenu = () => {
    setShowMenu(false);
  };

  const activateFooter = (footer) => {
    AppGeneral.activateFooterButton(footer);
  };

  useEffect(() => {
    const data = DATA["home"][device]["msc"];
    AppGeneral.initializeApp(JSON.stringify(data));
  }, []);

  useEffect(() => {
    activateFooter(billType);
  }, [billType]);

  const footers = DATA["home"][device]["footers"];
  const footersList = footers.map((footerArray) => {
    return (
      <IonButton
        key={footerArray.index}
        expand="full"
        color="light"
        className="ion-no-margin"
        onClick={() => {
          updateBillType(footerArray.index);
          activateFooter(footerArray.index);
          setShowPopover({ open: false, event: undefined });
        }}
      >
        {footerArray.name}
      </IonButton>
    );
  });

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar color="primary">
          <IonButtons slot="start">
            {view === 'editor' && (
              <IonButton onClick={() => setView('dashboard')}>
                <IonIcon icon={arrowBack} />
              </IonButton>
            )}
          </IonButtons>
          <IonTitle>{APP_NAME}</IonTitle>
          <IonButtons slot="end">
            {view === 'editor' && (
              <>
                <IonIcon
                  icon={settings}
                  className="ion-padding-end"
                  size="large"
                  onClick={(e) => {
                    setShowPopover({ open: true, event: e.nativeEvent });
                  }}
                />
                <NewFile
                  file={selectedFile}
                  updateSelectedFile={(f: string) => { updateSelectedFile(f); setView('editor'); }}
                  store={store}
                  billType={billType}
                />
              </>
            )}
            <IonPopover
              animated
              keyboardClose
              backdropDismiss
              event={showPopover.event}
              isOpen={showPopover.open}
              onDidDismiss={() =>
                setShowPopover({ open: false, event: undefined })
              }
            >
              {footersList}
            </IonPopover>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen>
        
        {view === 'dashboard' ? (
          <Dashboard 
            store={store} 
            currentBillType={billType}
            onOpenFile={(key, bT) => {
              updateSelectedFile(key);
              updateBillType(bT);
              setView('editor');
            }} 
          />
        ) : null}

        <div style={{ display: view === 'editor' ? 'flex' : 'none', flexDirection: 'column', height: '100%' }}>
          <IonToolbar color="secondary">
            <IonTitle className="ion-text-center">
              Editing : {selectedFile}
            </IonTitle>
          </IonToolbar>

          <div id="container" style={{ flex: 1 }}>
            <div id="workbookControl"></div>
            <div id="tableeditor"></div>
            <div id="msg"></div>
          </div>
        </div>

        {view === 'editor' && (
          <IonFab vertical="bottom" horizontal="end" slot="fixed">
            <IonFabButton type="button" onClick={() => setShowMenu(true)}>
              <IonIcon icon={menu} />
            </IonFabButton>
          </IonFab>
        )}

        <Menu
          showM={showMenu}
          setM={closeMenu}
          file={selectedFile}
          updateSelectedFile={updateSelectedFile}
          store={store}
          bT={billType}
        />

      </IonContent>
    </IonPage>
  );
};

export default Home;
