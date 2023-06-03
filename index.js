const express = require('express')
const app = express()
const cors = require('cors')
const mySecret = process.env['MONGO_URI']
const Mongoose = require('mongoose')
const bodyParser = require('body-parser')
require('dotenv').config()
Mongoose.connect(mySecret, { 
  useNewUrlParser: true, 
  useUnifiedTopology: true 
})
app.use(cors())
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

const userSchema = new Mongoose.Schema({
  username: {type: String, required: true},
  count: {type: Number},
  _id: {type: Mongoose.Schema.Types.ObjectId, default: Mongoose.Types.ObjectId },
  log: [{
    description: {type: String},
    duration: {type: Number},
    date: {type: Date }
  }]
})

const User = Mongoose.model("User", userSchema)

app.post("/api/users", async (req, res) => {
  try { 
    const { username } = req.body;
    const user = new User({ username });
    await user.save();
    res.json({ username: user.username, _id: user._id });
  } catch(error) {
    res.json({ error: 'Internal server error' });
  }
});

app.get("/api/users", async (req, res) => {
  try {
    const users = await User.find({}).select('username _id').exec();
    res.json(users);
  } catch (error) {
    res.json({ error: 'Internal server error' });
  }
});

app.post("/api/users/:_id/exercises", async (req, res) => {
  try {
    const { _id } = req.params;
    const { description, duration, date } = req.body;
    const dateFilter = date ? new Date(date) : new Date();
    
    const exercise = {
      description,
      duration: parseInt(duration),
      date: dateFilter
    };

        const user = await User.findByIdAndUpdate(
      _id,
      { $push: { log: exercise } },
      { new: true }
    ).select('username _id');

    const responseObj = {
      username: user.username,
      description: exercise.description,
      duration: exercise.duration,
      date: exercise.date.toDateString(),
      _id: user._id
    };
  
    res.json(responseObj);
    console.log(responseObj)
  } catch (error) {
    res.json('Internal server error');
    console.log(error)
  }
});

app.get("/api/users/:_id/logs", async (req, res) => {
  try {
    const { _id } = req.params;
    const { from, to, limit } = req.query;

    const user = await User.findById(_id);
   let logFilter = user.log;

    if (from) {
      const fromDate = new Date(from);
      logFilter = logFilter.filter(
        (exercise) => exercise.date >= fromDate
      );
    }

    if (to) {
      const toDate = new Date(to);
      logFilter = logFilter.filter((exercise) => exercise.date <= toDate);
    }

    if (limit) {
      const limitValue = parseInt(limit);
      logFilter = logFilter.slice(0, limitValue);
    }
    
    const responseObj = {
      _id: user._id,
      username: user.username,
      count: logFilter.length,
      log: logFilter.map((exercise) => ({
        description: exercise.description,
        duration: exercise.duration,
        date: exercise.date.toDateString(),
      })),
    };

    res.json(responseObj);
  } catch (error) {
    res.json({ error: 'Internal server error' });
    console.log(error);
  }
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
