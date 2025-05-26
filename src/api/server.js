import express from 'express';
import bodyParser from 'body-parser';
import handler from './generate-reflections.js';
import resourcesHandler from './generate-resources.js';  // Add this import
import cors from 'cors';



const app = express();
app.use(cors({
  origin: [
    'https://ugood.vercel.app', 
    'https://ugood-3osi.onrender.com'
  ],
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  credentials: true,
  
}) );

console.log("CORS enabled for origin: https://ugood.vercel.app, and the render.com one"),
app.use(bodyParser.json());

// Your endpoints
app.post('/generate-reflections', handler);
app.post('/generate-resources', resourcesHandler);  // Add this line

const PORT = process.env.PORT || 9999;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);//this is to let us know that server is working

});