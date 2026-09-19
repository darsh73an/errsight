import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';

const router = Router();

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }

  const existing = await User.findOne({ where: { email } });  // await stops in this line until the query is executed
  if (existing) {
    return res.status(409).json({ error: 'Email already exists' });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({ email, passwordHash });

  const token = jwt.sign(
    { id: user.id, email: user.email },
    process.env.JWT_SECRET!,
    { expiresIn: '7d' }
  );

  res.status(201).json({ token, user: { id: user.id, email: user.email } });
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ where: { email } });
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = jwt.sign(
    { id: user.id, email: user.email },
    process.env.JWT_SECRET!,
    { expiresIn: '7d' }
  );

  res.json({ token, user: { id: user.id, email: user.email } });
});

export default router;

// | Route                          | What it does             | Who calls it |
// | ------------------------------ | ------------------------ | ------------ |
// | `POST /api/ingest`             | Receives errors from SDK | Your JS SDK  |
// | `POST /api/auth/register`      | Create account           | Dashboard    |
// | `POST /api/auth/login`         | Get JWT token            | Dashboard    |
// | `GET /api/projects`            | List user's projects     | Dashboard    |
// | `POST /api/projects`           | Create new project       | Dashboard    |
// | `GET /api/projects/:id/errors` | List error groups        | Dashboard    |
// | `GET /api/errors/:id`          | Group details + events   | Dashboard    |
// | `POST /api/errors/:id/resolve` | Mark resolved            | Dashboard    |

// const user = await User.findOne(); 
// // code PAUSES on this line until DB query done
// // then 'user' = the result
// console.log(user.email); // works, user is ready
