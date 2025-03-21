import express from 'express';
import bodyParser from 'body-parser';
import handler from './generate-reflections.js';
import cors from 'cors';

const app = express();
app.use(cors({
  origin: 'https://ugood.vercel.app/', 
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  credentials: true,
  
}) );

console.log("CORS enabled for origin: https://ugood.vercel.app/"),
app.use(bodyParser.json());
app.post('/generate-reflections', handler);

const PORT = process.env.PORT ||9999;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);//this is to let us know that server is working

}); 