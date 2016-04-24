/**
 * Ultra-basic ExpressJS server illustrating login via POST form.
 * Using Express 4.x. Static pages with no template engine.
 * The Process:
 * Ajax login form loaded
 * On submit, login is tested
 * Links
 * @link http://www.codexpedia.com/node-js/a-very-basic-session-auth-in-node-js-with-express-js/
 * express-session
 * @link https://www.npmjs.com/package/express-session
 */
var port       = 3000;
var express    = require("express"); // web server
var session    = require("express-session"); // session (cookie) management
var bodyParser = require("body-parser"); // read POST data
var urlencodedBodyParser = bodyParser.urlencoded({ extended: false });
var jsonParser = bodyParser.json({ type: 'application/*+json' }); // read JSON data

var serialize = require("node-serialize");

// Add server modules.
var app = express();
app.use(jsonParser);
app.use(urlencodedBodyParser);
app.use(session({
  // express-session uses uid-safe to generate a UID for the session
  secret: '2sDk-3Lsj-JP389s',
  resave: true,
  saveUninitialized: false, // appropriate for logins
  cookie: { secure: false } // won't work if true!
}));

/*
 * We don't have a real database here, so use a local JS object
 * to validate the typee-in usernames and passwords.
 */
 var db = [
   {
     "username": "bob",
     "password": "blaster"
   },
   {
     "username": "amy",
     "password": "seams"
   }
 ];

var database = (function () {
  var db = [
    {
      "username": "bob",
      "password": "blaster"
    },
    {
      "username": "amy",
      "password": "seams"
    }
  ];

  function checkLogin (username, password) {
    for(var i = 0; i < db.length; i++) {
      if(db[i].username === username &&
        db[i].password === password) {
        return true;
      } else {
        return false;
      }
    } // end of loop.
  };

  return {
    checkLogin: checkLogin
  };

})();


// Session authentication middleware. A real app would call a database.
var sessauth = function (req, res, next) {
  console.log("in session auth");
  console.log("req.session:" + req.session);
  console.log("req.session.views:" + req.session.views);
  console.log("req.session:" + req.session.username);
  //return res.send(serialize.serialize(req.session)); ////////////////////////////
  if(req.session && req.session.username) {
    // Check the dummy database.
    console.log("session username set to:" + req.session.username);
    if(database.checkLogin(req.session.username, req.session.password)) {
      return next();
    } else {
      console.log("invalid username:" + req.session.username);
      return res.sendFile(__dirname + '/login.html');
    }
  } else {
    // User is undefined in session.
    return res.sendFile(__dirname + '/register.html'); //user not defined, register them.
  }
};

/*
 *******************************************
 * Set up GET route middleware. Supports
 * - home page
 * - login page
 * - members_only content page
 *******************************************
*/

 app.use('/styles', express.static(__dirname + '/css'));

// Home page. Visible when first accessing the site.
app.get('/', function (req, res) {
  res.sendFile(__dirname + "/index.html");
});

// Login page. Not visible when logged-in.
app.get('/login', function (req, res) {
  console.log("loading login page");
  res.sendFile(__dirname + "/login.html");
});

// User clicked login link. Kill the session variable, re-enabling the home page login.
app.get('/logout', function (req, res) {
  console.log("logging out");
  req.session.destroy();
  //res.send("logout success");
  res.sendFile(__dirname + "/index.html")
});

/*
 * If logged in with a session, send private page members_only.html.
* NOTE: we call 'sessauth' function to see if there is a valid session present.
* NOTE: 'sessauth' returns a page or error code, and exits, if there is no valid session.
*/
app.get('/content', sessauth, function (req, res, next) {
  console.log("logged-in, sending to members-only page");
  var sess = req.session;
  if (sess.views) {
    sess.views++;
  } else {
    sess.views = 1;
  }
  console.log("session views:" + sess.views);
  //res.send("access to members_only content");
  res.sendFile(__dirname + "/members_only.html");
});

/*
 *******************************************
 * POST middleware.
 * Session-based login after the typed-in username and
 * password are compared to a (dummy) database.
 *******************************************
 */

/*
 * Do the login. Note that this function does not return a file, only status message.
 * NOTE: assumed this was called with client-side Ajax, which redirects on success.
 * NOTE: the server does NOT send back a file or HTML.
 */
app.post('/login', function (req, res) {
  console.log("attempting login with user credentials");
  if (!req.body || req.body.length === 0) {
    console.log("request body not found");
    return res.sendStatus(400);
  } else {
    if (!req.body.username) {
      res.send("No username");
    } else if (!req.body.password) {
      res.send("No password");
    }
  }
  console.log("logging in with username:" + req.body.username + " and password:" + req.body.password);

  // Save the session (used in 'auth' function later).
  req.session.username = req.body.username;
  req.session.password = req.body.password;
  //return res.send(serialize.serialize(req.session)); ////////////////////////////
  if(!database.checkLogin(req.body.username, req.body.password)) {
    res.send(res.status("bad username or password").jsonp({success: false, username: req.body.username}));
  }

  req.session.save(function (err) {
    console.log("session.save() error:" + err);
  });
  // fire the redirect.
  res.send(res.status("session set with provided username and password.").jsonp({success: true})); //or res.send or res.json
});

// Set the server port.
app.set('port', process.env.PORT || port);

// Start the server.
app.listen(port, function () {
  console.log("Express server started at port:" + port);
});
