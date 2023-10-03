import React, { useState, useEffect } from "react";
import MediaUpload from "./MediaUpload";
import { MediaNode, Media } from "@ubiquify/media";
import IconButton from "@mui/material/IconButton";
import DeleteIcon from "@mui/icons-material/Delete";
import DeleteOutlinedIcon from "@mui/icons-material/DeleteOutlined";
import Tooltip from "@mui/material/Tooltip";
import "./MediaApp.css";
import MediaViewer from "./MediaViewer";

interface MediaItemProps {
  readOnly: boolean;
  elevation: number;
  mediaNode: MediaNode;
  onRemove: (itemId: string) => void;
  onUpdateMedia: (itemId: string, media: Media) => void;
  onUpdateComment: (itemId: string, comment: string) => void;
}

const MediaItem: React.FC<MediaItemProps> = ({
  readOnly,
  elevation,
  mediaNode,
  onRemove,
  onUpdateMedia,
  onUpdateComment,
}) => {
  const {
    id: itemId,
    media: initialMedia,
    comment: initialComment,
  } = mediaNode;
  const [media, setMedia] = useState(initialMedia);
  const [comment, setComment] = useState(initialComment);
  const handleRemoveCell = () => {
    onRemove(itemId);
  };

  return (
    <div className="media-item">
      <div>
        {readOnly && (
          <MediaViewer elevation={elevation} mediaNode={mediaNode} />
        )}
        {!readOnly && (
          <MediaUpload
            elevation={elevation}
            mediaNode={mediaNode}
            onData={(name: string, mimeType: string, data: ArrayBuffer) => {
              const newMedia = { name, mimeType, data: new Uint8Array(data) };
              setMedia(newMedia);
              onUpdateMedia(itemId, newMedia);
            }}
            onComment={(text: string) => {
              setComment(text);
              onUpdateComment(itemId, text);
            }}
          />
        )}
        {!readOnly && (
          <Tooltip title="Delete">
            <IconButton
              aria-label="delete"
              size="large"
              onClick={handleRemoveCell}
            >
              <DeleteOutlinedIcon fontSize="inherit" />
            </IconButton>
          </Tooltip>
        )}
      </div>
    </div>
  );
};

export default MediaItem;
