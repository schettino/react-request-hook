import * as React from 'react';
import {
  Route,
  Redirect,
  withRouter,
  RouteComponentProps,
} from 'react-router-dom';
import {Menu} from 'grommet';
import {Sandbox} from './Sandbox';
import {UserList} from './components/UserList';
import SearchUser from './components/SearchUser';
import {Styles, Main, Header, Container} from './styles';
import {UserListCached} from './components/UserListCached';
import {SearchUserOptmized} from './components/SearchUserOptimized';

const routes = [
  {label: 'Users List', path: '/users-list'},
  {label: 'Users List Cached', path: '/users-list-cached'},
  {label: 'Search User', path: '/search-user'},
  {label: 'Search User Optmized', path: '/search-user-optmized'},
];

function App(props: RouteComponentProps) {
  return (
    <>
      <Styles />

      <Main>
        <Header>
          <Menu
            label="Examples"
            items={routes.map(r => ({
              label: r.label,
              onClick: () => props.history.push(r.path),
            }))}
          />
        </Header>

        <Container>
          <Route
            path="/users-list-cached"
            render={() => (
              <Sandbox name="users-list-cached">
                <UserListCached />
              </Sandbox>
            )}
          />

          <Route
            path="/users-list"
            render={() => (
              <Sandbox name="users-list">
                <UserList />
              </Sandbox>
            )}
          />

          <Route
            path="/search-user"
            render={() => (
              <Sandbox name="search-user">
                <SearchUser />
              </Sandbox>
            )}
          />

          <Route
            path="/search-user-optmized"
            render={() => (
              <Sandbox name="search-user-optmized">
                <SearchUserOptmized />
              </Sandbox>
            )}
          />
          <Route exact path="/" render={() => <Redirect to="/users-list" />} />
        </Container>
      </Main>
    </>
  );
}

export default withRouter(App);
