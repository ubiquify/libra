import React, { useState, useEffect } from "react";
import { MediaNode } from "@ubiquify/media";
import Paper from "@mui/material/Paper";
import MarkdownPreview from "@uiw/react-markdown-preview";
import { setDisplayInfo } from "./MediaUtil";

interface MediaViewerProps {
  elevation: number;
  mediaNode: MediaNode;
}

const MediaViewer: React.FC<MediaViewerProps> = ({ elevation, mediaNode }) => {
  const [data, setData] = useState<string | undefined>(undefined);
  const [mediaType, setMediaType] = useState<string | undefined>(undefined);
  const [editableText, setEditableText] = useState("");

  useEffect(() => {
    if (mediaNode.media) {
      const { mimeType, data } = mediaNode.media;
      setMediaType(mimeType);
      const blob = new Blob([data], { type: mediaType });
      const reader = new FileReader();
      reader.onload = (event) => {
        const fileData = event.target?.result;
        if (fileData instanceof ArrayBuffer) {
          setDisplayInfo(fileData, mimeType, setData);
        }
      };
      reader.readAsArrayBuffer(blob);
    }
    if (mediaNode.comment) {
      setEditableText(mediaNode.comment);
    }
  }, []);

  const renderMediaContent = () => {
    if (mediaType !== undefined && data !== undefined) {
      if (mediaType.startsWith("video/")) {
        return <video src={data} controls className="uploaded-media" />;
      } else if (mediaType.startsWith("audio/")) {
        return <audio src={data} controls className="uploaded-audio" />;
      } else if (mediaType === "application/pdf") {
        return (
          <object data={data} type="application/pdf" className="uploaded-pdf">
            <embed src={data} type="application/pdf" />
          </object>
        );
      } else if (mediaType.startsWith("image/")) {
        return <img src={data} alt="Uploaded" className="uploaded-image" />;
      } else if (mediaType === "text/html") {
        return (
          // eslint-disable-next-line jsx-a11y/iframe-has-title
          <iframe
            srcDoc={data}
            sandbox="allow-scripts"
            className="uploaded-html"
          />
        );
      } else if (mediaType === "text/plain") {
        return <div className="uploaded-text">{data}</div>;
      }
    } else {
      return undefined;
    }
  };

  return (
    <Paper elevation={elevation}>
      <div className="media-viewer-content">{renderMediaContent()}</div>
      <div data-color-mode="light">
        <MarkdownPreview source={editableText} className="media-viewer-text" />
      </div>
    </Paper>
  );
};

export default MediaViewer;
