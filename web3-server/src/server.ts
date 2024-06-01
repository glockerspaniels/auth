import express from 'express';
import { Request, Response, NextFunction } from 'express';
import { ethers } from 'ethers';
import jwt, { JwtPayload } from 'jsonwebtoken';
import cors from 'cors';
import crypto from 'crypto';

interface SessionPayload extends JwtPayload {
  userId: string;
}

interface RequestWithSession extends Request {
  session?: SessionPayload;
}

interface NonceStore {
  [address: string]: string;
}

const sessionDuration = 1 * 60;
const secretKey = 'your-secret-key';
const corsOptions = {
  origin: 'http://localhost:5173',
  optionsSuccessStatus: 200,
};
const nonceStore: NonceStore = {};

const app = express();
app.use(express.json());
app.use(cors(corsOptions));

// Middleware
const generateNonce = (): string => {
  return crypto.randomBytes(16).toString('hex');
} 

const verifySignature = (address: string, signature: string, nonce: string): string | null =>  {
  const recoveredAddress = ethers.verifyMessage(nonce, signature);
  if (recoveredAddress.toLowerCase() === address.toLowerCase()) {
    const currentTime = Math.floor(Date.now() / 1000);
    const expirationTime = currentTime + sessionDuration;
    const token = jwt.sign({ address, expiration: expirationTime }, secretKey);

    return token;
  }
  return null;
}

const verifySessionToken = (req: RequestWithSession, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ message: 'Authorization header missing' });
  }

  const [bearer, token] = authHeader.split(' ');
  if (bearer !== 'Bearer' || !token) {
    return res.status(401).json({ message: 'You tryna fux with us?' });
  }

  try {
    const decoded = jwt.verify(token, secretKey) as SessionPayload;

    // Check if the token has expired
    const currentTime = Math.floor(Date.now() / 1000);
    if (decoded.expiration && decoded.expiration < currentTime) {
      return res.status(403).json({ message: 'Session expired' });
    }

    // Store the decoded session data in the request object
    req.session = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ message: 'Invalid token' });
  }
};

// Endpoint to request a nonce
app.post('/nonce', (req: Request, res: Response) => {
  const { address } = req.body;
  const nonce = generateNonce();
  nonceStore[address] = nonce;

  res.json({ nonce });
});

// Endpoint to login
app.post('/login', async (req: Request, res: Response) => {
  const { address, signature, nonce } = req.body;
  const storedNonce = nonceStore[address];

  if (storedNonce === nonce) {
    const token = verifySignature(address, signature, nonce);
    if (token) {
      delete nonceStore[address];

      res.json({ success: true, token });
    } else {
      res.status(401).json({ success: false, error: 'Invalid signature' });
    }
  } else {
    res.status(400).json({ success: false, error: 'Invalid or expired nonce' });
  }
}) 

app.get('/protected', verifySessionToken ,async (req, res) => {
  res.status(200).json({ message: "success!" })
})

app.listen(3000, () => {
  console.log('Server is running on port 5000');
});
