// pages/api/health.js — Health check endpoint

export default function handler(req, res) {
  const status = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    apis: {
      attom: !!process.env.ATTOM_API_KEY,
      rentcast: !!process.env.RENTCAST_API_KEY,
    },
  };
  return res.status(200).json(status);
}
