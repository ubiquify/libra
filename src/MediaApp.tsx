import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import MediaList, { ACTIONS } from "./MediaList";
import { MediaFactory, mediaFactoryBuilder } from "./MediaFactory";
import { MediaConfig, mediaConfigFactory } from "./MediaConfig";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import DeleteOutlinedIcon from "@mui/icons-material/DeleteOutlined";
import Tooltip from "@mui/material/Tooltip";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import CircularProgress from "@mui/material/CircularProgress";
import Stack from "@mui/material/Stack";
import { QRCodeSVG } from "qrcode.react";
import QrCodeIcon from "@mui/icons-material/QrCode";
import ContentCopyOutlinedIcon from "@mui/icons-material/ContentCopyOutlined";
import SdStorageOutlinedIcon from "@mui/icons-material/SdStorageOutlined";
import Divider from "@mui/material/Divider";
import MediaSettings from "./MediaSettings";

import logo from "./img/logo.jpg";
import { validateNetworkStoreExists } from "./MediaUtil";
import Alert from "@mui/material/Alert";

const MediaApp = () => {
  const pathname = window.location.pathname;
  const [loading, setLoading] = useState(true);
  const [performSetup, setPerformSetup] = useState(false);
  const [mediaFactory, setMediaFactory] = useState<MediaFactory>(undefined);
  const [mediaConfig, setMediaConfig] = useState<MediaConfig>(undefined);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [deleteSystem, setDeleteSystem] = useState(false);
  const [currentMediaIdentifier, setCurrentMediaIdentifier] = useState("");
  const [actionPath, setActionPath] = useState<string>("");
  const [qrOpen, setQrOpen] = useState(false);
  const [blockStoreExists, setBlockStoreExists] = useState(true);
  const [alertMessage, setAlertMessage] = useState<string | undefined>();
  const [alertType, setAlertType] = useState<
    "error" | "warning" | "info" | "success" | undefined
  >();
  const [alertHandler, setAlertHandler] = useState<() => () => void>(undefined);
  const [alertOpen, setAlertOpen] = useState(false);

  const displayAlert = (
    message: string,
    type: "error" | "warning" | "info" | "success",
    handler: () => () => void = undefined
  ) => {
    setAlertMessage(message);
    setAlertType(type);
    setAlertOpen(true);
    setAlertHandler(handler);
  };

  const handleCloseAlert = () => {
    setAlertOpen(false);
    setAlertMessage(undefined);
    setAlertType(undefined);
    setAlertHandler(undefined);
  };

  const handleClickAlert = () => {
    if (alertHandler) {
      alertHandler();
    }
  };

  const openSettings = () => setSettingsOpen(true);

  const closeSettings = () => setSettingsOpen(false);

  const closeSetup = () => {
    setPerformSetup(false);
    window.location.reload();
  };

  useEffect(() => {
    const fetchData = async (): Promise<{
      config: MediaConfig;
      factory: MediaFactory;
    }> => {
      const mediaConfig = await mediaConfigFactory();
      let factory: MediaFactory = undefined;
      setMediaConfig(mediaConfig);
      if (await mediaConfig.isConfigured()) {
        await mediaConfig.load();
        factory = await mediaFactoryBuilder(mediaConfig);
        setMediaFactory(factory);
        const blockStoreChoice = mediaConfig.getBlockStoreChoice();
        if (blockStoreChoice === "network") {
          const exists = await validateNetworkStoreExists(
            mediaConfig.getNetworkBlockStore()
          );
          if (!exists) {
            displayAlert(
              "Network Block Store is not available. Click here to check the settings.",
              "error",
              () => openSettings
            );
          }
          setBlockStoreExists(exists);
        }
        setLoading(false);
      } else {
        setPerformSetup(true);
        setLoading(false);
      }
      return { config: mediaConfig, factory };
    };
    fetchData().then(
      (value: { config: MediaConfig; factory: MediaFactory }) => {}
    );
  }, []);

  const deleteSettings = async () => {
    await mediaFactory.clearRoot();
    await mediaConfig.clearConfig();
    await mediaFactory.clearBlocks();
    window.location.reload();
  };

  if (loading) {
    return <CircularProgress />;
  }

  if (performSetup) {
    return (
      <MediaSettings
        open={performSetup}
        onClose={closeSetup}
        mediaConfig={mediaConfig}
      ></MediaSettings>
    );
  }

  const copyMediaIdentifier = () => {
    navigator.clipboard.writeText(currentMediaIdentifier);
  };

  const handleCloseQrDialog = () => {
    console.log(
      `${window.location.protocol}//${window.location.host}${ACTIONS.IMPORT.prefix}${currentMediaIdentifier}`
    );
    setQrOpen(false);
  };

  const handleOpenQrDialog = () => {
    setQrOpen(true);
  };

  const pointerCursorStyle = {
    cursor: "pointer",
  };

  const blockStoreText = () => {
    if (mediaConfig.getBlockStoreChoice() === "network") {
      return mediaConfig.getNetworkBlockStore();
    } else {
      return "IndexedDB";
    }
  };

  const pickBlockStoreColor = (): "default" | "info" | "warning" | "error" => {
    const storeChoice = mediaConfig.getBlockStoreChoice();
    const index =
      storeChoice === "browser"
        ? 0
        : storeChoice === "network" && blockStoreExists
        ? 1
        : 2;
    switch (index) {
      case 0:
        return "default";
      case 1:
        return "info";
      case 2:
        return "error";
    }
  };
  return (
    <div>
      <Stack
        spacing={0}
        direction="row"
        alignItems="flex-start"
        justifyContent="space-between"
      >
        <Stack
          spacing={0}
          direction="row"
          justifyContent="flex-start"
          alignItems="flex-start"
        >
          <Tooltip title="Configure System">
            <IconButton
              aria-label="settings"
              size="large"
              onClick={openSettings}
            >
              <SettingsOutlinedIcon fontSize="inherit" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Reset Application">
            <IconButton
              aria-label="settings"
              size="large"
              onClick={() => setDeleteSystem(true)}
            >
              <DeleteOutlinedIcon fontSize="inherit" />
            </IconButton>
          </Tooltip>
          <Divider orientation="vertical" flexItem />
          <Tooltip title="Show Identifier QR Code">
            <IconButton
              aria-label="show-identifier-qr-code"
              size="large"
              onClick={handleOpenQrDialog}
            >
              <QrCodeIcon fontSize="inherit" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Copy Media Identifier">
            <IconButton
              aria-label="copy-media-identifier"
              onClick={copyMediaIdentifier}
              size="large"
            >
              <ContentCopyOutlinedIcon fontSize="inherit" />
            </IconButton>
          </Tooltip>
        </Stack>
        <Stack
          spacing={0}
          direction="row"
          justifyContent="flex-end"
          alignItems="flex-end"
        >
          <IconButton
            aria-label="block-store"
            size="large"
            style={pointerCursorStyle}
            color={pickBlockStoreColor()}
          >
            <SdStorageOutlinedIcon fontSize="inherit" />
          </IconButton>
          <Tooltip title="Block Store">
            <Button size="large" sx={{ textTransform: "none" }}>
              {blockStoreText()}
            </Button>
          </Tooltip>
          <Tooltip title="Media Path">
            <Button size="large" sx={{ textTransform: "none" }}>
              {actionPath}
            </Button>
          </Tooltip>
        </Stack>
      </Stack>
      <Dialog open={deleteSystem} fullWidth={true}>
        <DialogTitle>Reset Application</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to reset the application and delete your data?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteSystem(false)}>Cancel</Button>
          <Button onClick={deleteSettings} color="warning">
            Reset
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog open={qrOpen} fullWidth={true} onClick={handleCloseQrDialog}>
        <DialogContent
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <QRCodeSVG
            value={`${window.location.protocol}//${window.location.host}${ACTIONS.IMPORT.prefix}${currentMediaIdentifier}`}
            size={256}
            level={"H"}
            imageSettings={{
              src: logo,
              height: 48,
              width: 48,
              excavate: true,
            }}
          />
        </DialogContent>
      </Dialog>
      <MediaSettings
        open={settingsOpen}
        onClose={closeSetup}
        mediaConfig={mediaConfig}
      ></MediaSettings>
      {blockStoreExists && mediaFactory && (
        <MediaList
          alias={pathname}
          mediaFactory={mediaFactory}
          mediaConfig={mediaConfig}
          onMediaIdentifierChange={setCurrentMediaIdentifier}
          onActionPathChange={setActionPath}
        />
      )}
      {alertOpen && (
        <Alert
          onClose={handleCloseAlert}
          onClick={handleClickAlert}
          severity={alertType}
          style={{ cursor: "pointer" }}
        >
          {alertMessage}
        </Alert>
      )}
    </div>
  );
};

createRoot(document.getElementById("root") as HTMLElement).render(<MediaApp />);
