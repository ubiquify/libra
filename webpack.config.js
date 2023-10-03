const path = require("path");
module.exports = {
    entry: "/dist/MediaApp.js",
    mode: 'development',
    output: { path: path.resolve(__dirname, "dist"), filename: "main.js", },
    target: "web",
    devServer: {
        port: "9503",
        static: ["./public"],
        open: true,
        hot: true,
        liveReload: true,
        historyApiFallback: true,
        https: {
            key: path.join(__dirname, 'ssl', 'server.key'),
            cert: path.join(__dirname, 'ssl', 'server.crt'),
        }
    },
    module: {
        rules: [
            {
                test: /\.m?js/,
                resolve: {
                    fullySpecified: false,
                },
            },
            {
                test: /\.(js|jsx)$/,
                exclude: /node_modules/,
                use: {
                    loader: "babel-loader",
                    options: {
                        presets: ["@babel/preset-env", "@babel/preset-react"],
                    },
                },
            },
            {
                test: /\.css$/i,
                use: ["style-loader", "css-loader"],
            },
            {
                test: /\.(png|jpg|jpeg|gif|svg)$/,
                use: [
                    {
                        loader: 'file-loader',
                        options: {
                            name: '[name].[ext]',
                            outputPath: 'img/',
                        },
                    },
                ],
            },
        ],
    },
    resolve: {
        fallback: {
            buffer: require.resolve('buffer/'),
            url: require.resolve("url/"),
            assert: require.resolve("assert/"),
        },
    },
    plugins: [
    ],
    experiments: {
        asyncWebAssembly: true,
        syncWebAssembly: true
    },
};