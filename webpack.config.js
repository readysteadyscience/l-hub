const path = require('path');
const webpack = require('webpack');
const CopyPlugin = require('copy-webpack-plugin');

const extensionConfig = {
    mode: 'none',
    target: 'node',
    entry: {
        extension: './src/extension.ts',
        cli: './src/cli.ts',
        'mcp-server': './src/mcp-server.ts'
    },
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: '[name].js',
        libraryTarget: 'commonjs'
    },
    resolve: {
        mainFields: ['module', 'main'],
        extensions: ['.ts', '.js']
    },
    module: {
        rules: [
            {
                test: /\.ts$/,
                exclude: /node_modules/,
                use: [{ loader: 'ts-loader' }]
            }
        ]
    },
    plugins: [
        new webpack.BannerPlugin({ banner: "#!/usr/bin/env node", raw: true, entryOnly: true, test: /cli\.js|mcp-server\.js/ }),
        // Copy sql.js WASM binary to dist so extension.ts can load it at runtime
        new CopyPlugin({
            patterns: [
                {
                    from: path.join(__dirname, 'node_modules/sql.js/dist/sql-wasm.wasm'),
                    to: path.join(__dirname, 'dist/sql-wasm.wasm'),
                },
            ],
        }),
    ],
    externals: {
        vscode: 'commonjs vscode',
        'better-sqlite3': 'commonjs better-sqlite3',  // still needed by mcp-server
        'ws': 'commonjs ws',
        'express': 'commonjs express'
    }
};

const webviewConfig = {
    mode: 'none',
    target: 'web',
    entry: {
        webview: './webview/index.tsx'
    },
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: '[name].js'
    },
    resolve: {
        extensions: ['.ts', '.tsx', '.js', '.jsx']
    },
    plugins: [
        new webpack.DefinePlugin({
            'process.env.NODE_ENV': JSON.stringify('production')
        })
    ],
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                exclude: /node_modules/,
                use: [
                    {
                        loader: 'ts-loader',
                        options: {
                            configFile: path.resolve(__dirname, 'webview/tsconfig.json')
                        }
                    }
                ]
            },
            {
                test: /\.css$/,
                use: ['style-loader', 'css-loader']
            }
        ]
    }
};

module.exports = [extensionConfig, webviewConfig];
