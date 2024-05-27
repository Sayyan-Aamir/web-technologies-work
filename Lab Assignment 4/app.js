const express = require("express");
const path = require('path');
const bodyParser = require('body-parser');
const session = require("express-session");
const { MongoClient, ObjectId  } = require('mongodb');
let newSessionDetails = [];

// JWT Token
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const secretKey = 'TraWell, Sayyan this is a secret key';

app.use(session({
  secret: "My Secret Key Yesh",
  resave: false,
  saveUninitialized: true
}));
// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Connection URL
const url = 'mongodb://127.0.0.1:27017';
const database = 'Trawell';
const client = new MongoClient(url, { useNewUrlParser: true, useUnifiedTopology: true });

// Middleware to connect to MongoDB
async function connectToDatabase() {
  try {
    await client.connect();
    console.log('Connected successfully to server');
  } catch (error) {
    console.error('An error occurred while connecting to MongoDB:', error);
  }
}
connectToDatabase();

app.post('/submit-booking', async (req, res) => {
  try {
    const db = client.db(database);
    const collection = db.collection('Bookings');
    const newBooking = {
      name: req.body.name,
      numPeople: req.body.numPeople,
      place: req.body.place,
      fromDate: new Date(req.body.fromDate),
      toDate: new Date(req.body.toDate)
    };
    
    await collection.insertOne(newBooking);
    res.redirect('/');

  } catch (err) {
    res.status(500).send('Error saving booking to database.');
  }
});

app.post('/login-user', async (req, res) => {
  try {
    const db = client.db(database);
    const collection = db.collection('User');
    const user = await collection.findOne({ Email: req.body.Email });

    if (!user) {
      return res.redirect('/loginPage?error=User does not exist');
    }

    if (req.body.Password == user.Password) {
      const token = jwt.sign({ userId: user._id, email: user.Email }, secretKey, { expiresIn: '1h' });
      res.cookie('token', token, { httpOnly: true });

      res.redirect('/placeListPage');
    }

  } catch (err) {
    res.status(500).send('Error logging in.');
  }
});

app.post('/addnew-tour', async (req, res) => {
  try {
    const db = client.db(database);
    const collection = db.collection('PlaceList');
    
    const newTour = {
      PlaceNames: req.body.Place,
      CountryNames: req.body.countryName,
      Image: null
    };
    
    await collection.insertOne(newTour);
    res.redirect('/placeListPage');

  } catch (err) {
    res.status(500).send('Error logging in.');
  }
});

app.post('/update-place', async (req, res) => {
  try {
    const db = client.db(database);
    const collection = db.collection('PlaceList');
    const { placeId, placeName, countryName } = req.body;
    await collection.updateOne(
      { _id: new ObjectId(placeId) },
      { $set: { PlaceNames: placeName, CountryNames: countryName } }
    );
    res.sendStatus(200);
  } catch (err) {
    console.error('Error updating place:', err);
    res.status(500).send('Error updating place.');
  }
});

// Handle Delete Tour
app.post('/delete-tour/:tourId', async (req, res) => {
  try {
    const db = client.db(database);
    const collection = db.collection('PlaceList');
    const { tourId } = req.params;

    await collection.deleteOne({ _id: new ObjectId(tourId) });
    res.redirect('/placeListPage');
  } catch (err) {
    console.error('Error deleting tour:', err);
    res.status(500).send('Error deleting tour.');
  }
});

// Update Tour
app.get('/get-place/:id', async (req, res) => {
  try {
    const db = client.db(database);
    const collection = db.collection('PlaceList');
    const place = await collection.findOne({ _id: new ObjectId(req.params.id) });
    res.json(place);
  } catch (err) {
    console.error('Error fetching place:', err);
    res.status(500).send('Error fetching place.');
  }
});


app.post('/register-user', async (req, res) => {
  try {
    const db = client.db(database);
    const collection = db.collection('User');
    const newUser = {
      Email: req.body.Email,
      Password: req.body.Password,
      IsDeleted: Boolean(false)
    };
    
    if (req.body.Password === req.body.ConfirmPassword) {
      await collection.insertOne(newUser);
    }
    else{
      return res.redirect('/loginPage?error=Invalid password');
    }

  } catch (err) {
    res.status(500).send('Error saving User to database.');
  }
});



// Function to fetch data
async function getData() {
  try {
    const db = client.db(database);
    const collection = db.collection('PlaceList');
    const response = await collection.find({}).toArray();
    return response;
  } catch (error) {
    console.error('An error occurred while connecting to MongoDB:', error);
  }
}

// EJS setup
app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname)));
app.use(express.static("public"));
app.use('/fontawesome', express.static(path.join(__dirname, 'node_modules', '@fortawesome', 'fontawesome-free')));

// Routes
app.get("/", (req, res) =>{
    res.render("landingPage");
});

app.get("/register", (req, res) =>{
  res.render("register");
});

app.get("/addPackage", (req, res) =>{
  res.render("addPackage");
});

app.get("/loginPage", (req, res) =>{
    res.render("loginPage");
});

app.get("/packageList", (req, res) =>{
  res.render("packageList");
});

app.get("/addTour", async (req, res) => {
  try {
    const products = await getData();
    res.render("addTour", { products });
  } catch (error) {
    console.error('Error retrieving data:', error);
    res.status(500).send('Error retrieving data');
  }
});

app.get("/placeListPage", async (req, res) => {
  try {
    const products = await getData();
    const total = products.length;
    const searchQuery = req.session.searchQuery || '';
    console.log('searchQuery', searchQuery);
    res.render("placeListPage", { products, total, searchQuery });
  } catch (error) {
    console.error('Error retrieving data:', error);
    res.status(500).send('Error retrieving data');
  }
});

app.get("/extra", (req, res) => {

  const searchQuery = req.session.searchQuery || 'No search query set';
  console.log('Session data:', searchQuery);
  res.render("extra", { searchQuery });
});

app.post("/submit-search", (req, res) => {
  req.session.searchQuery = req.body.searchQuery;
  newSessionDetails = [req.body.searchQuery]; 
  console.log(newSessionDetails,'newSessionDetails');
  res.redirect("/placeListPage");
});

app.get("/addPlace", (req, res) =>{
  res.render("addPlace");
});

app.get("/ContactUs", (req, res) =>{
  res.render("ContactUs");
});

app.get("/AboutUs", (req, res) =>{
  res.render("AboutUs");
});


app.listen(3000, () => {
    console.log("Server is running on port 3000");
});
