'use strict';
require('dotenv').config();
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy; // Importa a estratégia local
const { ObjectID } = require('mongodb');
const myDB = require('./connection');
const fccTesting = require('./freeCodeCamp/fcctesting.js');

const app = express();

fccTesting(app); // For FCC testing purposes

// Middleware para servir arquivos estáticos
app.use('/public', express.static(process.cwd() + '/public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configuração da sessão
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: true,
  saveUninitialized: true,
  cookie: { secure: false }
}));

// Inicialização do Passport
app.use(passport.initialize());
app.use(passport.session());

// Configuração do Pug como mecanismo de visualização
app.set('view engine', 'pug');
app.set('views', './views/pug');

// Conexão ao banco de dados e configuração de rotas
myDB(async client => {
  const myDataBase = await client.db('database').collection('users');

  // Definição da estratégia local
  passport.use(new LocalStrategy((username, password, done) => {
    myDataBase.findOne({ username: username }, (err, user) => {
      console.log(`User ${username} attempted to log in.`);
      if (err) return done(err);
      if (!user) return done(null, false); // Usuário não encontrado
      if (password !== user.password) return done(null, false); // Senha incorreta
      return done(null, user); // Sucesso no login
    });
  }));

  // Serialização do usuário
  passport.serializeUser((user, done) => {
    done(null, user._id);
  });

  // Desserialização do usuário
  passport.deserializeUser((id, done) => {
    myDataBase.findOne({ _id: new ObjectID(id) }, (err, doc) => {
      if (err) return done(err);
      done(null, doc);
    });
  });

  // Rotas principais
  app.route('/').get((req, res) => {
    res.render('index', {
      title: 'Connected to Database',
      message: 'Please login'
    });
  });

  // Rota de login (POST)
  app.route('/login').post(passport.authenticate('local', {
    successRedirect: '/profile', // Redireciona para a página de perfil em caso de sucesso
    failureRedirect: '/', // Redireciona para a página inicial em caso de falha
    failureFlash: false
  }));

  // Rota de perfil do usuário
  app.route('/profile').get((req, res) => {
    if (!req.isAuthenticated()) {
      return res.redirect('/');
    }
    res.render('profile', {
      title: 'Profile',
      user: req.user
    });
  });

}).catch(e => {
  app.route('/').get((req, res) => {
    res.render('index', { title: e, message: 'Unable to connect to database' });
  });
});

// Inicia o servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('Listening on port ' + PORT);
});
