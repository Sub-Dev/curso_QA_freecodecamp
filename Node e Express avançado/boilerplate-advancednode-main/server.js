require('dotenv').config();
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
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

// Middleware para verificar autenticação
function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next(); // Prossegue para a próxima função se autenticado
  }
  res.redirect('/'); // Redireciona para a página inicial caso não esteja autenticado
}

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

}).catch(e => {
  console.error('Database connection error:', e);
  // Caso a conexão com o banco falhe, renderiza a página inicial com mensagem de erro
  app.route('/').get((req, res) => {
    res.render('index', { title: 'Database Error', message: 'Unable to connect to database' });
  });
});

// Rota principal (/)
app.route('/').get((req, res) => {
  res.render('index', {
    title: 'Connected to Database',
    message: 'Please login',
    showLogin: true // Exibe o formulário de login
  });
});

// Rota de login (POST)
app.route('/login').post(passport.authenticate('local', {
  successRedirect: '/profile', // Redireciona para a página de perfil em caso de sucesso
  failureRedirect: '/', // Redireciona para a página inicial em caso de falha
  failureFlash: false
}));

// Rota de perfil do usuário com o middleware ensureAuthenticated
app.route('/profile').get(ensureAuthenticated, (req, res) => {
  res.render('profile', {
    title: 'Profile',
    username: req.user.username // Passa o nome de usuário para a visualização
  });
});

// Rota de logout
app.route('/logout').get((req, res, next) => {
  console.log('Logout route accessed');
  req.logout();  // Remova o uso do callback assíncrono
  console.log('User logged out successfully');
  res.redirect('/'); // Redireciona para a página inicial após o logout
});

// Middleware para tratar páginas não encontradas (404)
app.use((req, res, next) => {
  res.status(404)
    .type('text')
    .send('Not Found');
});

// Inicia o servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('Listening on port ' + PORT);
});
