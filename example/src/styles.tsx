import styled, {createGlobalStyle} from 'styled-components';

export const Header = styled.div`
  display: flex;
  flex-direction: row;
  min-width: 100%;
  min-height: 48px;
`;

export const Main = styled.main`
  display: flex;
  max-width: 960px;
  width: 100%;
  margin: 6rem;
  padding: 1rem;
  overflow: hidden;
  flex-grow: 1;
  flex-direction: column;
  background-color: white;
  border-radius: 6px;
  box-shadow: 0 16px 38px -12px rgba(0, 0, 0, 0.56),
    0 4px 25px 0px rgba(0, 0, 0, 0.12), 0 8px 10px -5px rgba(0, 0, 0, 0.2);

  @media (max-width: 960px) {
    max-width: calc(100% - 16px);
    padding: 8px;
  }
`;

export const FlexRow = styled.div<{justify?: string}>`
  display: flex;
  flex-direction: row;
  ${props => props.justify && `justify-content: ${props.justify}`}

  @media (max-width: 768px) {
    flex-direction: column;
  }
`;

export const Container = styled.div`
  display: flex;
  flex-direction: column;
  flex-grow: 1;
  padding: 4px;
  max-height: calc(100% - 80px);
  overflow-y: scroll;
`;

export const Counter = styled(FlexRow)<{color?: 'purple' | 'blue' | 'green'}>`
  display: flex;
  flex-direction: row;
  align-self: center;
  align-items: center;
  justify-content: center;
  padding: 4px;
  border-radius: 10px;
  font-weight: 500;
  font-size: 18px;
  margin: 8px;

  min-width: 188px;
  border: 3px solid
    ${props =>
      props.color === 'purple'
        ? 'purple'
        : props.color === 'green'
        ? 'green'
        : 'blueviolet'};

  @media (max-width: 768px) {
    display: none;
  }

  b {
    font-weight: 600;
    padding: 0 8px;
    font-size: 22px;
  }
`;

export const Row = styled(FlexRow)<{alpha?: number}>`
  min-height: 128px;
  margin: 8px;
  padding: 16px;
  align-items: center;
  border-radius: 4px;
  background-color: rgba(
    253,
    247,
    255,
    ${props => (props.alpha ? (props.alpha % 101) / 15 : 0.1)}
  );

  img {
    border-radius: 100%;
    height: 64px;
    margin-right: 12px;
  }
`;

export const Styles = createGlobalStyle`
   * {
    border: 0;
    box-sizing: inherit;
    -webkit-font-smoothing: antialiased;
    font-weight: inherit;
    margin: 0;
    outline: 0;
    padding: 0;
    text-decoration: none;
    text-rendering: optimizeLegibility;
    -webkit-appearance: none;
    -moz-appearance: none;
  }

  html {
    display: flex;
    height: 100%;
    width: 100%;
    box-sizing: border-box;
    font-size: 16px;
    line-height: 1.5;
    background-color: #ffffff;
    color: #16171a;
    padding: 0;
    margin: 0;
    -webkit-font-smoothing: antialiased;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial,
      sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol';

    max-width: 100%;
  }

  body {
    flex-direction: column;
    box-sizing: border-box;
    min-width: 100%;
    min-height: 100%; 
    -webkit-overflow-scrolling: touch;
    display: flex;
  }

  a {
    color: currentColor;
    text-decoration: none;
  }

  a:hover {
    cursor: pointer;
  }

  #root {
    display: flex;
    flex-direction: column;
    align-items: center;
    flex: 1;
    background: linear-gradient(135deg, #5C33B8, #A267D7);
  }
`;
