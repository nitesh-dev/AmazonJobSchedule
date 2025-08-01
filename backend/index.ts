import express from 'express';
import { MongoDB } from './mongo';
import cors from 'cors';
const app = express();
const port = 3000;

const mongoDB = new MongoDB();

// Middleware
app.use(express.json());
app.use(cors());

app.get('/', (req, res) => {
  res.send('Hello World!');
});

app.post('/log', async (req, res) => {
  const { sessionTime, data } = req.body;
  let isSaved = await mongoDB.createLog(sessionTime, data);
  if (isSaved) {
    res.status(200).send('Log created successfully');
  } else {
    res.status(500).send('Error creating log');
  }
});
app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
