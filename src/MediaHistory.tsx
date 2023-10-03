import React, { useState, useEffect } from "react";
import { Gitgraph, TemplateName, templateExtend } from "@gitgraph/react";
import { MediaFactory } from "./MediaFactory";
import { NamedMediaCollection } from "@ubiquify/media";
import {
  LinkCodec,
  Version,
  VersionStore,
  linkCodecFactory,
} from "@ubiquify/core";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import { Button, DialogActions } from "@mui/material";
import { DialogContent, CircularProgress } from "@mui/material";
import { BranchUserApi } from "@gitgraph/core";
import { ReactSvgElement } from "@gitgraph/react/lib/types";
import { v4 as uuid } from "uuid";

const linkCodec: LinkCodec = linkCodecFactory();

interface MediaHistoryProps {
  open: boolean;
  onClose: () => void;
  alias: string;
  mediaFactory: MediaFactory;
}

const MediaHistory: React.FC<MediaHistoryProps> = ({
  open,
  onClose,
  alias,
  mediaFactory,
}) => {
  const [versions, setVersions] = useState<Version[] | undefined>(undefined);
  const fetchData = async (): Promise<void> => {
    const mediaCollection: NamedMediaCollection =
      await mediaFactory.currentMediaCollectionByAlias(alias);
    const versionStore: VersionStore = mediaCollection.getVersionStore();
    const versions: Version[] = versionStore.log();
    setVersions(versions);
  };

  useEffect(() => {
    if (open) {
      fetchData();
    } else {
      setVersions(undefined);
    }
  }, [open, alias]);

  const withoutHash = templateExtend(TemplateName.Metro, {
    commit: {
      message: {
        displayHash: false,
      },
    },
  });

  return (
    <Dialog open={open} onClose={undefined} onClick={onClose} fullWidth={true}>
      <DialogTitle>Collection History</DialogTitle>
      <DialogContent>
        {versions === undefined ? (
          <CircularProgress />
        ) : (
          <Gitgraph options={{ template: withoutHash }}>
            {(gitgraph) => {
              const authors = [];
              const authorsByCommit = new Map<string, string>();
              let rootVersion: Version;
              let rootAuthor: string;
              function collectBy(
                author: string,
                version: any,
                map: Map<string, any[]>
              ) {
                if (map.get(author) === undefined) {
                  map.set(author, []);
                }
                map.get(author).push(version);
              }

              for (const version of versions) {
                const author = version.details.author;
                authorsByCommit.set(
                  linkCodec.encodeString(version.root),
                  author
                );
                if (version.details.merge !== undefined) {
                  const author1 = version.details.merge.parent.author;
                  const author2 = version.details.merge.mergeParent.author;
                  if (author1 !== undefined) {
                    authors.push(author1);
                  }
                  if (author2 !== undefined) {
                    authors.push(author2);
                  }
                }
                if (version.parent === undefined) {
                  rootAuthor = author;
                  rootVersion = version;
                }
              }

              const rootBranch = gitgraph.branch({ name: rootAuthor });
              rootBranch.commit({
                subject: `${rootVersion.details.comment}`,
                author: `${rootVersion.details.author} <${rootVersion.details.email}>`,
                body: `${new Date(
                  rootVersion.details.timestamp
                ).toLocaleString()}`,
                hash: `${linkCodec.encodeString(rootVersion.root)}`,
              });
              rootBranch.tag("start");
              for (const tag of rootVersion.details.tags) {
                rootBranch.tag(tag);
              }
              function isFollowBranch(author: string) {
                return author !== rootAuthor;
              }
              function isMergeVersion(version: Version) {
                return version.details.merge !== undefined;
              }
              function isRootVersion(version: Version) {
                return version === rootVersion;
              }
              const branchesByAuthor = new Map<string, any>();
              const colorsByAuthor = new Map<string, string>();
              function getOrCreateBranch(author: string) {
                if (author === rootAuthor) {
                  return rootBranch;
                } else {
                  if (branchesByAuthor.get(author) === undefined) {
                    const br: BranchUserApi<ReactSvgElement> =
                      rootBranch.branch({
                        name: uuid(),
                        renderLabel: (branch: any) => {
                          return (
                            <text
                              alignmentBaseline="middle"
                              dominantBaseline="middle"
                              fill={branch.computedColor}
                              style={{ font: branch.style.label.font }}
                              y={20}
                            >
                              👉️ {author}
                            </text>
                          );
                        },
                      });
                    branchesByAuthor.set(author, br);
                  }
                  return branchesByAuthor.get(author);
                }
              }
              const commitsByAuthor = new Map<string, string[]>();
              function isCommitApplied(
                author: string,
                commit: string
              ): boolean {
                if (commitsByAuthor.has(author)) {
                  const commitArray = commitsByAuthor.get(author);
                  if (commitArray.includes(commit)) {
                    return true;
                  }
                }
                return false;
              }
              function commitIfNeeded(author: string, version: Version) {
                const branch = getOrCreateBranch(author);
                const commitString = linkCodec.encodeString(version.root);
                if (!isCommitApplied(author, commitString)) {
                  branch.commit({
                    subject: `${version.details.comment}`,
                    author: `${version.details.author} <${version.details.email}>`,
                    body: `${new Date(
                      version.details.timestamp
                    ).toLocaleString()}`,
                    hash: `${linkCodec.encodeString(version.root)}`,
                  });
                  for (const tag of version.details.tags) {
                    branch.tag(tag);
                  }
                  commitsByAuthor.set(author, [
                    ...(commitsByAuthor.get(author) ?? []),
                    commitString,
                  ]);
                }
              }
              // FIXME topological sort on parent dependency
              versions.sort((a, b) => {
                return a.details.timestamp - b.details.timestamp;
              });
              for (const version of versions) {
                const printVersion = {
                  root: version.root,
                  parent: version.parent,
                  mergeParent: version.mergeParent,
                  details: {
                    author: version.details.author,
                    email: version.details.email,
                    timestamp: version.details.timestamp,
                    comment: version.details.comment,
                    tags: version.details.tags,
                    merge: version.details.merge,
                  },
                };
                // debug version log
                console.log(JSON.stringify(printVersion, null, 2));
              }

              for (const version of versions) {
                if (isRootVersion(version)) continue;
                const author = version.details.author;
                if (author !== undefined) {
                  const branch = getOrCreateBranch(author);
                  if (isMergeVersion(version) && isFollowBranch(author)) {
                    branch.merge({
                      branch: rootBranch,
                      commitOptions: {
                        subject: `${version.details.comment}`,
                        author: `${version.details.author} <${version.details.email}>`,
                        body: `${new Date(
                          version.details.timestamp
                        ).toLocaleString()}`,
                        hash: `${linkCodec.encodeString(version.root)}`,
                        tag: "merge",
                      },
                    });
                  } else {
                    commitIfNeeded(author, version);
                  }
                } else if (isMergeVersion(version)) {
                  const authorParent = version.details.merge.parent.author;
                  const authorMergeParent =
                    version.details.merge.mergeParent.author;
                  const versionDetailsParent = version.details.merge.parent;
                  const versionParent = {
                    root: version.parent,
                    details: versionDetailsParent,
                  };
                  const versionDetailsMergeParent =
                    version.details.merge.mergeParent;
                  const versionMergeParent = {
                    root: version.mergeParent,
                    details: versionDetailsMergeParent,
                  };
                  commitIfNeeded(authorParent, versionParent);
                  commitIfNeeded(authorMergeParent, versionMergeParent);

                  // determine which is the non-root author
                  const otherAuthor =
                    authorParent !== rootAuthor
                      ? authorParent
                      : authorMergeParent;
                  const otherDetails =
                    authorParent !== rootAuthor
                      ? versionParent
                      : versionMergeParent;
                  const otherBranch = getOrCreateBranch(otherAuthor);
                  rootBranch.merge({
                    branch: otherBranch,
                    commitOptions: {
                      subject: `${otherDetails.details.comment} `,
                      author: `${otherDetails.details.author} <${otherDetails.details.email}>`,
                      body: `${new Date(
                        versionParent.details.timestamp
                      ).toLocaleString()}`,
                      tag: "merge",
                    },
                  });
                  branchesByAuthor.delete(otherAuthor);
                }
              }
            }}
          </Gitgraph>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default MediaHistory;
