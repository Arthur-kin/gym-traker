import rateLimit from 'express-rate-limit';

// General API rate limiter (200 requests per 15 mins per IP)
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  message: { error: 'Too many requests from this IP, please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Stricter rate limiter for AI endpoints (10 requests per 5 mins per IP)
export const aiLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10,
  message: { error: 'AI limit reached. Please try again after 5 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});
