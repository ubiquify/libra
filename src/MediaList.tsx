import React, { useState, useEffect, ChangeEvent } from "react";
import MediaItem from "./MediaItem";
import {
  MediaCollection,
  MediaNode,
  NamedMediaCollection,
} from "@ubiquify/media";
import { MediaFactory } from "./MediaFactory";
import { v4 as uuid } from "uuid";

import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import Stack from "@mui/material/Stack";
import AddPhotoAlternateOutlinedIcon from "@mui/icons-material/AddPhotoAlternateOutlined";
import SaveOutlinedIcon from "@mui/icons-material/SaveOutlined";
import HistoryToggleOffOutlinedIcon from "@mui/icons-material/HistoryToggleOffOutlined";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import FileUploadOutlinedIcon from "@mui/icons-material/FileUploadOutlined";
import CloudDownloadOutlinedIcon from "@mui/icons-material/CloudDownloadOutlined";
import Divider from "@mui/material/Divider";
import BackupOutlinedIcon from "@mui/icons-material/BackupOutlined";
import Box from "@mui/material/Box";
import LinearProgressWithLabel from "@mui/material/LinearProgress";
import TextField from "@mui/material/TextField";
import Link from "@mui/material/Link";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import Radio from "@mui/material/Radio";
import RadioGroup from "@mui/material/RadioGroup";
import FormControlLabel from "@mui/material/FormControlLabel";
import FormControl from "@mui/material/FormControl";
import Typography from "@mui/material/Typography";
import Alert from "@mui/material/Alert";
import CircularProgress from "@mui/material/CircularProgress";
import { styled } from "@mui/system";

import {
  CommitInfo,
  commitUtilFactory,
  displayCollection as redirectCollection,
  uint8ArrayToURL,
} from "./MediaUtil";
import { MediaConfig, Relay } from "./MediaConfig";
import { LinkCodec, linkCodecFactory } from "@ubiquify/core";

import "./MediaApp.css";
import { ButtonGroup } from "@mui/material";

import MediaHistory from "./MediaHistory";
import { set } from "idb-keyval";

const ButtonContainer = styled("div")({
  position: "relative",
  display: "inline-block",
});
const BlueDot = styled("div")(({ theme }) => ({
  position: "absolute",
  top: "7px",
  right: "7px",
  width: "7px",
  height: "7px",
  borderRadius: "50%",
  backgroundColor: "#0288d1",
}));

const linkCodec: LinkCodec = linkCodecFactory();

export interface Action {
  name: string;
  prefix: string;
  exec: () => Promise<void>;
}

export const ACTIONS = {
  IMPORT: { name: "/import", prefix: "/__actions__/__show_import__/" },
  DISPLAY: { name: "/display", prefix: "/" },
};

interface MediaListProps {
  alias: string;
  mediaFactory: MediaFactory;
  mediaConfig: MediaConfig;
  onMediaIdentifierChange: (mediaIdentifier: string) => void;
  onActionPathChange: (actionPath: string) => void;
}

const MediaList: React.FC<MediaListProps> = ({
  alias,
  mediaFactory,
  mediaConfig,
  onMediaIdentifierChange,
  onActionPathChange,
}) => {
  const [exportURL, setExportURL] = useState("");
  const [exportOpen, setExportOpen] = useState(false);
  const [bundleAlias, setBundleAlias] = useState<string>("");
  const [bundledCollection, setBundledCollection] =
    useState<MediaCollection>(undefined);
  const [bundledCollectionSize, setBundledCollectionSize] =
    useState<number>(undefined);
  const [importOpen, setImportOpen] = useState(false);
  const [completed, setCompleted] = useState(0);
  const [loadedMediaNodes, setLoadedMediaNodes] = useState<MediaNode[]>([]);
  const [removedMediaNodes, setRemovedMediaNodes] = useState<MediaNode[]>([]);
  const [addedMediaNodes, setAddedMediaNodes] = useState<MediaNode[]>([]);
  const [relayImportOpen, setRelayImportOpen] = useState(false);
  const [relayCollectionId, setRelayCollectionId] = useState("");
  const [currentRelay, setCurrentRelay] = useState<string | undefined>(
    undefined
  );
  const [currentMediaIdentifier, setCurrentMediaIdentifier] = useState("");
  const [currentMediaVersion, setCurrentMediaVersion] =
    useState<string>(undefined);
  const [namedRelays, setNamedRelays] = useState<Relay[]>([]);
  const [namedRelaysUpdated, setNamedRelaysUpdated] = useState<Set<string>>(
    new Set()
  );
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [commitDialogOpen, setCommitDialogOpen] = useState(false);
  const [commitComment, setCommitComment] = useState("");
  const [commitTags, setCommitTag] = useState("");
  const [alertMessage, setAlertMessage] = useState<string | undefined>();
  const [alertType, setAlertType] = useState<
    "error" | "warning" | "info" | "success" | undefined
  >();
  const [alertOpen, setAlertOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const displayAlert = (
    message: string,
    type: "error" | "warning" | "info" | "success"
  ) => {
    setAlertMessage(message);
    setAlertType(type);
    setAlertOpen(true);
  };

  const handleCloseAlert = () => {
    setAlertOpen(false);
    setAlertMessage(undefined);
    setAlertType(undefined);
  };

  const importAction = {
    name: ACTIONS.IMPORT.name,
    prefix: ACTIONS.IMPORT.prefix,
    exec: async () => {
      const tokens = alias.split("/");
      const collectionIdentifier = tokens[tokens.length - 1];
      setImportOpen(true);
      setRelayImportOpen(true);
      setRelayCollectionId(collectionIdentifier);
    },
  };

  const displayAction = {
    name: ACTIONS.DISPLAY.name,
    prefix: ACTIONS.DISPLAY.prefix,
    exec: async () => {
      await mediaFactory.loadMediaCollectionIncremental(
        alias,
        setCompleted,
        setLoadedMediaNodes
      );
      const currentMedia = await mediaFactory.currentMediaCollectionByAlias(
        alias
      );
      const currentMediaId = currentMedia.versionStoreId();
      setCurrentMediaIdentifier(currentMediaId);
      onMediaIdentifierChange(currentMediaId);
      const currentMediaCurrentRoot = currentMedia.currentRoot();
      if (currentMediaCurrentRoot !== undefined) {
        setCurrentMediaVersion(linkCodec.encodeString(currentMediaCurrentRoot));
      }
    },
  };

  const actions: Action[] = [importAction, displayAction];

  const checkActions = async (path: string): Promise<string> => {
    for (const action of actions) {
      if (path.startsWith(action.prefix)) {
        await action.exec();
        return action.name;
      }
    }
    throw new Error(`Action not found for path ${path}`);
  };

  const resetState = () => {
    setLoadedMediaNodes([]);
    setRemovedMediaNodes([]);
    setAddedMediaNodes([]);
  };

  const fetchData = async () => {
    resetState();
    const relays: Relay[] = mediaConfig.listNamedRelays();
    setNamedRelays(relays);
    await checkActions(alias);
    onActionPathChange(alias);
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    const id = setInterval(async () => {
      const newState = new Set<string>();
      await Promise.all(
        namedRelays.map(async (relay) => {
          const hasUpdates = await mediaFactory.checkUpdatesByAlias({
            relayUrl: relay.url,
            alias: alias,
          });
          if (hasUpdates) {
            newState.add(relay.name);
          } else {
            newState.delete(relay.name);
          }
        })
      );
      setNamedRelaysUpdated(newState);
    }, 10000);

    return () => clearInterval(id);
  }, [namedRelays]);

  const generateItemId = (): string => {
    return uuid();
  };

  const handleAddItem = () => {
    const newItemId = generateItemId();
    setAddedMediaNodes((prevMediaNodes) => [
      ...prevMediaNodes,
      {
        id: newItemId,
        createdAt: Date.now(),
        comment: "",
        media: { name: "", mimeType: "", data: new Uint8Array() },
      },
    ]);
  };

  const handleRemoveItem = (itemId: string) => {
    setAddedMediaNodes((prevMediaNodes) =>
      prevMediaNodes.filter((mediaNode) => mediaNode.id !== itemId)
    );
    setRemovedMediaNodes((prevRemovedMediaNodes) => [
      ...prevRemovedMediaNodes,
      loadedMediaNodes.find((mediaNode) => mediaNode.id === itemId),
    ]);
  };

  const handleUpdateMedia = (
    itemId: string,
    media: { name: string; mimeType: string; data: Uint8Array }
  ) => {
    setAddedMediaNodes((prevMediaNodes) =>
      prevMediaNodes.map((mediaNode) =>
        mediaNode.id === itemId ? { ...mediaNode, media } : mediaNode
      )
    );
  };

  const handleUpdateComment = (itemId: string, comment: string) => {
    setAddedMediaNodes((prevMediaNodes) =>
      prevMediaNodes.map((mediaNode) =>
        mediaNode.id === itemId ? { ...mediaNode, comment } : mediaNode
      )
    );
  };

  const handleCommitMediaNodes = async () => {
    setLoading(true);
    setCompleted(0);
    try {
      await mediaFactory.addMediaCollection(alias, addedMediaNodes);
      const commitUtil = await commitUtilFactory(mediaConfig);
      const tags = commitTags === undefined ? [] : commitTags.split(/[, ]+/);
      const commitInfo: CommitInfo = commitUtil.createCommitInfo({
        comment: commitComment,
        tags: tags,
      });
      const {
        versionStoreId: collectionVersionStoreId,
        versionStoreRoot: collectionVersionStoreRoot,
        currentRoot: collectionCurrentRoot,
      } = await mediaFactory.commitMediaCollection(alias, commitInfo);

      const {
        versionStoreId: systemVersionStoreId,
        versionStoreRoot: systemVersionStoreRoot,
        currentRoot: systemCurrentRoot,
      } = await mediaFactory.commitMediaSystem(commitInfo);
      setAddedMediaNodes([]);
      setRemovedMediaNodes([]);
      setLoadedMediaNodes([]);
      setCompleted(10);
      await fetchData();
      displayAlert(
        `Committed successfully ${linkCodec.encodeString(
          collectionCurrentRoot()
        )}`,
        "success"
      );
    } finally {
      setCompleted(100);
      setLoading(false);
    }
  };

  const handleExportMedia = async () => {
    const bundle = await mediaFactory.exportMediaCollection(alias);
    const url = uint8ArrayToURL(bundle.bytes, "application/vnd.ipld.car");
    setExportURL(url);
    setExportOpen(true);
  };

  const handleCloseExport = () => {
    setExportOpen(false);
  };

  const handleImportMedia = async () => {
    setImportOpen(true);
  };

  const isValidAlias = (alias: string) => {
    const pathPattern = /^\/[a-zA-Z0-9]+(\/[a-zA-Z0-9]+)*\/?$/;
    return pathPattern.test(alias);
  };

  const importBundledMedia = async (
    alias: string,
    mediaCollection: MediaCollection
  ) => {
    const newMediaCollection: NamedMediaCollection =
      await mediaFactory.importMediaCollection(alias, mediaCollection);
    await mediaFactory.commitMediaSystem({ comment: `Imported from bundle` });
  };

  const performImportMediaBundle = async () => {
    const namedMediaCollection = await importBundledMedia(
      bundleAlias,
      bundledCollection
    );
    setImportOpen(false);
    redirectCollection(bundleAlias);
  };

  const handleBundleUpload = (e: ChangeEvent<HTMLInputElement>) => {
    setLoading(true);
    try {
      if (!e.target.files) {
        return;
      }
      const files = e.target.files;
      const droppedFile = files[0];
      const reader = new FileReader();
      reader.onload = async (event) => {
        const fileData = event.target?.result;
        if (fileData instanceof ArrayBuffer) {
          const buf = new Uint8Array(fileData);
          const newCollection =
            await mediaFactory.readMediaCollectionFromBundle(buf);
          const newCollectionSize = await newCollection.persistedSize();
          setBundledCollectionSize(newCollectionSize);
          setBundledCollection(newCollection);
        }
      };
      reader.readAsArrayBuffer(droppedFile);
    } finally {
      setLoading(false);
    }
  };

  const handleCloseImport = () => {
    setImportOpen(false);
  };

  const handlePushNamedRelay = async (relayName: string) => {
    setLoading(true);
    setCompleted(0);
    try {
      const relay = mediaConfig.getNamedRelay(relayName);
      await mediaFactory.pushMediaCollectionByAlias({
        relayUrl: relay.url,
        alias: alias,
      });
      displayAlert(`Published to ${relayName} successfully`, "success");
    } catch (e) {
      displayAlert(`Error publishing to ${relayName}: ${e}`, "error");
    } finally {
      setCompleted(100);
      setLoading(false);
    }
  };

  const handlePullNamedRelay = async (relayName: string) => {
    setLoading(true);
    setCompleted(0);
    const relay = mediaConfig.getNamedRelay(relayName);
    try {
      const sharedCollection = await mediaFactory.pullMediaCollectionByAlias({
        relayUrl: relay.url,
        alias: alias,
      });
      if (
        currentMediaVersion !== undefined &&
        sharedCollection.versionStoreRoot().toString() !== currentMediaVersion
      ) {
        await mediaFactory.importMediaCollection(alias, sharedCollection);
        await mediaFactory.commitMediaSystem({
          comment: `Pulled from relay ${relayName}: ${relay.url}`,
        });
        await fetchData();
        const newRelaysUpdated = new Set<string>(namedRelaysUpdated);
        newRelaysUpdated.delete(relayName);
        setNamedRelaysUpdated(newRelaysUpdated);
        displayAlert(`Pulled from ${relayName} successfully`, "success");
      }
    } catch (e) {
      displayAlert(`Error pulling from ${relayName}: ${e}`, "error");
    } finally {
      setCompleted(100);
      setLoading(false);
    }
  };

  const handleOpenRelayImport = () => {
    setRelayImportOpen(true);
  };

  const isValidContentIdentifier = (contentIdentifier: string) => {
    try {
      linkCodec.parseString(contentIdentifier);
      return true;
    } catch (e) {
      return false;
    }
  };

  const handleCloseRelayImport = () => {
    setRelayImportOpen(false);
  };

  const performImportFromRelay = async (
    relayName: string,
    collectionIdentifier: string
  ) => {
    setLoading(true);
    try {
      const relay = mediaConfig.getNamedRelay(relayName);
      const newCollection = await mediaFactory.pullMediaCollectionByIdentifier({
        relayUrl: relay.url,
        versionStoreId: collectionIdentifier,
      });
      if (newCollection === undefined) {
        displayAlert(
          `Collection ${collectionIdentifier} not found on ${relayName}`,
          "error"
        );
      } else {
        const newCollectionSize = await newCollection.persistedSize();
        setBundledCollectionSize(newCollectionSize);
        setBundledCollection(newCollection);
        handleCloseRelayImport();
      }
    } catch (e) {
      displayAlert(
        `Error importing ${collectionIdentifier} from ${relayName}: ${e}`,
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRelayChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setCurrentRelay((event.target as HTMLInputElement).value);
  };

  const areRemoteUpdatesAvailable = (relay: Relay) => {
    return namedRelaysUpdated.has(relay.name);
  };
  const pickRelayColor = (
    relay: Relay,
    index: number
  ): "default" | "info" | "warning" | "error" => {
    let color: string;
    switch (index % 4) {
      case 0:
        return "default";
      case 1:
        return "info";
      case 2:
        return "warning";
      case 3:
        return "error";
    }
  };
  return (
    <div>
      <Box sx={{ maxWidth: "100%" }}>
        <LinearProgressWithLabel variant="determinate" value={completed} />
      </Box>
      <Stack
        spacing={0}
        direction="row"
        alignItems="flex-start"
        justifyContent="space-between"
      >
        <Stack spacing={0} direction="row">
          <Tooltip title="Add Media">
            <IconButton aria-label="add" onClick={handleAddItem} size="large">
              <AddPhotoAlternateOutlinedIcon fontSize="inherit" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Save Local">
            <span>
              <IconButton
                aria-label="save"
                onClick={() => setCommitDialogOpen(true)}
                size="large"
                disabled={addedMediaNodes.length === 0}
              >
                <SaveOutlinedIcon fontSize="inherit" />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title="Show History">
            <span>
              <IconButton
                aria-label="history"
                onClick={() => setHistoryDialogOpen(true)}
                size="large"
                disabled={currentMediaVersion === undefined}
              >
                <HistoryToggleOffOutlinedIcon fontSize="inherit" />
              </IconButton>
            </span>
          </Tooltip>
          {namedRelays.map((relay, index) => (
            <ButtonGroup
              key={`relay-enabled-button-group-${btoa(relay.name)}-${btoa(
                relay.url
              )}`}
            >
              <Divider orientation="vertical" flexItem />
              <Tooltip
                title={`Publish to ${relay.name}`}
                key={`relay-publish-tooltip-${btoa(relay.name)}-${btoa(
                  relay.url
                )}`}
              >
                <IconButton
                  aria-label={`push-${relay.name}-relay`}
                  size="large"
                  onClick={() => handlePushNamedRelay(relay.name)}
                  color={pickRelayColor(relay, index)}
                >
                  {/* <IosShareIcon fontSize="inherit" /> */}
                  <BackupOutlinedIcon fontSize="inherit" />
                </IconButton>
              </Tooltip>
              <Tooltip
                title={`Pull from ${relay.name}`}
                key={`relay-pull-tooltip-${btoa(relay.name)}-${btoa(
                  relay.url
                )}`}
              >
                <ButtonContainer>
                  <IconButton
                    aria-label={`pull-${relay.name}-relay`}
                    size="large"
                    onClick={() => handlePullNamedRelay(relay.name)}
                    color={pickRelayColor(relay, index)}
                  >
                    {/*  style={{ transform: "rotate(180deg)" }} <IosShareIcon fontSize="inherit" /> */}
                    <CloudDownloadOutlinedIcon fontSize="inherit" />
                  </IconButton>
                  {areRemoteUpdatesAvailable(relay) && <BlueDot />}
                </ButtonContainer>
              </Tooltip>
              <Divider orientation="vertical" flexItem />
            </ButtonGroup>
          ))}
          <Tooltip title="Export to File">
            <span>
              <IconButton
                aria-label="export"
                onClick={handleExportMedia}
                size="large"
                disabled={currentMediaVersion === undefined}
              >
                <FileUploadOutlinedIcon fontSize="inherit" />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title="Import">
            <IconButton
              aria-label="import"
              onClick={handleImportMedia}
              size="large"
            >
              <FileDownloadOutlinedIcon fontSize="inherit" />
            </IconButton>
          </Tooltip>
        </Stack>
      </Stack>
      {currentMediaVersion !== undefined && (
        <MediaHistory
          open={historyDialogOpen}
          onClose={() => setHistoryDialogOpen(false)}
          alias={alias}
          mediaFactory={mediaFactory}
        />
      )}
      {alertOpen && (
        <Alert onClose={handleCloseAlert} severity={alertType}>
          {alertMessage}
        </Alert>
      )}
      <Dialog open={commitDialogOpen} fullWidth={true}>
        <DialogTitle>Commit</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="normal"
            id="commitComment"
            label="Comment"
            type="text"
            fullWidth
            value={commitComment}
            onChange={(e) => setCommitComment(e.target.value)}
          />
          <TextField
            autoFocus
            margin="normal"
            id="commitTag"
            label="Tag"
            type="text"
            fullWidth
            value={commitTags}
            onChange={(e) => setCommitTag(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCommitDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={() => {
              setCommitDialogOpen(false);
              handleCommitMediaNodes();
            }}
            disabled={commitComment === ""}
          >
            Commit
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog open={exportOpen} fullWidth={true}>
        <DialogTitle>Export Media Collection</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Use following{" "}
            <Link
              href={exportURL}
              download={`mediaBundle-${currentMediaIdentifier.substring(
                0,
                13
              )}.car`}
            >
              link
            </Link>{" "}
            to download the bundle.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseExport}>Close</Button>
        </DialogActions>
      </Dialog>
      <Dialog open={importOpen} fullWidth={true}>
        <DialogTitle>Import Media </DialogTitle>
        <DialogContent>
          <Stack spacing={0} direction="column">
            <Stack
              direction="row"
              justifyContent="flex-start"
              alignItems="center"
              spacing={0}
            >
              <Button component="label">
                Bundle
                <input
                  type="file"
                  accept=".car"
                  hidden
                  onChange={handleBundleUpload}
                />
              </Button>
              <Button component="label" onClick={handleOpenRelayImport}>
                Relay
              </Button>
            </Stack>
            {bundledCollection && (
              <Typography variant="subtitle1" color="GrayText">
                Media identifier:{" "}
                {bundledCollection.versionStoreId().substring(0, 13)}...
              </Typography>
            )}
            {bundledCollection && (
              <Typography variant="subtitle1" color="GrayText">
                Size: {bundledCollectionSize}
              </Typography>
            )}
            <TextField
              margin="normal"
              id="bundleAlias"
              label="Alias"
              helperText={
                isValidAlias(bundleAlias) ? "" : "Unix path, eg. /home/media"
              }
              type="text"
              fullWidth
              variant="standard"
              value={bundleAlias}
              onChange={(e) => setBundleAlias(e.target.value)}
              placeholder="Eg. /home/media"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseImport}>Cancel</Button>
          <Button
            onClick={performImportMediaBundle}
            disabled={!isValidAlias(bundleAlias) || !bundledCollection}
          >
            Import
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog open={relayImportOpen} fullWidth={true}>
        <DialogTitle>From Relay</DialogTitle>
        <DialogContent>
          <FormControl>
            <RadioGroup
              name="current-relay-buttons-group"
              onChange={handleRelayChange}
            >
              {namedRelays.map((relay) => (
                <FormControlLabel
                  value={relay.name}
                  control={<Radio />}
                  label={relay.name}
                  key={`relay-import-form-${btoa(relay.name)}-${btoa(
                    relay.url
                  )}`}
                />
              ))}
            </RadioGroup>
          </FormControl>
          <Stack spacing={0} direction="row" alignItems="flex-center">
            <TextField
              autoFocus
              margin="normal"
              id="collectionId"
              label="Media Identifier"
              type="text"
              fullWidth
              variant="standard"
              value={relayCollectionId}
              onChange={(e) => setRelayCollectionId(e.target.value)}
              placeholder="Eg. bafkreiarm7jhahocnfrxqwzhjr7x3h5me6nkbw5sjyesm4iskd2vsimg5a"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseRelayImport}>Cancel</Button>
          <Button
            onClick={() =>
              performImportFromRelay(currentRelay, relayCollectionId)
            }
            disabled={
              !currentRelay || !isValidContentIdentifier(relayCollectionId)
            }
          >
            Import
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={loading}
        PaperProps={{
          style: {
            backgroundColor: "transparent",
            boxShadow: "none",
          },
        }}
      >
        <CircularProgress />
      </Dialog>
      {addedMediaNodes.map((mediaNode) => (
        <MediaItem
          key={mediaNode.id}
          mediaNode={mediaNode}
          readOnly={false}
          elevation={5}
          onRemove={handleRemoveItem}
          onUpdateMedia={handleUpdateMedia}
          onUpdateComment={handleUpdateComment}
        />
      ))}
      {loadedMediaNodes.map((mediaNode) => (
        <MediaItem
          key={mediaNode.id}
          mediaNode={mediaNode}
          readOnly={true}
          elevation={3}
          onRemove={handleRemoveItem}
          onUpdateMedia={handleUpdateMedia}
          onUpdateComment={handleUpdateComment}
        />
      ))}
    </div>
  );
};

export default MediaList;
