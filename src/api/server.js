import express from 'express';
import bodyParser from 'body-parser';
import handler from './generate-reflections.js';
import cors from 'cors';

const app = express();
app.use(cors({
  origin: 'https://ugood.vercel.app', // Adjust this to your frontend URL
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  credentials: true,
}));
app.use(bodyParser.json());
app.post('/generate-reflections', handler);

const PORT = process.env.PORT ||9999;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);//this is to let us know that server is working

}); 