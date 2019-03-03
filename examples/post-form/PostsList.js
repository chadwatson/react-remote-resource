import React from "react";
import { Link } from "react-router-dom";
import { usePosts } from "./resources";

const PostsList = () => {
  const [postsById] = usePosts();

  return (
    <ul>
      {Object.values(postsById).map(post => (
        <li key={post.id}>
          <Link to={`/posts/${post.id}`}>{post.title}</Link>
        </li>
      ))}
      <li>
        <Link to={`/posts/new`}>Create new post</Link>
      </li>
    </ul>
  );
};

export default PostsList;
