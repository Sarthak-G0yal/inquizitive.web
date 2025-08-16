// import Pg from 'pg';
// import dotenv from 'dotenv';
// import { MongoClient } from 'mongodb';

// dotenv.config();

// const dbConfig = {
//  host: process.env.DATABASE_HOST, // Your RDS endpoint
//   port: process.env.DATABASE_PORT,
//   user: process.env.DATABASE_USER,  // Your username
//   password: process.env.DATABASE_PASSWORD,  // Your password
//   database: process.env.DATABASE_NAME,  // Your database name
//   ssl:false // If using RDS with SSL required, set this to { rejectUnauthorized: false }
// };

// // MongoDB for quizzes and questions
// const mongoClient = new MongoClient(process.env.MONGO_URI, {
//   useNewUrlParser: true,
//   useUnifiedTopology: true,
// });

// let mongoDb;

// mongoClient.connect().then(() => {
//   mongoDb = mongoClient.db('quizdb');
//   console.log('Connected to MongoDB Atlas');
// }).catch(err => console.error('MongoDB connection error:', err));

// // process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
// const db = new Pg.Client(dbConfig);
// // const db = new Pg.Client({
// //   connectionString: 'postgresql://mahesh:i8hW0vNCuZan89BvMbzCAA@droll-egret-5007.7s5.aws-ap-south-1.cockroachlabs.cloud:26257/quiz?sslmode=verify-full',
// //   // ssl: {
// //   //   ca: fs.readFileSync(path.resolve(__dirname, 'path/to/your/cockroachdb-ca.crt')).toString(),
// //   // },
// // });
// //console.log(db)
// try{
//   db.connect()
//   console.log("Connected to PostgreSQL")
// }catch(err){
//   console.log("some error occurs")
// }


// export { db, mongoDb };

import Pg from 'pg';
import dotenv from 'dotenv';
import { MongoClient } from 'mongodb';

dotenv.config();

// PostgreSQL Configuration
const dbConfig = {
  host: process.env.DATABASE_HOST,
  port: process.env.DATABASE_PORT,
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME,
  ssl: false // If using RDS with SSL required, set this to { rejectUnauthorized: false }
};

const db = new Pg.Client(dbConfig);

db.connect()
  .then(() => console.log("✅ Connected to PostgreSQL"))
  .catch((err) => console.error("❌ PostgreSQL connection error:", err));

// MongoDB Atlas Configuration
const mongoClient = new MongoClient(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

let mongoDb;

mongoClient.connect()
  .then(() => {
    mongoDb = mongoClient.db('quizdb');
    console.log("✅ Connected to MongoDB Atlas");
  })
  .catch((err) => console.error("❌ MongoDB connection error:", err));

export { db, mongoDb };
