var express = require("express");
var app = express();
require('dotenv').config();
// ... your other express middleware like body-parser
const port = process.env.SERVER_PORT;
const connectionString =
			'mongodb://' +
			process.env.MONGO_USER +
			':' +
			process.env.MONGO_PASS +
			'@' +
			process.env.MONGO_HOST +
			':' +
			process.env.MONGO_PORT +
			'/agenda?authMechanism=DEFAULT&authSource=admin'; //'mongodb://127.0.0.1/agenda';
var Agenda = require("agenda");
var Agendash = require("agendash");

var agenda = new Agenda({ db: { address: connectionString } });

app.use("/dash", Agendash(agenda));

app.listen(port, () => {
  console.log(`App listening at http://localhost:${port}/dash`)
})
