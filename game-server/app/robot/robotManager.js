/**
 * Created by jiasheng on 2016/10/9.
 */

var area = require('../models/area');
var http = require('http');
var Player = require('../models/player');
var dataApi = require('../util/dataApi');
var qs = require('querystring');
var utils = require('../util/utils');
var Path  = require('../models/path');

var robotManager = function(opts){
    this.tick = TICK_COUNT;
};

var robotEnabled = true;

var path = null;

var robotsLife = {};

var pro = robotManager.prototype;

var MIN_PLAYER_COUNT = 5;

var TICK_COUNT = 50;

var ROBOT_MAX_TIME = 120;

var ROBOT_MIN_TIME = 60;

var ROBOT_MOVE_INTERVAL = 10;

var WEB_SERVER_HOST = 'stage.yunyunlive.cn';

var WEB_SERVER_PATH = '/api/v2/online/robots';


pro.update = function (){
    if(!robotEnabled)
        return;

    if(this.tick >0)
    {
        this.tick--;
        return;
    }

    this.tick = TICK_COUNT;

    pro.LeaveRobots();

    pro.MoveRobots();

    var players = area.getAllPlayers();

    if(players.length < MIN_PLAYER_COUNT)
    {
        var robots = players.filter(function(v){ return v.serverId == 0 });
        pro.AddNewRobots(robots);
    }
}

pro.LeaveRobots = function()
{
    var time = Date.now() / 1000;
    for (var id in robotsLife) {
        if(robotsLife[id].leaveTime < time)
        {
            delete robotsLife[id];
            area.removePlayer(id);
            return;
        }
    }
}

pro.addRobots = function (robots)
{
    var time = Date.now() / 1000;
    for (var i = 0; i < robots.length; i++) {
        var role = dataApi.role.random();
        var playerId = robots[i].id;
        var name = robots[i].name;
        var player = new Player({id: playerId, name: name, kindId: role.id, userId: playerId});
        player.serverId = 0;
        area.addEntity(player);
        var leaveTime = time + Math.random() *(ROBOT_MAX_TIME- ROBOT_MIN_TIME) + ROBOT_MIN_TIME;
        var moveTime = time + Math.random() * 30 + ROBOT_MOVE_INTERVAL;
        robotsLife[playerId] = {leaveTime:leaveTime, moveTime: moveTime};
    }
}

pro.MoveRobots = function ()
{
    var time = Date.now() / 1000;
    for (var id in robotsLife) {
        if(robotsLife[id].moveTime < time)
        {
            var player = area.getPlayer(id);
            var endPos = Path.getRandomPosition();
            var pathRoute = Path.getPath(player.getPos(), endPos);

            area.getChannel().pushMessage({route: 'onMove', entityId: player.entityId, path: pathRoute, userId: player.userId, name: player.name});
            robotsLife[id].moveTime =  time + Math.random() * 30 + ROBOT_MOVE_INTERVAL;
        }
    }
}


pro.AddNewRobots = function (robots)
{
    var robotIds = [];

    if(robots.length > 0)
    {
        robotIds = robots.map(function(obj){return obj.id});
    }

    var post_data = qs.stringify(
        {
            count:1,
            robots : JSON.stringify(robotIds)
        }
    );

    var post_options = {
        host: WEB_SERVER_HOST,
        port: '80',
        path: WEB_SERVER_PATH,
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': post_data.length
        }
    };

    var req = http.request(post_options, function (res) {
        if (res.statusCode == 200) {
            var body = "";
            res.on('data', function (data) { body += data; })
                .on('end', function ()
                {
                    var newRobots = JSON.parse(body);
                    pro.addRobots(newRobots);
                });
        }
    });

    req.write(post_data);
    req.end();
}


module.exports = robotManager;