import React from "react";
import ReactDOM from "react-dom";
import { Router, Route, Switch, Link } from "react-router-dom";
import { RemoteResourceBoundary } from "../../src";
import PostsList from "./PostsList";
import PostForm from "./PostForm";

const App = () => (
  <Router>
    <Switch>
      <Route
        path="/posts/:id"
        render={({ match }) => (
          <RemoteResourceBoundary
            fallback={<p>Fetching post...</p>}
            renderError={error => (
              <div>
                <p>{error}</p>
                <Link to="/posts">Back to list</Link>
              </div>
            )}
          >
            <PostForm id={match.params.id} />
          </RemoteResourceBoundary>
        )}
      />
      <Route
        render={() => (
          <RemoteResourceBoundary fallback={<p>Fetching posts...</p>}>
            <PostsList />
          </RemoteResourceBoundary>
        )}
      />
    </Switch>
  </Router>
);

ReactDOM.render(<App />, document.getElementById("root"));
