import express from 'express';
import cors from 'cors';
import { prisma } from './prisma';
import { apiLimiter } from './middleware/rateLimiter';

// Import Router modules
import layoutRouter from './routes/layout';
import profileRouter from './routes/profile';
import goalsRouter from './routes/goals';
import logsRouter from './routes/logs';

const app = express();
const PORT = process.env.PORT || 5000;

// CORS setup
const allowedOrigin = process.env.FRONTEND_ORIGIN || 'http://localhost:8085';
app.use(cors({
  origin: allowedOrigin,
  credentials: true
}));

// Body parser middleware
app.use(express.json());

// Global API Rate Limiter
app.use('/api/', apiLimiter);

// Mount Modular Routers
app.use('/api/layout', layoutRouter);
app.use('/api/profile', profileRouter);
app.use('/api/goals', goalsRouter);
app.use('/api/logs', logsRouter);

// Start Server and initialize default layout if needed
app.listen(PORT, async () => {
  console.log(`[Gym Server] Backend running on port ${PORT}`);
  try {
    let defaultLayout = await prisma.gymLayout.findFirst();
    if (!defaultLayout) {
      defaultLayout = await prisma.gymLayout.create({
        data: {
          name: 'My Home Gym',
          width: 10,
          height: 10,
        }
      });
    }
    console.log(`[Gym Server] Active Gym Layout: "${defaultLayout.name}" (${defaultLayout.width}x${defaultLayout.height})`);
  } catch (err) {
    console.error('[Gym Server] Failed to initialize default gym layout:', err);
  }
});
