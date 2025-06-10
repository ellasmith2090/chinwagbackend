//midleware/authMiddleware.js

const jwt = require('jsonwebtoken')

// Replace this with your actual secret key logic if stored elsewhere
const secret = process.env.ACCESS_TOKEN_SECRET || 'your-fallback-secret'

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1]

  if (!token) {
    return res.status(401).json({ message: 'No token provided' })
  }

  jwt.verify(token, secret, (err, user) => {
    if (err) return res.status(403).json({ message: 'Invalid or expired token' })
    req.user = user
    next()
  })
}


module.exports = authenticateToken
