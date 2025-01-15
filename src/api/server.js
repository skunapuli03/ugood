import express from 'express';
import bodyParser from 'body-parser';
import handler from './generate-reflections.js';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.post('/generate-reflections', handler);

const PORT = 9999;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
}); //this is to let us know that server is working
