module.exports = (req, res) => {
  res.status(200).json({ 
    message: 'Hello from Vercel!',
    method: req.method,
    url: req.url
  });
};
