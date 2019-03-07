import React from "react";
import { useOptimism } from "react-remote-resource";
import PostForm from "./PostForm";
import { usePost } from "./resources";

const ExistingPostForm = ({ id }) => {
  // Returns the latest post at the given id if it exists, fetching and suspending rendering if cache is invalid
  // If there is no post with this id the promise will reject and be caught by RemoteResourceBoundary
  const [post, savePost, deletePost] = useOptimism(usePost(id));
  return <PostForm onSave={savePost} onDelete={deletePost} post={post} />;
};

export default ExistingPostForm;
