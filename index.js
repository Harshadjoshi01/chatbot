const express = require('express');
const app = express();
const server = require('http').Server(app);
const io = require('socket.io')(server, {cors: {origin: '*'}});
const {NlpManager}  = require('node-nlp');
var sql = require('mssql');
var SqlString = require('sqlstring');

app.use(express.static('public'))
app.use(express.urlencoded({extended: true}))
app.set('view engine', 'ejs');


const config = {
    server: DATABASE_SERVER,
    user: DATABASE_USER,
    password: DATABASE_PASSWORD,
    database: DATABASE_NAME,
    port: 14251,
    options: {
      encrypt: false // Use this if you're on Windows Azure
    }
  }
  
  
  const poolPromise = new sql.ConnectionPool(config)
    .connect()
    .then(pool => {
      console.log('Connected to MSSQL')
      return pool
    })
    .catch(err => console.log('Database Connection Failed! Bad Config: ', err))
  
  
  var executeMsSQLQuery = async (sqlquery, successCallback, failedCallback) => {
      try {
          const pool = await poolPromise
          const result = await pool.request()
              .query(sqlquery)
  
          successCallback(result.recordsets[0]);
      } catch (err) {
          failedCallback(err);
      }
  }


var manager = new NlpManager({ languages: ['en'], ner: { useDuckling: true }});
app.use( express.static(__dirname) );
//train the chatbot
const allchats = {};
const admins = [];
async function trainbot(manager){
manager.addDocument('en', 'hello', 'greetings.hello');
manager.addDocument('en', 'hi there', 'greetings.hello');
manager.addDocument('en', 'hello', 'greetings.hello');
manager.addDocument('en', 'howdy', 'greetings.hello');
manager.addDocument('en', 'hiya', 'greetings.hello');
manager.addDocument('en', 'hi-ya', 'greetings.hello');
manager.addDocument('en', 'howdy-do', 'greetings.hello');
manager.addDocument('en', 'aloha', 'greetings.hello');
manager.addDocument('en', 'hey', 'greetings.hello');

manager.addDocument('en', "How are you", 'user.asking');
manager.addDocument('en', "How are you doing", 'user.asking');
manager.addDocument('en', "How are you doing today", 'user.asking');

manager.addDocument('en', "I'm fine", 'user.replying');
manager.addDocument('en', "I'm good", 'user.replying');
manager.addDocument('en', "I'm doing good", 'user.replying');
manager.addDocument('en', "I'm doing great", 'user.replying');
manager.addDocument('en', "I'm doing well", 'user.replying');
manager.addDocument('en', "I'm doing alright", 'user.replying');


manager.addDocument('en', 'goodbye for now', 'greetings.bye');
manager.addDocument('en', 'bye bye take care', 'greetings.bye');
manager.addDocument('en', 'okay see you later', 'greetings.bye');
manager.addDocument('en', 'bye for now', 'greetings.bye');
manager.addDocument('en', 'i must go', 'greetings.bye');


manager.addDocument('en', 'good day', 'greetings.goodDay');
manager.addDocument('en', 'good night', 'greetings.goodNight');
manager.addDocument('en', 'good morning', 'greetings.goodMorning');
manager.addDocument('en', 'good evening', 'greetings.goodevening');
manager.addDocument('en', 'good afternoon', 'greetings.goodafternoon');

manager.addDocument('en', "my name is ", 'user.details');

manager.addDocument('en', 'my phone number is 7894561230', 'user.mobile');
manager.addDocument('en', 'my mobile number is 2134567895', 'user.mobile');
manager.addDocument('en', 'my num is 2134567895', 'user.mobile');
manager.addDocument('en', 'my number is 2134567895', 'user.mobile');


manager.addDocument('en', "What is your you name details ?", 'my.name');
manager.addDocument('en', "How shall I call you ?", 'my.name');
manager.addDocument('en', "Where do you live ?", 'my.address');
manager.addDocument('en', "Who are you", 'my.me');

//***********************************************************************************//
//************************************************************************************//
//************************************************************************************//
//************************************************************************************//
//************************************************************************************//
//************************************************************************************//
//************************************************************************************//
// Train also the NLG..........Train it to answer
manager.addAnswer('en', 'greetings.hello', 'Hey there!');
manager.addAnswer('en', 'greetings.hello', 'Hey buddy!');

manager.addAnswer('en', 'user.asking', 'I am doing good! what about you?');
manager.addAnswer('en', 'user.replying', 'Nice to Know :) How can I help you ?');

manager.addAnswer('en', 'greetings.goodNight', 'Good Night.');
manager.addAnswer('en', 'greetings.goodDay', 'Good Day!');
manager.addAnswer('en', 'greetings.goodMorning', 'Have a very happy Morning!');
manager.addAnswer('en', 'greetings.goodevening', 'Good evening.');
manager.addAnswer('en', 'greetings.goodafternoon', 'Good afternoon.');

manager.addAnswer('en', 'user.details', 'Nice to know that!');
manager.addAnswer('en', 'user.mobile', 'Thank you for your mobile num!');
manager.addAnswer('en', 'user.mobile', 'We will call you soon');


manager.addAnswer('en', 'my.name', 'You can call me Sam');
manager.addAnswer('en', 'my.name', 'I prefer to be called Phil :)');
manager.addAnswer('en', 'my.address', 'I live in this beautiful world created by nature');
manager.addAnswer('en', 'my.me', 'I am a friend of yours.');

manager.addAnswer('en', 'greetings.bye', 'Till next time :)');
manager.addAnswer('en', 'greetings.bye', 'see you soon!');

await manager.train();
manager.save();
}
trainbot(manager);

async function botstr(findStr){
      var response = await manager.process('en', findStr);
      return response.answer;
}

app.get('/', function(req, res){
    res.render('chatbot', {admins: admins});
});
io.on('connection', (socket) => {
    socket.on('user-info', (data) => {
        console.log('a user connected'); 
        allchats[socket.id] = {}
        allchats[socket.id].chat = []
        allchats[socket.id].chating_with_bot = true
        allchats[socket.id].name = data.name;
        allchats[socket.id].email = data.email;
        allchats[socket.id].occupation = data.occupation; 
    })
    socket.on('userinput', (message) => {
        if(allchats[socket.id].chating_with_bot) {
            allchats[socket.id].chat.push(allchats[socket.id].name +" : " + message)
            botstr(message)
                .then(function(result){
                        if(result == null){
                            allchats[socket.id].chat.push("Bot : " + "Sorry I didn't get you")
                            socket.emit('botreply', "Sorry I didn't get you")
                        } else {
                            allchats[socket.id].chat.push("Bot : " + result)
                            socket.emit('botreply', result)
                        }
                });
        } else {
            allchats[socket.id].chat.push(allchats[socket.id].name +" : " + message)
            socket.emit('usertoadmin', message);
        }

    });
    socket.on('adminconnect',() => {
        console.log('admin connected');
        admins.push(socket.id);
        socket.emit('adminconnect', {id:socket.id});
    })
    socket.on('userreqtoadmin',(data) => {
        console.log('user request to admin');
        io.to(data.id ).emit('letstalktoadmin', {id:socket.id, name:allchats[socket.id].name, email:allchats[socket.id].email, occupation:allchats[socket.id].occupation});
    })
    socket.on('adminreply',(data) => {
        allchats[data.userid].chat.push("Admin : " + data.adminreply);
        io.to(data.userid).emit('botreply', data.adminreply);
    });
    socket.on('stopbot', (id) => {
        allchats[id].chating_with_bot = false;
    })
    socket.on('disconnect', async () => {
        if(allchats.hasOwnProperty(socket.id)){
            let chat = ""
            for(let i = 0; i < allchats[socket.id].chat.length; i++){
              chat += allchats[socket.id].chat[i] + '\n';
            }
            var sqlquery = SqlString.format(`INSERT INTO chats(chatId, chat, chatCreated, userName, Email, occupation) values(?,?,?,?,?,?)`,[socket.id, chat, new Date(), allchats[socket.id].name, allchats[socket.id].email, allchats[socket.id].occupation]);
            await executeMsSQLQuery(sqlquery, (result) => {
              console.log("Chat added succesfully!");
            }, (err) => {
              console.log(err);
            });
            delete allchats[socket.id];
            console.log('user disconnected');
        } else if(admins.includes(socket.id)){
            console.log("Admin Disconnected");
            admins.splice(admins.indexOf(socket.id), 1);
        } else {
            console.log("Unknown user disconnected");
        }
    })
});

app.get("/admin/:id", (req, res) => {
    res.render("showchat", {id: String(req.params.id), chat: allchats[req.params.id].chat, name: allchats[req.params.id].name, email: allchats[req.params.id].email, occupation: allchats[req.params.id].occupation});
})
app.get("/admin", (req, res) => {
    var sqlquery = SqlString.format(`SELECT * FROM chats`);
    executeMsSQLQuery(sqlquery, (result) => {
        res.render("admin",{allchats: allchats, chats: result});
    });
})
app.get("/admin/seechat/:id", (req, res) => {
    var id = req.params.id;
    var sqlquery = SqlString.format(`SELECT * FROM chats WHERE chatId = ?`,[id]);
    executeMsSQLQuery(sqlquery, (result) => {
        res.render("seechat",{id: String(id), chat: result[0].chat, name: result[0].userName, email: result[0].Email, occupation: result[0].occupation});
    });

});
server.listen(3000, () => {
    console.log("Server started on port 3000")
});