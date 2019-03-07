import React, { useCallback } from "react";
import PostForm from "./PostForm";
import { usePost } from "./resources";

const ExistingPostForm = ({ id }) => {
  // Returns the latest post at the given id if it exists, fetching and suspending rendering if cache is invalid
  // If there is no post with this id the promise will reject and be caught by RemoteResourceBoundary
  const [post, actions] = usePost(id);
  return (
    <PostForm
      onSave={useCallback(
        data => {
          actions.setCache(data);
          return actions.remoteSave(data);
        },
        [actions]
      )}
      onDelete={useCallback(() => {
        actions.deleteCache();
        return actions.remoteDelete();
      }, [actions])}
      post={post}
    />
  );
};

export default ExistingPostForm;
