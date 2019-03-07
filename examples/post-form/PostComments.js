import React from "react";
import { useSubscribe } from "react-remote-resource";
import { useComments } from "./resources";

const PostComments = ({ postId }) => {
  const [comments] = useSubscribe(useComments(postId));
  return (
    <aside>
      <header>
        <h1>Comments</h1>
      </header>
      <ul>
        {comments.map(comment => (
          <li key={comment.id}>
            <h2>{comment.author}</h2>
            <p>{comment.content}</p>
          </li>
        ))}
      </ul>
    </aside>
  );
};

export default PostComments;
