import React from "react";
import ReactDOM from "react-dom";
import { BrowserRouter as Router, Route, Switch, Link } from "react-router-dom";
import { RemoteResourceBoundary } from "react-remote-resource";
import PostsList from "./PostsList";
import NewPostForm from "./NewPostForm";
import ExistingPostForm from "./ExistingPostForm";

const App = () => (
  <Router>
    <Switch>
      <Route
        path="/posts/new"
        render={({ match }) => (
          <RemoteResourceBoundary
            fallback={<p>Fetching tags...</p>}
            renderError={error => (
              <div>
                <p>{error}</p>
                <Link to="/posts">Back to list</Link>
              </div>
            )}
          >
            <NewPostForm />
          </RemoteResourceBoundary>
        )}
      />
      <Route
        path="/posts/:id"
        render={({ match }) => (
          <RemoteResourceBoundary
            fallback={<p>Fetching post...</p>}
            renderError={(error, clearError) => (
              <div>
                <p>{error}</p>
                <Link to="/posts" onClick={clearError}>
                  Back to list
                </Link>
              </div>
            )}
          >
            <ExistingPostForm id={match.params.id} />
          </RemoteResourceBoundary>
        )}
      />
      <Route
        render={() => (
          <RemoteResourceBoundary
            fallback={<p>Fetching posts...</p>}
            renderError={(error, retry) => (
              <>
                <p>There was a problem fetching posts.</p>
                <button onClick={retry}>Try again</button>
              </>
            )}
          >
            <PostsList />
          </RemoteResourceBoundary>
        )}
      />
    </Switch>
  </Router>
);

ReactDOM.render(<App />, document.getElementById("root"));
