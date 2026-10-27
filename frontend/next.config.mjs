const backendApiUrl = (process.env.BACKEND_API_URL || 'http://localhost:4000').replace(/\/+$/, '')

export default {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${backendApiUrl}/api/:path*`,
      },
    ]
  },
}
