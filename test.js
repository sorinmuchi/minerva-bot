var express = require('express');
var bodyParser = require('body-parser');
var request = require('request');
var q = require('q');
var minerva_search = require('./plugins').minerva_search;
var fs = require('fs');
var path = require('path');

var app = express();
app.set('port', 5000  );
app.set('ip', '127.0.0.1');


app.use(function(req,res,next){
    var _send = res.send;
    var sent = false;
    res.send = function(data){
        if(sent) return;
        _send.bind(res)(data);
        sent = true;
    };
    next();
});

// Process application/x-www-form-urlencoded
app.use( bodyParser.urlencoded( { extended:false} ) );
app.use( bodyParser.json() );

var contexts = JSON.parse(fs.readFileSync(path.resolve('./', 'history.json'), 'utf8')) || {};


function get_or_create_context(user){
	if(!contexts[user]){
		contexts[user] = {extracted:[]};
	} 
	return contexts[user];
}

app.get('/', function(req, res){
	if(!req.query['query'] || !req.query['user']){
		res.send({error:'query or user not supplied'});
	}

	// extract user and query
	var query = req.query['query'];
	var user = req.query['user'];

	// plugins to be executed
	var to_execute = [ minerva_search ]
	
	// obtain a context
	var history = get_or_create_context(user);
	
	context = {
		history: history,
		current_query: query,
		completed: false,
		replies:[]
	}
	
	to_execute.reduce(q.when, q(context)).then(function(ctx){
		// ctx.history.past_queries.push(ctx.current_query);
		res.send({global_context:contexts,local_context:ctx});
	}).catch(function(err){
		console.log(err)
		res.send({error:err});
	});

});
app.get('/dump_history/', function(req, res){
	// dumps all user contexts to the file system and out
	var contexts_string = JSON.stringify({contexts:contexts});
	
	fs.writeFile('./history.json', contexts_string, function (err) {
		if (err) throw err;
		// console.log('It\'s saved!');
	});

	res.send({contexts:contexts});
		
});


app.listen( app.get('port'), app.get('ip'), function() {
	console.log('listening on', app.get('ip'), ' on port ', app.get('port') );
});
