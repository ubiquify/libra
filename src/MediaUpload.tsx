import React, { useState, useEffect, useRef } from "react";
import { MediaNode } from "@ubiquify/media";
import Paper from "@mui/material/Paper";
import MDEditor, { ICommand } from "@uiw/react-md-editor";
import { setDisplayInfo } from "./MediaUtil";

interface MediaUploadProps {
  elevation: number;
  mediaNode: MediaNode;
  onData: (name: string, mimeType: string, data: ArrayBuffer) => void;
  onComment: (text: string) => void;
}

const MediaUpload: React.FC<MediaUploadProps> = ({
  elevation,
  mediaNode,
  onData,
  onComment,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [data, setData] = useState<string | undefined>(undefined);
  const [mediaType, setMediaType] = useState<string | undefined>(undefined);
  const [mediaName, setMediaName] = useState("");
  const [editableText, setEditableText] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);

    const files = e.dataTransfer.files;
    const droppedFile = files[0];

    // Read the MIME type
    const mimeType = droppedFile.type;
    const mediaName = droppedFile.name;
    setMediaType(mimeType);
    setMediaName(mediaName);

    // Read the file as media
    const reader = new FileReader();
    reader.onload = (event) => {
      const fileData = event.target?.result;
      if (fileData instanceof ArrayBuffer) {
        setDisplayInfo(fileData, mimeType, setData);
        onData(mediaName, mimeType, fileData);
      }
    };

    if (mimeType.startsWith("image/")) {
      reader.readAsArrayBuffer(droppedFile);
    } else if (mimeType.startsWith("video/")) {
      reader.readAsArrayBuffer(droppedFile);
    } else if (mimeType.startsWith("audio/")) {
      reader.readAsArrayBuffer(droppedFile);
    } else if (mimeType === "application/pdf") {
      reader.readAsArrayBuffer(droppedFile);
    } else if (mimeType === "text/plain") {
      reader.readAsArrayBuffer(droppedFile);
    } else if (mimeType === "text/html") {
      reader.readAsArrayBuffer(droppedFile);
    } else {
      console.log("Unsupported MIME type:", mimeType);
    }
    const text =
      mediaName + "; " + mimeType + "; " + bytesToSize(droppedFile.size);
    setEditableText(text);
  };

  const bytesToSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
    const k = 1024;
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  useEffect(() => {
    onComment(editableText);
  }, [editableText]);

  useEffect(() => {
    // Clear media data when the component mounts
    return () => {
      setData(undefined);
    };
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

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      const mimeType = selectedFile.type;
      const mediaName = selectedFile.name;
      setMediaType(mimeType);
      setMediaName(mediaName);

      const reader = new FileReader();
      reader.onload = (event) => {
        const fileData = event.target?.result;
        if (fileData instanceof ArrayBuffer) {
          setDisplayInfo(fileData, mimeType, setData);
          onData(mediaName, mimeType, fileData);
        }
      };

      if (mimeType.startsWith("image/")) {
        reader.readAsArrayBuffer(selectedFile);
      } else if (mimeType.startsWith("video/")) {
        reader.readAsArrayBuffer(selectedFile);
      } else if (mimeType.startsWith("audio/")) {
        reader.readAsArrayBuffer(selectedFile);
      } else if (mimeType === "application/pdf") {
        reader.readAsArrayBuffer(selectedFile);
      } else if (mimeType === "text/plain") {
        reader.readAsArrayBuffer(selectedFile);
      } else if (mimeType === "text/html") {
        reader.readAsArrayBuffer(selectedFile);
      } else {
        console.log("Unsupported MIME type:", mimeType);
      }
      const text =
        mediaName + "; " + mimeType + "; " + bytesToSize(selectedFile.size);
      setEditableText(text);
    }
  };

  const openFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const selectFileCommand: ICommand = {
    name: "selectFile",
    keyCommand: "selectFile",
    buttonProps: { "aria-label": "Select File", title: "Select File" },
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        enable-background="new 0 0 24 24"
        width="24"
        viewBox="0 0 24 24"
      >
        <g>
          <path d="M0,0h24v24H0V0z" fill="none" />
        </g>
        <g>
          <path
            fill="#757575"
            d="M14,2H6C4.9,2,4,2.9,4,4v16c0,1.1,0.9,2,2,2h12c1.1,0,2-0.9,2-2V8L14,2z M18,20H6V4h8v4h4V20z M12,17L12,17 c-1.1,0-2-0.9-2-2l0-5.5C10,9.22,10.22,9,10.5,9h0C10.78,9,11,9.22,11,9.5V15h2V9.5C13,8.12,11.88,7,10.5,7h0C9.12,7,8,8.12,8,9.5 L8,15c0,2.21,1.79,4,4,4h0c2.21,0,4-1.79,4-4v-4h-2v4C14,16.1,13.1,17,12,17z"
          />
        </g>
      </svg>
    ),
    execute: (state, api) => {
      openFileInput();
    },
  };

  return (
    <Paper
      elevation={elevation}
      className={`file-upload ${isDragOver ? "drag-over" : ""}`}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
    >
      <div className="media-viewer-content">
        {renderMediaContent()}
        <input
          type="file"
          ref={fileInputRef}
          style={{ display: "none" }}
          accept="image/*, video/*, application/pdf, text/plain, text/html"
          onChange={handleFileInputChange}
        />
      </div>
      <div data-color-mode="light">
        <MDEditor
          value={editableText}
          onChange={setEditableText}
          hideToolbar={false}
          textareaProps={{
            placeholder:
              "You can enter markdown text, drag or select a media file (image, video, audio, pdf, text or html). \nClick the 💾 button to persist media in the browser. \nClick the ☁↑ button to publish already persisted media to a configured relay",
          }}
          commands={[selectFileCommand]}
        />
      </div>
    </Paper>
  );
};

export default MediaUpload;
