/** @type {import('next').NextConfig} */
const nextConfig = {
  api: {
    bodyParser: {
      sizeLimit: '10mb' // Increase the limit to 10MB
    },
    responseLimit: '10mb'
  }
}

module.exports = nextConfig 