/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "static.alchemyapi.io",
        port: "",
        pathname: "/**",
      },
    ],
  },
  webpack: (config) => {
    // @chainlink/ccip-sdk ships `using` declarations (explicit resource management), which the
    // webpack parser in Next 14 can't read yet. Lower just that syntax, just for that package.
    // Remove this rule once the app is on a Next.js version whose bundler parses `using`.
    config.module.rules.push({
      test: /[\\/]node_modules[\\/]@chainlink[\\/]ccip-sdk[\\/].*\.js$/,
      use: {
        loader: "babel-loader",
        options: {
          babelrc: false,
          configFile: false,
          plugins: ["@babel/plugin-transform-explicit-resource-management"],
        },
      },
    });
    return config;
  },
};

export default nextConfig;
