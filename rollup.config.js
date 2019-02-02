import typescript from 'rollup-plugin-typescript2';
import commonjs from 'rollup-plugin-commonjs';
import external from 'rollup-plugin-peer-deps-external';
import resolve from 'rollup-plugin-node-resolve';
import url from 'rollup-plugin-url';
import copy from 'rollup-plugin-cpy';
import svgr from '@svgr/rollup';
import pkg from './package.json';

export default {
  input: 'src/index.ts',
  output: [
    {
      file: pkg.main,
      format: 'cjs',
      exports: 'named',
      sourcemap: true,
    },
    {
      file: pkg.module,
      format: 'es',
      exports: 'named',
      sourcemap: true,
    },
  ],
  plugins: [
    external(),
    url(),
    svgr(),
    resolve(),
    typescript({
      clean: true,
      rollupCommonJSResolveHack: true,
      exclude: ['*.d.ts', '**/*.d.ts'],
    }),
    commonjs(),
    copy([
      // The example uses create-react-app (via create-react-library), which
      // doesn't work correctly with yarn or npm links. It will end up with
      // two versions of React in the build, which breaks hooks in particular
      // since they rely on global state. To avoid this problem we simply copy
      // the source directly into the example project.
      //
      // For more info about the issue:
      // https://stackoverflow.com/questions/31169760/how-to-avoid-react-loading-twice-with-webpack-when-developing
      {
        files: [
          'src/index.ts',
          'src/request.ts',
          'src/useRequest.ts',
          'src/useResource.ts',
          'src/requestContext.ts',
        ],
        dest: 'example/src/react-request-hook/',
      },
    ]),
  ],
};
