const passport = require('passport');

function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect('/');
}

module.exports = function (app, myDataBase) {
  app.route('/').get((req, res) => {
    res.render('index', {
      title: 'Connected to Database',
      message: 'Please login or register',
      showLogin: true,
      showRegistration: true,
      showSocialAuth: true, // Exibe a opção de autenticação social (GitHub)
    });
  });

  // Rota de login tradicional
  app.route('/login').post(
    passport.authenticate('local', { failureRedirect: '/' }),
    (req, res) => {
      res.redirect('/profile');
    }
  );

  // Rota de registro
  app.route('/register').post((req, res, next) => {
    myDataBase.findOne({ username: req.body.username }, (err, user) => {
      if (err) {
        next(err);
      } else if (user) {
        res.redirect('/');
      } else {
        const bcrypt = require('bcrypt');
        const hash = bcrypt.hashSync(req.body.password, 12);
        myDataBase.insertOne(
          { username: req.body.username, password: hash },
          (err, doc) => {
            if (err) {
              res.redirect('/');
            } else {
              next(null, doc.ops[0]);
            }
          }
        );
      }
    });
  },
    passport.authenticate('local', { failureRedirect: '/' }),
    (req, res) => {
      res.redirect('/profile');
    });

  // Rota do perfil (protegida)
  app.route('/profile').get(ensureAuthenticated, (req, res) => {
    res.render('profile', {
      title: 'Profile',
      username: req.user.username,
    });
  });

  // Rota de logout
  app.route('/logout').get((req, res) => {
    req.logout();
    res.redirect('/');
  });

  // Rota de autenticação com o GitHub
  app.route('/auth/github').get(passport.authenticate('github'));

  // Rota de callback do GitHub
  app.route('/auth/github/callback').get(
    passport.authenticate('github', { failureRedirect: '/' }),
    (req, res) => {
      res.redirect('/profile');
    }
  );
};
