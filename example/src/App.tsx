import * as React from 'react';
import {Sandbox} from './Sandbox';
import {UserList} from './components/UserList';
import {
  Route,
  Redirect,
  withRouter,
  RouteComponentProps,
} from 'react-router-dom';
import SearchUser from './components/SearchUser';
import {Styles, Main, Header, Container} from './styles';
import {Menu} from 'grommet';
import {UserListCached} from './components/UserListCached';

const routes = [
  {label: 'Users List', path: '/users-list'},
  {label: 'Users List Redux Cache', path: '/users-list-cached'},
  {label: 'Search User', path: '/search-user'},
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
          <Route exact path="/" render={() => <Redirect to="/users-list" />} />
        </Container>
      </Main>
    </>
  );
}

export default withRouter(App);
