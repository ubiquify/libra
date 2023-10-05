import { useEffect, useState } from "react";
import { NamedKey, Relay } from "./MediaConfig";
import Button from "@mui/material/Button";
import HubOutlinedIcon from "@mui/icons-material/HubOutlined";
import VpnKeyOutlinedIcon from "@mui/icons-material/VpnKeyOutlined";
import PermIdentityOutlinedIcon from "@mui/icons-material/PermIdentityOutlined";
import AppRegistrationIcon from "@mui/icons-material/AppRegistration";
import TextField from "@mui/material/TextField";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import axios from "axios";

import { cryptoUtil, CryptoUtil } from "./MediaUtil";
import {
  APP_NAME_KEY,
  USER_NAME_KEY,
  USER_EMAIL_KEY,
  USER_PRIVATE_KEY_KEY,
  USER_PUBLIC_KEY_KEY,
} from "./MediaConfig";
import { Divider } from "@mui/material";
import { Stack } from "@mui/system";

const MediaSettings = ({ open, onClose, mediaConfig }) => {
  const [newRelayName, setNewRelayName] = useState("");
  const [newRelayValue, setNewRelayValue] = useState("");
  const [relayExists, setRelayExists] = useState(false);
  const [privateSignatureKey, setPrivateSignatureKey] = useState("");
  const [publicSignatureKey, setPublicSignatureKey] = useState("");
  const [currentTabIndex, setCurrentTabIndex] = useState(0);
  const [namedRelays, setNamedRelays] = useState<Relay[]>([]);
  const [author, setAuthor] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [appName, setAppName] = useState<string>("Libra Media");
  const [importKeysOpen, setImportKeysOpen] = useState<boolean>(false);
  const [exportKeysOpen, setExportKeysOpen] = useState<boolean>(false);

  const fetchConfig = async () => {
    const relays = await mediaConfig.listNamedRelays();
    setNamedRelays(relays);
    const keys = await mediaConfig.listNamedKeys();
    const appNameKey = keys.find((key: NamedKey) => key.name === APP_NAME_KEY);
    const authorKey = keys.find((key: NamedKey) => key.name === USER_NAME_KEY);
    const emailKey = keys.find((key: NamedKey) => key.name === USER_EMAIL_KEY);
    const privateSignatureKey = keys.find(
      (key: NamedKey) => key.name === USER_PRIVATE_KEY_KEY
    );
    const publicSignatureKey = keys.find(
      (key: NamedKey) => key.name === USER_PUBLIC_KEY_KEY
    );
    if (privateSignatureKey !== undefined) {
      setPrivateSignatureKey(privateSignatureKey.key);
    }
    if (publicSignatureKey !== undefined) {
      setPublicSignatureKey(publicSignatureKey.key);
    }
    if (appNameKey !== undefined) {
      setAppName(appNameKey.key);
    }
    if (authorKey !== undefined) {
      setAuthor(authorKey.key);
    }
    if (emailKey !== undefined) {
      setEmail(emailKey.key);
    }
  };
  useEffect(() => {
    fetchConfig();
  }, [open]);

  useEffect(() => {
    const validate = async () => {
      if (newRelayValue === undefined) {
        setRelayExists(false);
      } else {
        const isValid = await validateRelayExists(newRelayValue);
        setRelayExists(isValid);
      }
    };

    validate();
  }, [newRelayValue]);

  const saveSettings = async () => {
    await mediaConfig.setNamedRelays(namedRelays);
    await mediaConfig.setNamedKeys([
      {
        name: USER_PRIVATE_KEY_KEY,
        key: privateSignatureKey,
      },
      {
        name: USER_PUBLIC_KEY_KEY,
        key: publicSignatureKey,
      },
      {
        name: APP_NAME_KEY,
        key: appName,
      },
      {
        name: USER_NAME_KEY,
        key: author,
      },
      {
        name: USER_EMAIL_KEY,
        key: email,
      },
    ]);
    await mediaConfig.commit();
    onClose();
  };

  const addRelay = () => {
    if (newRelayName && newRelayValue) {
      const newRelay = {
        name: newRelayName,
        url: newRelayValue,
      };
      const updatedRelays = [...namedRelays, newRelay];
      setNamedRelays(updatedRelays);
    }
  };

  const removeRelay = (index) => {
    const updatedRelays = [...namedRelays];
    updatedRelays.splice(index, 1);
    setNamedRelays(updatedRelays);
  };

  const validateRelayExists = async (relayUrl: string): Promise<boolean> => {
    try {
      if (!relayUrl.endsWith("/")) {
        relayUrl = `${relayUrl}/`;
      }
      relayUrl = `${relayUrl}protocol/version`;
      const response = await axios.get(relayUrl);
      return response.status === 200;
    } catch (e) {
      return false;
    }
  };

  const generateKeys = async () => {
    const keyUtil = cryptoUtil();
    const keyPair = await keyUtil.generateSignatureKeys();
    const privateJwk = await keyUtil.exportSignatureKey(keyPair.privateKey);
    const publicJwk = await keyUtil.exportSignatureKey(keyPair.publicKey);
    const privateText = JSON.stringify(privateJwk);
    const publicText = JSON.stringify(publicJwk);
    setPrivateSignatureKey(privateText);
    setPublicSignatureKey(publicText);
  };

  const handleTabChange = (e: any, tabIndex: number) => {
    setCurrentTabIndex(tabIndex);
  };

  const displayNextTab = () => {
    if (currentTabIndex < 3) {
      setCurrentTabIndex(currentTabIndex + 1);
    } else {
      setCurrentTabIndex(0);
    }
  };

  const isConfigurationIncomplete = (): boolean => {
    return (
      !author ||
      !email ||
      !privateSignatureKey ||
      !publicSignatureKey ||
      !appName
    );
  };

  return (
    <div>
      <Dialog open={open} onClose={undefined} fullWidth={true}>
        <DialogTitle>Libra Setup</DialogTitle>
        <Tabs value={currentTabIndex} onChange={handleTabChange}>
          <Tab
            icon={<AppRegistrationIcon />}
            label="About"
            iconPosition="start"
          />
          <Tab icon={<HubOutlinedIcon />} label="Relays" iconPosition="start" />
          <Tab
            icon={<PermIdentityOutlinedIcon />}
            label="Identity"
            iconPosition="start"
          />
          <Tab
            icon={<VpnKeyOutlinedIcon />}
            label="Keys"
            iconPosition="start"
          />
        </Tabs>
        {currentTabIndex === 0 && (
          <DialogContent>
            <DialogContentText>
              Libra version is {APP_VERSION}. For a functional setup all fields
              are required. All data you provide will stay in the browser.
              Please click Next to continue.
            </DialogContentText>
            {/* <TextField
            autoFocus
            margin="normal"
            id="appName"
            label="Application Name"
            type="text"
            fullWidth
            value={appName}
            onChange={(e) => setAppName(e.target.value)}
            placeholder="Eg. My Media Vault"
          /> */}
          </DialogContent>
        )}
        {currentTabIndex === 1 && (
          <DialogContent>
            <DialogContentText>
              Add one or more relays. You can run a local relay to share
              information with other users on your local network. Use a public
              relay for a broader audience. Press ADD RELAY to confirm the
              input.
            </DialogContentText>
            <TextField
              margin="normal"
              id="newRelayName"
              label="Relay Name"
              fullWidth
              value={newRelayName}
              onChange={(e) => setNewRelayName(e.target.value)}
              placeholder="Eg. Localhost Relay"
            />
            <TextField
              margin="normal"
              id="newRelayValue"
              label="Relay URL"
              type="url"
              fullWidth
              value={newRelayValue}
              placeholder="Eg. https://localhost:3003"
              error={!relayExists}
              onChange={(e) => setNewRelayValue(e.target.value)}
            />
            <Button color="primary" onClick={addRelay}>
              Add Relay
            </Button>
            <List>
              {namedRelays.map((relay: Relay, index: number) => (
                <ListItem
                  key={`relay-config-${btoa(relay.name)}-${btoa(relay.url)}`}
                >
                  <ListItemText primary={`${relay.name}: ${relay.url}`} />
                  <Button onClick={() => removeRelay(index)}>Remove</Button>
                </ListItem>
              ))}
            </List>
          </DialogContent>
        )}
        {currentTabIndex === 2 && (
          <DialogContent>
            <DialogContentText>
              Configure your desired identity. The email address is intended as
              a human friendly identifier, for instance when reviewing the
              collaboration history. No validation. The information is stored
              locally in the browser but will be shared once you decide to
              publish externally your media collections.
            </DialogContentText>
            <TextField
              autoFocus
              margin="normal"
              id="author"
              label="Author"
              type="text"
              fullWidth
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              placeholder="Eg. John Doe"
            />
            <TextField
              autoFocus
              margin="normal"
              id="email"
              label="Email"
              type="email"
              fullWidth
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Eg. john@doe.me"
            />
          </DialogContent>
        )}
        {currentTabIndex === 3 && (
          <DialogContent>
            <DialogContentText>
              Keys are required for media signing and signature verification.
              Both keys are stored locally. The private key will never leave the
              browser. The public key will be shared once you decide to publish
              externally your media collections. Generate new ones or bring your
              own. Expected format is JWK (JSON Web Key) format.
            </DialogContentText>
            <TextField
              autoFocus
              margin="normal"
              id="privateKey"
              label="Private Key"
              type="text"
              fullWidth
              multiline
              maxRows={5}
              value={privateSignatureKey}
              onChange={(e) => setPrivateSignatureKey(e.target.value)}
              placeholder="Paste your private key in JWK format or click (Re) Generate"
            />
            <TextField
              autoFocus
              margin="normal"
              id="publicKey"
              label="Public Key"
              type="text"
              fullWidth
              multiline
              maxRows={5}
              value={publicSignatureKey}
              onChange={(e) => setPublicSignatureKey(e.target.value)}
              placeholder="Paste your public key in JWK format or click (Re) Generate"
            />
            <Stack direction="row" spacing={1}>
              <Button color="primary" onClick={generateKeys}>
                (Re) Generate
              </Button>
              <Divider orientation="vertical" flexItem />
              <Button color="primary" onClick={() => setExportKeysOpen(true)}>
                Export
              </Button>
              <Divider orientation="vertical" flexItem />
              <Button color="primary" onClick={() => setImportKeysOpen(true)}>
                Import
              </Button>
            </Stack>
          </DialogContent>
        )}
        <DialogActions>
          {onClose && (
            <Button onClick={onClose} color="secondary">
              Cancel
            </Button>
          )}
          <Button onClick={displayNextTab} color="primary">
            Next
          </Button>
          <Button
            onClick={() => {
              saveSettings();
            }}
            disabled={isConfigurationIncomplete()}
            color="primary"
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog open={importKeysOpen} onClose={undefined} fullWidth={true}>
        <DialogTitle>Import Keys</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Key import not implemented yet. Use regular copy & paste to reuse
            existing keys.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setImportKeysOpen(false)}>Cancel</Button>
          <Button
            onClick={() => setImportKeysOpen(false)}
            color="primary"
            disabled={true}
          >
            Import
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog open={exportKeysOpen} onClose={undefined} fullWidth={true}>
        <DialogTitle>Export Keys</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Key export not implemented yet. Use regular copy & paste to
            externalize generated keys.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setExportKeysOpen(false)}>Cancel</Button>
          <Button
            onClick={() => setExportKeysOpen(false)}
            color="primary"
            disabled={true}
          >
            Export
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default MediaSettings;
